const { hostSocket } = require("../socket/hostSocket");
const QueryService = require("../services/videoLive/QueryService");
const EmitService = require("../services/videoLive/EmitService");

const { PrismaClient } = require("./../generated/prisma");
const prisma = new PrismaClient();

exports.sendGift = async (req, res) => {
  // Check if req.body exists
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({
      status: "error",
      message: "Request body is required and must be a valid JSON object",
    });
  }

  const { giftId, channel, receiverId } = req.body;

  // Input validation
  if (!giftId || !channel || !receiverId) {
    return res.status(422).json({
      status: "error",
      message:
        "Gift validation failed. giftId, channel, and receiverId are required",
    });
  }

  try {
    // Use a single transaction for all database operations
    const result = await prisma.$transaction(async (tx) => {
      // Fetch sender, receiver, and gift data in parallel within transaction
      const [user, receiver, gift] = await Promise.all([
        tx.users.findUnique({
          where: { id: req.user.id },
          select: {
            id: true,
            diamond: true,
            name: true,
            is_host: true,
            lock_diamond: true,
          },
        }),
        tx.users.findUnique({
          where: { id: parseInt(receiverId) },
          select: { id: true, name: true, status: true },
        }),
        tx.gifts.findUnique({
          where: { id: parseInt(giftId) },
          select: {
            id: true,
            diamond: true,
            img: true,
            music: true,
            commission: true,
          },
        }),
      ]);

      // Validate all required data exists
      if (!user) {
        throw new Error("User not found");
      }
      if (!receiver) {
        throw new Error("Receiver not found");
      }
      if (!gift) {
        throw new Error("Gift not found");
      }

      // Check if sender has sufficient diamonds
      if (user.is_host || user.lock_diamond) {
        if (user.is_host) {
          return res.status(422).json({
            status: "error",
            message:
              "Host cant't send diamond ",
          });
        }
        if (user.lock_diamond) {
          return res.status(422).json({
            status: "error",
            message:
              "Your diamond lock",
          });
        }
      }

      // Check if sender has sufficient diamonds
      if (user.diamond < gift.diamond) {
        throw new Error("Insufficient diamonds");
      }

      // Update sender and receiver diamonds, and create transaction record
      const [updatedSender, updatedReceiver, host, giftTransaction] =
        await Promise.all([
          tx.users.update({
            where: { id: req.user.id },
            data: { diamond: { decrement: gift.diamond } },
            select: { id: true, name: true, diamond: true },
          }),
          tx.users.update({
            where: { id: parseInt(receiverId) },
            data: { diamond: { increment: gift.diamond - gift.commission } },
            select: { id: true, name: true, diamond: true },
          }),
          tx.video_lives.update({
            where: { user_id: parseInt(channel), is_host: true },
            data: {
              gift_diamond: {
                increment:
                  parseInt(receiverId) == parseInt(channel) ? gift.diamond : 0,
              },
            },
            // select: { id: true },
          }),
          tx.gift_transactions.create({
            data: {
              sender_id: req.user.id,
              receiver_id: parseInt(receiverId),
              diamond: gift.diamond,
              commission: gift.commission,
              created_at: new Date(),
              updated_at: new Date(),
            },
          }),
        ]);

      return {
        user: updatedSender,
        receiver: updatedReceiver,
        gift,
        host,
        giftTransaction,
      };
    });

    console.log("result.host", result.host);

    const payload = {
      img: result.gift.img,
      music: result.gift.music,
      gift_diamond: result.host.gift_diamond,
      title: `${result.user.name} sent  ${result.gift.diamond} gift to ${result.receiver.name}`,
    };

    await EmitService.giftSend(channel, payload);

    res.json({
      status: "ok",
      message: "Gift sent successfully",
    });
  } catch (error) {
    console.error("Error sending gift:", error);

    // Handle specific error types
    if (error.message === "User not found") {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    if (error.message === "Receiver not found") {
      return res.status(404).json({
        status: "error",
        message: "Receiver not found",
      });
    }
    if (error.message === "Gift not found") {
      return res.status(404).json({
        status: "error",
        message: "Gift not found",
      });
    }
    if (error.message === "Insufficient diamonds") {
      return res.status(400).json({
        status: "error",
        message: "Insufficient diamonds",
      });
    }

    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.broadcastAudienceList = async (req, res) => {
  const { channel } = req.params;
  const channelName = String(req.params.channel);

  const broadcastAudienceList = await QueryService.getBroadcastAudienceList(
    channelName
  );
  res.json(broadcastAudienceList);
};
