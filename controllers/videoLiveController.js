const { hostSocket, EmitService } = require("../socket/hostSocket");
const QueryService = require("../services/videoLive/QueryService");

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
    // First, fetch sender, receiver, and gift data to validate before transaction
    const [user, receiver, gift] = await Promise.all([
      prisma.users.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          diamond: true,
          name: true,
          is_host: true,
          lock_diamond: true,
        },
      }),
      prisma.users.findUnique({
        where: { id: parseInt(receiverId) },
        select: {
          id: true,
          name: true,
          status: true,
          hosts_hosts_user_idTousers: {
            select: {
              agent_id: true,
            },
          },
        },
      }),
      prisma.gifts.findUnique({
        where: { id: parseInt(giftId) },
        select: {
          id: true,
          diamond: true,
          img: true,
          type: true,
          music: true,
          commission: true,
          agent_commission: true,
          company_commission: true,
        },
      }),
    ]);

    // Validate all required data exists
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    if (!receiver) {
      return res.status(404).json({
        status: "error",
        message: "Receiver not found",
      });
    }
    if (!gift) {
      return res.status(404).json({
        status: "error",
        message: "Gift not found",
      });
    }

    // Check if sender is host
    if (user.is_host) {
      return res.status(422).json({
        status: "error",
        message: "Host can't send diamond",
      });
    }

    // Check if sender has locked diamonds
    if (user.lock_diamond) {
      return res.status(422).json({
        status: "error",
        message: "Your diamond lock",
      });
    }

    // Check if sender has sufficient diamonds
    if (user.diamond < gift.diamond) {
      return res.status(400).json({
        status: "error",
        message: "Insufficient diamonds",
      });
    }

    // Use a single transaction for all database operations
    const result = await prisma.$transaction(async (tx) => {
      const agentId = receiver.hosts_hosts_user_idTousers?.agent_id;

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
            data: {
              diamond: {
                increment: agentId
                  ? gift.diamond -
                    (gift.agent_commission + gift.company_commission)
                  : gift.diamond - gift.company_commission,
              },
            },
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
          }),
          tx.gift_transactions.create({
            data: {
              sender_id: req.user.id,
              receiver_id: parseInt(receiverId),
              diamond: gift.diamond,
              commission: gift.commission,
              agent_commission: agentId ? gift.agent_commission : 0,
              company_commission: gift.company_commission,
              created_at: new Date(),
              updated_at: new Date(),
            },
          }),
        ]);

      // If receiver has an agent, update agent's diamonds
      if (agentId) {
        await tx.users.update({
          where: { id: agentId },
          data: { diamond: { increment: gift.agent_commission } },
        });
      }

      return {
        user: updatedSender,
        receiver: updatedReceiver,
        gift,
        host,
        giftTransaction,
      };
    });

    const payload = {
      img: result.gift.img,
      type: result.gift.type,
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

    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

exports.sendGiftAll = async (req, res) => {
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
    // First, fetch sender and gift data
    const [user, gift] = await Promise.all([
      prisma.users.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          diamond: true,
          name: true,
          is_host: true,
          lock_diamond: true,
          is_vvip: true,
          is_royal: true,
        },
      }),
      prisma.gifts.findUnique({
        where: { id: parseInt(giftId) },
        select: {
          id: true,
          diamond: true,
          img: true,
          type: true,
          music: true,
          commission: true,
          agent_commission: true,
          company_commission: true,
        },
      }),
    ]);

    // Validate data exists
    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found",
      });
    }
    if (!gift) {
      return res.status(404).json({
        status: "error",
        message: "Gift not found",
      });
    }

    // Check sender constraints
    if (user.is_host) {
      return res.status(422).json({
        status: "error",
        message: "Host can't send diamond",
      });
    }
    if (user.lock_diamond) {
      return res.status(422).json({
        status: "error",
        message: "Your diamond lock",
      });
    }

    // Use a transaction for atomic updates to all receivers
    const result = await prisma.$transaction(async (tx) => {
      // Find all broadcasters in the channel (host + joined users)
      const liveReceivers = await tx.video_lives.findMany({
        where: {
          channel: receiverId.toString(),
          OR: [{ is_host: true }, { join: true }],
        },
        select: {
          user_id: true,
          is_host: true,
          users: {
            select: {
              name: true,
              hosts_hosts_user_idTousers: {
                select: { agent_id: true },
              },
            },
          },
        },
      });

      if (liveReceivers.length === 0) {
        throw new Error("No receivers found in this channel");
      }

      const totalCost = gift.diamond * liveReceivers.length;

      // Re-check sender's diamonds within transaction
      const sender = await tx.users.findUnique({
        where: { id: req.user.id },
        select: { diamond: true },
      });

      if (sender.diamond < totalCost) {
        throw new Error("Insufficient diamonds");
      }

      const receiverIds = liveReceivers.map((r) => r.user_id);

      // 1. Update sender's diamonds
      const updatedSender = await tx.users.update({
        where: { id: req.user.id },
        data: { diamond: { decrement: totalCost } },
        select: {
          id: true,
          name: true,
          diamond: true,
          is_vvip: true,
          is_royal: true,
        },
      });

      // 2. Update each receiver's diamonds in users table
      for (const receiverRecord of liveReceivers) {
        const agentId =
          receiverRecord.users.hosts_hosts_user_idTousers?.agent_id;
        await tx.users.update({
          where: { id: receiverRecord.user_id },
          data: {
            diamond: {
              increment: agentId
                ? gift.diamond -
                  (gift.agent_commission + gift.company_commission)
                : gift.diamond - gift.company_commission,
            },
          },
        });
      }

      // 3. Update each receiver's gift_diamond in video_lives table
      await tx.video_lives.updateMany({
        where: {
          channel: receiverId.toString(),
          OR: [{ is_host: true }, { join: true }],
        },
        data: { gift_diamond: { increment: gift.diamond } },
      });

      // 4. Create gift transaction records for all receivers
      await tx.gift_transactions.createMany({
        data: liveReceivers.map((r) => ({
          sender_id: req.user.id,
          receiver_id: r.user_id,
          diamond: gift.diamond,
          commission: gift.commission,
          agent_commission: r.users.hosts_hosts_user_idTousers?.agent_id
            ? gift.agent_commission
            : 0,
          company_commission: gift.company_commission,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });

      // 5. Update agent's diamonds for each receiver if they have one
      for (const receiverRecord of liveReceivers) {
        const agentId =
          receiverRecord.users.hosts_hosts_user_idTousers?.agent_id;
        if (agentId) {
          await tx.users.update({
            where: { id: agentId },
            data: { diamond: { increment: gift.agent_commission } },
          });
        }
      }

      // 6. Fetch host record for payload
      const hostRecord = await tx.video_lives.findFirst({
        where: { channel: receiverId.toString(), is_host: true },
        select: { gift_diamond: true },
      });

      return {
        user: updatedSender,
        gift,
        host: hostRecord,
        receiversCount: liveReceivers.length,
        liveReceivers,
      };
    });

    const payload = {
      img: result.gift.img,
      type: result.gift.type,
      music: result.gift.music,
      gift_diamond: result.host ? result.host.gift_diamond : 0,
      title: `${result.user.name} sent ${result.gift.diamond} gift to all ${result.receiversCount} broadcasters`,
    };

    await EmitService.giftSend(channel, payload);

    // Broadcast the chat message for each receiver
    result.liveReceivers.forEach((receiver) => {
      const chatPayLoad = {
        id: result.user.id,
        name: result.user.name,
        transaction: gift.diamond,
        vvip: result.user.is_vvip,
        royal: result.user.is_royal,
        text: `${result.user.name} sent ${result.gift.diamond} gift to ${receiver.users.name}`,
        count: result.receiversCount,
      };

      hostSocket.to(channel).emit("chat", chatPayLoad);
    });

    res.json({
      status: "ok",
      message: "Gifts sent to all broadcasters successfully",
    });
  } catch (error) {
    console.error("Error sending gift to all:", error);

    // Check if error is from our manual throws
    if (error.message === "No receivers found in this channel") {
      return res.status(404).json({ status: "error", message: error.message });
    }
    if (error.message === "Insufficient diamonds") {
      return res.status(400).json({ status: "error", message: error.message });
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

  const broadcastAudienceList =
    await QueryService.getBroadcastAudienceList(channelName);
  res.json(broadcastAudienceList);
};
