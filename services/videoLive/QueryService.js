const { PrismaClient } = require("./../../generated/prisma");
const prisma = new PrismaClient();

class QueryService {
  getPendingCount = async (channel) => {

    const result = await prisma.video_lives.count({
      where: {
        channel: channel,
        request: true,
      },
    });
    return result;
  };

  getBroadcastAudienceList = async (channel) => {
    const broadcastAudienceList = await prisma.video_lives.findMany({
      where: {
        OR: [
          { channel: channel, is_host: true },
          { channel: channel, join: true },
        ],
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

    return broadcastAudienceList;
  };

  getHost = async (channel) => {
    const result = await prisma.video_lives.findFirst({
      where: {
        channel: channel,
        is_host: true,
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            photo_url: true,
          },
        },
      },
    });

    if (!result) {
      return null;
    }

    console.log("result", result);

    // Transform the result to match the original SQL structure
    return {
      id: Number(result.id),
      is_host: result.is_host,
      channel: result.channel,
      camera: result.camera,
      microphone: result.microphone,
      speaker: result.speaker,
      gift_diamond: result.gift_diamond,
      user: {
        id: result.users.id,
        name: result.users.name,
        photo_url: result.users.photo_url,
      },
    };
  };
}

module.exports = new QueryService();
