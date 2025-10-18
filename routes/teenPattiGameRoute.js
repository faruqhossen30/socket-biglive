const express = require("express");
const router = express.Router();
const Controller = require("./../controllers/games/gameTeenPatti/GameTeenPatti.controller");
const { apiAuthMiddleware } = require("../middlewares/apiAuthMiddleware");

/**
 * Teen Patti Game API Routes
 */


// router.post("/add-to-bet", apiAuthMiddleware, gameGreedyApiController.addToBet);
// Get current game state
router.get("/cards", Controller.getGameState);
// Place a bet
router.post("/bet", apiAuthMiddleware,Controller.placeBet);
router.get("/calculation", apiAuthMiddleware,Controller.testCalculation);


module.exports = router;
