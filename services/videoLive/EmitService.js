const QueryService = require("./QueryService");

class EmitService {
  constructor(hostSocket) {
    this.hostSocket = hostSocket;
  }

  /**
   * Emit the pending request count to a specific channel
   */
  sendPendingCount = async (channel) => {
    const channelName = String(channel);
    const pendingCount = await QueryService.getPendingCount(channelName);
    this.hostSocket.to(channelName).emit("pendingCount", Number(pendingCount));
  };

  giftSend = async (channel, payload) => {
    console.log("giftSend emit", payload);
    const channelName = String(channel);
    this.hostSocket.to(channelName).emit("giftSend", payload);
  };

  /**
   * Emit the full audience list to a specific channel
   */
  sendBroadcastAudienceList = async (channel) => {
    const payload = await QueryService.getBroadcastAudienceList(channel);
    console.log(channel);
    console.log(payload);

    this.hostSocket.to(channel).emit("broadcastAudienceList", payload);
  };

  /**
   * Broadcast joined
   * Host accept joine
   */
  broadcastJoined = async (channel, payload) => {
    this.hostSocket.to(String(channel)).emit("broadcastJoined", payload);
  };

  /**
   * Broadcast update
   * Host update document, camera, microphone, speaker
   */
  broadcastUpdated = async (channel, payload) => {
    this.hostSocket.to(String(channel)).emit("broadcastUpdated", payload);
  };

  /**
   * Broadcast remove
   * Host remove joined user
   */
  broadcastRemoved = async (channel, payload) => {
    this.hostSocket.to(String(channel)).emit("broadcastRemoved", payload);
  };

  kickFromLive = async (channel, payload) => {
    console.log("kickFromLive emit", payload);
    const channelName = String(channel);
    this.hostSocket.to(channelName).emit("kickFromLive", payload);
  };

  /**
   * Broadcast close
   * Host remove joined user
   */
  liveClosed = async (channel) => {
    console.log('this is channgle ', channel);    
    this.hostSocket.to(channel).emit("liveClosed", true);
  };

  sendHostBrardcast = async (channel) => {
    const host = await QueryService.getHost(channel);
    const pendingCount = await QueryService.getPendingCount(channel);
    this.hostSocket.to(channel).emit("pendingCount", Number(pendingCount));
  };

  sendHostDiamondCount = async (channel) => {
    const pendingCount = await QueryService.getPendingCount(channel);
    this.hostSocket.to(channel).emit("pendingCount", Number(pendingCount));
  };
}

module.exports = EmitService;
