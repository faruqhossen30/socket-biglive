const { hostSocket } = require("../socket/hostSocket");
const QueryService = require("../services/videoLive/QueryService");
const EmitService = require("../services/videoLive/EmitService");

const { PrismaClient } = require("./../generated/prisma");
const prisma = new PrismaClient();

exports.acceptJoinRequest = async (req, res) => {
  const { id } = req.params;
  try {
    const record = await prisma.video_lives.update({
      where: {
        channel: req.user.id.toString(),
        user_id: parseInt(id),
        request: true,
      },
      data: {
        request: false,
        join: true,
      },
      select: {
        id: true,
        channel: true,
        is_host: true,
        join: true,
        camera: true,
        microphone: true,
        speaker: true,
        gift_diamond: true,
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
          },
        },
      },
    });
    console.log("record", record);
    await EmitService.broadcastJoined(req.user.id.toString(), record);
    await EmitService.sendPendingCount(req.user.id.toString());
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

exports.rejectJoinRequest = async (req, res) => {
  const { id } = req.params;
  try {
    console.log("this is reject", id);

    const result = await prisma.video_lives.updateMany({
      where: {
        user_id: parseInt(id),
        channel: req.user.id.toString(),
      },
      data: {
        request: false,
        join: false,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: "Record not found" });
    }

    await EmitService.sendPendingCount(req.user.id.toString());
    res.json({ status: "ok", data: { updated: result.count } });
  } catch (error) {
    res.status(400).json({ status: "error", message: error.message });
  }
};

exports.removeFromJoined = async (req, res) => {
  const { id } = req.params;
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: parseInt(id),
        channel: req.user.id.toString(),
      },
      data: {
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
          },
        },
      },
    });

    await EmitService.broadcastRemoved(req.user.id.toString(), record);
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

exports.cameraOn = async (req, res) => {
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: true,
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
        is_host: true,
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
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: true,
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

exports.microphoneOff = async (req, res) => {
  try {
    const record = await prisma.video_lives.update({
      where: {
        user_id: req.user.id,
        is_host: true,
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
        is_host: true,
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
        is_host: true,
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
