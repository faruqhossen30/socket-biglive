const { hostSocket } = require("../../socket/hostSocket");
const QueryService = require("./QueryService");

class EmitService {
  /**
   * Emit the pending request count to a specific channel
   */
  sendPendingCount = async (channel) => {
    const channelName = String(channel);
    const pendingCount = await QueryService.getPendingCount(channelName);
    hostSocket.to(channelName).emit("pendingCount", Number(pendingCount));
  };

  giftSend = async (channel, payload) => {
    console.log("giftSend emit", payload);
    const channelName = String(channel);
    hostSocket.to(channelName).emit("giftSend", payload);
  };

  /**
   * Emit the full audience list to a specific channel
   */
  sendBroadcastAudienceList = async (channel) => {
    const payload = await QueryService.getBroadcastAudienceList(channel);
    console.log(channel);
    console.log(payload);

    hostSocket.to(channel).emit("broadcastAudienceList", payload);
  };

  /**
   * Broadcast joined
   * Host accept joine
   */
  broadcastJoined = async (channel, payload) => {
    hostSocket.to(String(channel)).emit("broadcastJoined", payload);
  };

  /**
   * Broadcast update
   * Host update document, camera, microphone, speaker
   */
  broadcastUpdated = async (channel, payload) => {
    hostSocket.to(String(channel)).emit("broadcastUpdated", payload);
  };

    /**
   * Broadcast remove
   * Host remove joined user
   */
  broadcastRemoved = async (channel, payload) => {
    hostSocket.to(String(channel)).emit("broadcastRemoved", payload);
  };



  sendHostBrardcast = async (channel) => {
    const host = await QueryService.getHost(channel);
    const pendingCount = await QueryService.getPendingCount(channel);
    hostSocket.to(channel).emit("pendingCount", Number(pendingCount));
  };

  sendHostDiamondCount = async (channel) => {
    const pendingCount = await QueryService.getPendingCount(channel);
    hostSocket.to(channel).emit("pendingCount", Number(pendingCount));
  };
}

module.exports = new EmitService();
