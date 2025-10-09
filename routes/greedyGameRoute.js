const express = require("express");
const router = express.Router();
const { apiAuthMiddleware } = require("../middlewares/apiAuthMiddleware");

const testController = require("../controllers/testController");
const gameGreedyApiController = require("../controllers/games/greedy/gameGreedyApiController");

// Betting endpoints
router.post("/add-to-bet", apiAuthMiddleware, gameGreedyApiController.addToBet);
router.post("/bet-pizza", apiAuthMiddleware, gameGreedyApiController.addBetToPizza);

// Game state endpoints
router.get("/game-state", gameGreedyApiController.getGameState);
router.get("/stats", gameGreedyApiController.getGameStats);

// History endpoints
router.get("/my-bets", apiAuthMiddleware, gameGreedyApiController.getMyBets);
router.get("/round-history", gameGreedyApiController.getRoundHistory);

// Test endpoint
router.get("/test", apiAuthMiddleware, testController.onTest);

module.exports = router;