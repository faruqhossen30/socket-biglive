const QueryService = require("./QueryService");

class AudienceEmitService {
  constructor(hostSocket) {
    this.hostSocket = hostSocket;
  }

  audienceCreated = async (channel, payload) => {
    const channelName = String(channel);   
    this.hostSocket.to(channelName).emit("audienceCreated", payload);
  };

  audienceDeleted = async (channel, payload) => {
    console.log('audienceDeleted emit');
    const channelName = String(channel);    
    this.hostSocket.to(channelName).emit("audienceDeleted", payload);
  };
}

module.exports = AudienceEmitService;
