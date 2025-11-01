const { PrismaClient } = require("./../generated/prisma");
const { redisClient } = require("../config/redis");
const { hostSocket } = require("../socket/hostSocket");
const prisma = new PrismaClient();
const EmitServiceClass = require("../services/videoLive/EmitService");
const EmitService = new EmitServiceClass(hostSocket);

exports.deleteLive = async (req, res) => {
  const { channel } = req.params;
  try {
    const user = await prisma.users.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        photo_url: true,
        transaction: true,
        is_admin: true,
        is_agent: true,
        is_reseller: true,
        is_host: true,
        is_vvip: true,
        is_royal: true,
        avatar_frame: true,
      },
    });
    if(!user.is_admin){
      return res.status(401).json({
        message: "You are not admin",
        user: user,
      })
    }

    console.log(user);
     await EmitService.liveClosed(String(channel));

    return res.json({
      message: "Request Sent",
      user: user,
      channel: channel,
    });
    // hostSocket.emit


  } catch (error) {
    console.log(error);
    
  }
}