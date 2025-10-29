const { hostSocket, EmitService, AudienceEmitService } = require("../socket/hostSocket");
const QueryService = require("../services/videoLive/QueryService");

const { PrismaClient } = require("./../generated/prisma");
const { user } = require("pg/lib/defaults");
const prisma = new PrismaClient();

exports.audienceCreate = async (req, res) => {
  const { channel } = req.params;
  try {
    const agora = await prisma.agoras.findFirst({});
    // Use Promise.all to execute queries in parallel
    const [videlLive, userData] = await Promise.all([
      prisma.video_lives.upsert({
        where: { user_id: req.user.id },
        update: {
          user_id: req.user.id,
          app_id: agora.app_id,
          channel: channel,
          is_host: false,
          is_audience: true,
          request: false,
          join: false,
          camera: true,
          microphone: true,
          speaker: true,
          gift_diamond: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
        create: {
          user_id: req.user.id,
          app_id: agora.app_id,
          channel: channel,
          is_host: false,
          is_audience: true,
          request: false,
          join: false,
          camera: true,
          microphone: true,
          speaker: true,
          gift_diamond: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      }),
      prisma.users.findUnique({
        where: { id: req.user.id },
        select: {
          id: true,
          photo_url: true,
          transaction: true,
          is_vvip: true,
          is_royal: true,
          avatar_frame: true,
        },
      }),
    ]);

    await AudienceEmitService.audienceCreated(channel, userData);
    res.json({
      message: "Request Sent",
      videlLive: videlLive,
      user: userData,
    });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.sendJoinRequest = async (req, res) => {
  const { channel } = req.params;
  try {
    // Fetch current user's video live record
    const live = await prisma.video_lives.findUnique({
      where: { user_id: req.user.id },
    });

    if (!live) {
      return res
        .status(404)
        .json({ status: "error", message: "Live record not found" });
    }

    // Check if request is already true
    if (live.request) {
      return res
        .status(422)
        .json({ status: "info", message: "Request already sent" });
    }

    // Update request to true
    const update = await prisma.video_lives.update({
      where: { user_id: req.user.id },
      data: { request: true },
    });

    // Emit pending count
    await EmitService.sendPendingCount(channel);

    res.json({ status: "success", message: "Request Sent", data: update });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.getHost = async (req, res) => {
  const { id } = req.params;
  try {
    const host = await prisma.video_lives.findUnique({
      where: { user_id: id, is_host: true },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            transaction: true,
          },
        }, // this pulls the related profile
      },
    });

    res.json({ message: "Request Sent", data: host });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.cameraOn = async (req, res) => {
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: false,
      },
      data: {
        camera: true,
      },
      select: {
        id: true,
        channel: true,
        is_host: true,
        camera: true,
        microphone: true,
        speaker: true,
        gift_diamond: true,
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            transaction: true,
            is_vvip: true,
            is_royal: true,
            avatar_frame: true,
          },
        },
      },
    });
    await EmitService.broadcastUpdated(req.user.id.toString(), record);
    res.json({ status: "ok", data: record });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found" });
    }
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.cameraOff = async (req, res) => {
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: false,
      },
      data: {
        camera: false,
      },
      select: {
        id: true,
        channel: true,
        is_host: true,
        camera: true,
        microphone: true,
        speaker: true,
        gift_diamond: true,
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            transaction: true,
            is_vvip: true,
            is_royal: true,
            avatar_frame: true,
          },
        },
      },
    });
    await EmitService.broadcastUpdated(req.user.id.toString(), record);
    res.json({ status: "ok", data: record });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found" });
    }
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.microphoneOn = async (req, res) => {
  console.log('microphone on');
  
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: false,
      },
      data: {
        microphone: true,
      },
      select: {
        id: true,
        channel: true,
        is_host: true,
        camera: true,
        microphone: true,
        speaker: true,
        gift_diamond: true,
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            transaction: true,
            is_vvip: true,
            is_royal: true,
            avatar_frame: true,
          },
        },
      },
    });
    await EmitService.broadcastUpdated(req.user.id.toString(), record);
    res.json({ status: "ok", data: record });
  } catch (error) {
    console.log(error);
    
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found" });
    }
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.microphoneOff = async (req, res) => {
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: false,
      },
      data: {
        microphone: false,
      },
      select: {
        id: true,
        channel: true,
        is_host: true,
        camera: true,
        microphone: true,
        speaker: true,
        gift_diamond: true,
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            transaction: true,
            is_vvip: true,
            is_royal: true,
            avatar_frame: true,
          },
        },
      },
    });
    await EmitService.broadcastUpdated(req.user.id.toString(), record);
    res.json({ status: "ok", data: record });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found" });
    }
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.speakerOn = async (req, res) => {
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: false,
      },
      data: {
        speaker: true,
      },
      select: {
        id: true,
        channel: true,
        is_host: true,
        camera: true,
        microphone: true,
        speaker: true,
        gift_diamond: true,
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            transaction: true,
            is_vvip: true,
            is_royal: true,
            avatar_frame: true,
          },
        },
      },
    });
    res.json({ status: "ok", data: record });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found" });
    }
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.speakerOff = async (req, res) => {
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: false,
      },
      data: {
        speaker: false,
      },
      select: {
        id: true,
        channel: true,
        is_host: true,
        camera: true,
        microphone: true,
        speaker: true,
        gift_diamond: true,
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            transaction: true,
            is_vvip: true,
            is_royal: true,
            avatar_frame: true,
          },
        },
      },
    });
    res.json({ status: "ok", data: record });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found" });
    }
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.leaveFromJoined = async (req, res) => {
  try {
    const checkJoin = await prisma.video_lives.findUnique({
      where: {
        user_id: req.user.id,
        is_host: false,
        join: true,
      },
    });

    if (!checkJoin) {
      return res
        .status(422)
        .json({ status: "error", message: "You are not joined" });
    }

    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: false,
      },
      data: {
        microphone: false,
        speaker: false,
        camera: false,
        request: false,
        join: false,
      },
      select: {
        id: true,
        channel: true,
        is_host: true,
        camera: true,
        microphone: true,
        speaker: true,
        gift_diamond: true,
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            transaction: true,
            is_vvip: true,
            is_royal: true,
            avatar_frame: true,
          },
        },
      },
    });
    console.log("i remove from joined", record);

    if (record) {
      await EmitService.broadcastRemoved(record.channel, record);
    }

    res.json({ status: "ok", message: "Leave from joined" });
  } catch (error) {
    if (error.code === "P2025") {
      return res
        .status(404)
        .json({ status: "error", message: "Record not found" });
    }
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const deletedRecord = await prisma.video_lives.delete({
      where: { user_id: req.user.id },
      select: {
        id: true,
        channel: true,
        is_host: true,
        camera: true,
        microphone: true,
        speaker: true,
        join: true,
        gift_diamond: true,
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
            transaction: true,
            is_vvip: true,
            is_royal: true,
            avatar_frame: true,
          },
        },
      },
    });

    console.log("delete record");

    if (deletedRecord) {
      await AudienceEmitService.audienceDeleted(
        deletedRecord.channel,
        deletedRecord.users
      );
      if (deletedRecord.join) {
        await EmitService.broadcastRemoved(
          deletedRecord.channel,
          deletedRecord
        );
      }

      console.log(deletedRecord);
    }

    return res.json({
      message: "Record deleted successfully",
      user: deletedRecord.users,
    });
  } catch (err) {
    // Handle Prisma error when record not found
    // console.log(err);

    if (err.code === "P2025") {
      return res.status(404).json({ message: "Record not found" });
    }

    return res
      .status(500)
      .json({ message: "Internal server error", error: err.message });
  }
};
