const express = require("express");
const router = express.Router();
const { apiAuthMiddleware } = require("../middlewares/apiAuthMiddleware");
const { hostSocket } = require("../socket/hostSocket");
const pool = require("../config/db");

// prettier-ignore
const videoLiveAudienceController = require("../controllers/vidoeLiveAudienceController");
const videoLiveHostController = require("../controllers/videoLiveHostController");
const videoLiveController = require("../controllers/videoLiveController");

// Video Live
router.post("/send-gift",apiAuthMiddleware,videoLiveController.sendGift);
router.get('/:channel/broadcast-audience-list', apiAuthMiddleware, videoLiveController.broadcastAudienceList)

// Audience
router.get("/audience/:channel/create",apiAuthMiddleware,videoLiveAudienceController.audienceCreate);
router.get("/:channel/send-join-request",apiAuthMiddleware,videoLiveAudienceController.sendJoinRequest);
router.get("/:id/host",apiAuthMiddleware,videoLiveAudienceController.getHost);
router.get("/audience/speaker-on",apiAuthMiddleware,videoLiveAudienceController.speakerOn);
router.get("/audience/speaker-off",apiAuthMiddleware,videoLiveAudienceController.speakerOff);
router.get("/audience/microphone-on",apiAuthMiddleware,videoLiveAudienceController.microphoneOn);
router.get("/audience/microphone-off",apiAuthMiddleware,videoLiveAudienceController.microphoneOff);
router.get("/audience/camera-on",apiAuthMiddleware,videoLiveAudienceController.cameraOn);
router.get("/audience/camera-off",apiAuthMiddleware,videoLiveAudienceController.cameraOff);
router.delete("/audience/delete",apiAuthMiddleware,videoLiveAudienceController.delete);

// Host
router.get("/host/:id/join-accept",apiAuthMiddleware,videoLiveHostController.acceptJoinRequest); // :id - user_id
router.get("/host/:id/join-reject",apiAuthMiddleware,videoLiveHostController.rejectJoinRequest);
router.get("/host/:id/remove-from-joined",apiAuthMiddleware,videoLiveHostController.removeFromJoined);
// host camera, microphone, speaker
router.get("/host/camera-on",apiAuthMiddleware,videoLiveHostController.cameraOn);
router.get("/host/camera-off",apiAuthMiddleware,videoLiveHostController.cameraOff);
router.get("/host/microphone-on",apiAuthMiddleware,videoLiveHostController.microphoneOn);
router.get("/host/microphone-off",apiAuthMiddleware,videoLiveHostController.microphoneOff);
router.get("/host/speaker-on",apiAuthMiddleware,videoLiveHostController.speakerOn);
router.get("/host/speaker-off",apiAuthMiddleware,videoLiveHostController.speakerOff);
router.delete("/host/delete",apiAuthMiddleware,videoLiveHostController.hostDelete);


module.exports = router;
