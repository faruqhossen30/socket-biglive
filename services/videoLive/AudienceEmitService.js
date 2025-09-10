const { hostSocket } = require("../../socket/hostSocket");
const QueryService = require("./QueryService");

class AudienceEmitService {
  audienceCreated = async (channel, payload) => {
    const channelName = String(channel);   
    hostSocket.to(channelName).emit("audienceCreated", payload);
  };

  audienceDeleted = async (channel, payload) => {
    console.log('audienceDeleted emit');
    const channelName = String(channel);    
    hostSocket.to(channelName).emit("audienceDeleted", payload);
  };
}

module.exports = new AudienceEmitService();
