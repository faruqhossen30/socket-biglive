const { PrismaClient } = require("./../../../generated/prisma");
const {
  teenPattiGame,
  teenPattiSocket,
} = require("../../../games/teenPattiGame");
const teenPattiGameService = require("../../../services/game/teenPattiGameService");

const { redisClient } = require("../../../config/redis");
const { generateGameHands } = require("../../../utils/teenPattiCards");

const prisma = new PrismaClient();

/**
 * GameTeenPattiController - Handles HTTP requests for Teen Patti Game
 */
class GameTeenPattiController {
  /**
   * Get current game state
   * GET /api/teen-patti/state
   */
  async getGameState(req, res) {
    try {
      const cards = await generateGameHands(1);

      return res.status(200).json(cards);
    } catch (error) {
      console.error("❌ Error in getGameState:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get game state",
        error: error.message,
      });
    }
  }

  async testCalculation(req, res) {
    try {
      const currentRound = await teenPattiGame.currentRound;
      const currentRoundBets = await teenPattiGameService.getRoundBets(
        153
      );

      const totalBetAmount = teenPattiGameService.calculateTotalBetAmount(currentRoundBets);

      return res.status(200).json({ message: "test", data: totalBetAmount });
    } catch (error) {
      console.error("❌ Error in getGameState:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get game state",
        error: error.message,
      });
    }
  }

  /**
   * Place a bet
   * POST /api/teen-patti/bet
   * Body: { option_id, diamond, return_diamond }
   * Note: round is automatically set to current round
   */
  async placeBet(req, res) {
    try {
      // const { option_id, diamond, return_diamond } = req.body;

      const option_id = parseInt(req.body.option_id);
      const diamond = parseInt(req.body.diamond);
      const return_diamond = parseInt(req.body.return_diamond);

      // Validate required fields
      if (!option_id || !diamond || !return_diamond) {
        return res.status(400).json({
          success: false,
          message:
            "Missing required fields: option_id, diamond, return_diamond",
        });
      }

      // Parse values to ensure they're the correct type

      // Automatically get current round from the game

      // Validate option_id
      if (isNaN(option_id) || option_id < 1 || option_id > 3) {
        throw new Error("Invalid option_id. Must be 1, 2, or 3");
      }

      // Validate diamond amounts
      if (isNaN(diamond) || diamond <= 0) {
        throw new Error("Invalid diamond amount");
      }

      if (isNaN(return_diamond) || return_diamond <= 0) {
        throw new Error("Invalid return_diamond amount");
      }

      // Check countdown from Redis
      const countdown = await redisClient.get("teen_patti:countdown");

      if (parseInt(countdown) <= 5) {
        return res.status(400).json({
          success: false,
          message: "Too late to bet.",
          countdown: parseInt(countdown),
        });
      }

      // Get user from database
      const user = await prisma.users.findUnique({
        where: { id: req.user.id },
      });

      // Check if user has enough diamonds
      if (user.diamond < diamond) {
        return res.status(400).json({
          success: false,
          message: "Not enough diamonds",
          userDiamond: user.diamond,
          required: diamond,
        });
      }

      // Deduct diamonds from user
      const userInfo = await prisma.users.update({
        where: { id: req.user.id },
        data: {
          diamond: { decrement: Number(diamond) },
          updated_at: new Date(),
        },
        select: {
          diamond: true,
        },
      });

      // Validate game state - only allow bets during countdown
      const lastRound = await prisma.teen_patti_rounds.findFirst({
        orderBy: { id: "desc" },
      });

      // Create the bet
      const bet = await prisma.teen_pattis.create({
        data: {
          user_id: req.user.id,
          round: lastRound.round,
          option_id,
          diamond,
          return_diamond,
          status: "pending",
          completed: false,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      const payload = {
        user_id: req.user.id,
        option_id,
        diamond: userInfo.diamond,
      };

      teenPattiSocket.emit("bet_placed", payload);
      // Broadcast bet to all connected clients via socket

      return res.status(201).json({
        success: true,
        message: "Bet placed successfully",
        payload: payload,
      });
    } catch (error) {
      console.error("❌ Error in placeBet:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Failed to place bet",
      });
    }
  }
}

module.exports = new GameTeenPattiController();
