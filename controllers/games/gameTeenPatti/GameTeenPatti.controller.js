const { PrismaClient } = require("./../../../generated/prisma");
const {
  teenPattiGame,
  teenPattiSocket,
} = require("../../../games/teenPattiGame");
const teenPattiGameService = require("../../../services/game/teenPattiGameService");

const { redisClient } = require("../../../config/redis");
const { generateGameHands } = require("../../../utils/teenPattiCards");
const {timestamp} = require("../../../utils/timestampSetting");

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

      // Perform atomic bet using transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get user inside transaction
        const user = await tx.users.findUnique({ where: { id: req.user.id } });
        if (!user) {
          throw new Error("User not found");
        }

        // Check if user has enough diamonds
        if (user.diamond < diamond) {
          throw new Error("Not enough diamonds");
        }

        // Get current round
        const lastRound = await tx.teen_patti_rounds.findFirst({
          orderBy: { id: "desc" },
        });
        if (!lastRound) {
          throw new Error("No active round found");
        }

        // Enforce two-option limit across options 1–3 for this user and round
        // if ([1, 2, 3].includes(option_id)) {
        //   const existingBets = await tx.teen_pattis.findMany({
        //     where: {
        //       user_id: req.user.id,
        //       round: lastRound.round,
        //       option_id: { in: [1, 2, 3] },
        //     },
        //     select: { option_id: true },
        //   });
        //   const distinctOptions = new Set(existingBets.map((b) => b.option_id));
        //   distinctOptions.add(option_id);
        //   if (distinctOptions.size > 2) {
        //     const chosen = Array.from(distinctOptions).sort((a, b) => a - b);
        //     throw new Error(
        //       `You can only choose two options.`
        //     );
        //   }
        // }

        // Deduct diamonds
        const updatedUser = await tx.users.update({
          where: { id: req.user.id },
          data: {
            diamond: { decrement: Number(diamond) },
            updated_at: timestamp(),
          },
          select: { diamond: true },
        });

        // Create the bet
        const bet = await tx.teen_pattis.create({
          data: {
            user_id: req.user.id,
            round: lastRound.round,
            option_id,
            diamond,
            return_diamond,
            status: "pending",
            completed: false,
            created_at: timestamp(),
            updated_at: timestamp(),
          },
        });

        return { bet, updatedUser };
      });

      const payload = {
        user_id: req.user.id,
        option_id,
        bet_diamond: diamond,
        diamond: result.updatedUser.diamond,
      };

      // Broadcast bet to all connected clients via socket
      teenPattiSocket.emit("bet_placed", payload);

      return res.status(201).json({
        success: true,
        message: "Bet placed successfully",
        payload,
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
