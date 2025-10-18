const express = require("express");
const router = express.Router();
const { apiAuthMiddleware } = require("../middlewares/apiAuthMiddleware");

const testController = require("../controllers/testController");
const gameGreedyApiController = require("../controllers/games/greedy/gameGreedyApiController");

// Betting endpoints
router.post("/add-to-bet", apiAuthMiddleware, gameGreedyApiController.addToBet);
router.post("/bet-pizza", apiAuthMiddleware, gameGreedyApiController.addBetToPizza);
router.post("/bet-salad", apiAuthMiddleware, gameGreedyApiController.addBetToSalad);

// Test endpoint
router.get("/test", apiAuthMiddleware, testController.onTest);

module.exports = router;