const { redisClient } = require("../../../config/redis");
const { GameStatusEnum } = require("../../../enums/gameStatusEnum");
const { PrismaClient } = require("../../../generated/prisma");
const prisma = new PrismaClient();
const nowUtc = new Date(new Date().toUTCString());
const {timestamp} = require("../../../utils/timestampSetting");



/**
 * Place a bet on the current greedy game round
 * @route POST /api/greedy/add-to-bet
 * @param req
 * @param res
 */
exports.addToBet = async (req, res) => {
  const { diamond, returnDiamond, optionId } = req.body;
  console.log("📥 Bet request:", req.body);

  try {
    // Validate input
    if (!diamond || !returnDiamond || !optionId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: diamond, returnDiamond, optionId",
      });
    }

    if (optionId < 1 || optionId > 8) {
      return res.status(400).json({
        success: false,
        message: "Option ID must be between 1 and 8",
      });
    }

    if (diamond <= 0) {
      return res.status(400).json({
        success: false,
        message: "Diamond amount must be greater than 0",
      });
    }

    // Check countdown from Redis
    const countdown = await redisClient.get("greedy:countdown");

    if (parseInt(countdown) <= 5) {
      return res.status(400).json({
        success: false,
        message: "Too late to bet.",
        countdown: parseInt(countdown),
      });
    }
    // Perform atomic operation using transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1) Get user (inside tx to keep a consistent view)
      const user = await tx.users.findUnique({ where: { id: req.user.id } });
      if (!user) {
        throw new Error("User not found");
      }

      // 2) Get current round
      const lastRound = await tx.greedy_rounds.findFirst({
        orderBy: { id: "desc" },
      });
      if (!lastRound) {
        throw new Error("No active round found");
      }

      // 3) Enforce max 6 distinct options for this round (among 1–8)
      // const existingBets = await tx.greedies.findMany({
      //   where: {
      //     user_id: req.user.id,
      //     round: lastRound.round,
      //   },
      //   select: { option_id: true },
      // });

      // const distinctOptions = new Set(existingBets.map((b) => b.option_id));
      // distinctOptions.add(Number(optionId));
      // if (distinctOptions.size > 6) {
      //   const chosen = Array.from(distinctOptions).sort((a, b) => a - b);
      //   throw new Error(
      //     `You can only choose max 6 options.`
      //   );
      // }

      // 4) Check diamond balance and deduct
      if (user.diamond < Number(diamond)) {
        throw new Error("Not enough diamonds");
      }

      const updatedUser = await tx.users.update({
        where: { id: req.user.id },
        data: {
          diamond: { decrement: Number(diamond) },
          updated_at: new Date(),
        },
        select: { diamond: true },
      });

      console.log(`updateuser ${updatedUser}`);
      

      // 5) Create bet
      const bet = await tx.greedies.create({
        data: {
          user_id: req.user.id,
          round: lastRound.round,
          option_id: Number(optionId),
          diamond: Number(diamond),
          return_diamond: Number(returnDiamond),
          status: GameStatusEnum.PENDING,
          completed: false,
          created_at: timestamp(),
          updated_at: timestamp(),
        },
      });

      return { bet, updatedUser, lastRound };
    });

    console.log(
      `✅ Bet placed: User ${req.user.id} bet ${diamond} on option ${optionId} for round ${result.lastRound.round}`
    );

    console.log(`result ${result.updatedUser.diamond}`);
    

    // Emit bet event to all connected clients via socket
    const { greedy } = require("../../../games/greedyGame");
    greedy.emit("bet_placed", {
      userId: req.user.id,
      userDiamond: result.updatedUser.diamond,
      options: [
        {
          optionId: Number(optionId),
          diamond: Number(diamond),
        },
      ],
    });

    res.json({
      success: true,
      message: "Bet placed successfully",
      diamond: result.updatedUser.diamond,
      data: {
        id: result.bet.id.toString(),
        round: result.bet.round,
        option_id: result.bet.option_id,
        diamond: result.bet.diamond,
        return_diamond: result.bet.return_diamond,
        status: result.bet.status,
      },
    });
  } catch (err) {
    console.error("❌ Error placing bet:", err);
    res.status(500).json({
      success: false,
      message:
        err.message === "User not found" ||
        err.message === "No active round found" ||
        err.message === "Not enough diamonds" ||
        (err.message || "Failed to place bet" ).startsWith("Bet rejected")
          ? err.message
          : err.message || "Failed to place bet",
    });
  }
};

/**
 * Place a bet on the current greedy game round
 * @route POST /api/greedy/add-to-bet
 * @param {number} diamond - The amount of diamonds to bet
 * @param {number} returnDiamond - The expected return amount (8x multiplier)
 * @param {number} optionId - The option number (1-8) to bet on
 */
exports.addBetToPizza = async (req, res) => {
  const { diamond } = req.body;
  console.log("📥 Bet request:", req.body);

  try {
    // Validate input
    if (!diamond) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: diamond.",
      });
    }

    if (diamond <= 0) {
      return res.status(400).json({
        success: false,
        message: "Diamond amount must be greater than 0",
      });
    }

    // Check countdown from Redis
    const countdown = await redisClient.get("greedy:countdown");

    if (parseInt(countdown) <= 5) {
      return res.status(400).json({
        success: false,
        message: "Too late to bet.",
        countdown: parseInt(countdown),
      });
    }
    // Perform atomic bulk bet using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get user
      const user = await tx.users.findUnique({ where: { id: req.user.id } });
      if (!user) {
        throw new Error("User not found");
      }

      // Ensure balance
      if (user.diamond < Number(diamond) * 4) {
        throw new Error("Not enough diamonds");
      }

      // Get current round
      const lastRound = await tx.greedy_rounds.findFirst({
        orderBy: { id: "desc" },
      });
      if (!lastRound) {
        throw new Error("No active round found");
      }

      // Enforce max 6 distinct options with new bet set [1,2,3,8]
      const newOptions = [1, 2, 3, 8];

      // const existing = await tx.greedies.findMany({
      //   where: { user_id: req.user.id, round: lastRound.round },
      //   select: { option_id: true },
      // });
      // const distinct = new Set(existing.map((b) => b.option_id));
      // newOptions.forEach((o) => distinct.add(o));
      // if (distinct.size > 6) {
      //   const chosen = Array.from(distinct).sort((a, b) => a - b);
      //   throw new Error(
      //    `You can only choose max 6 options.`
      //   );
      // }

      // Deduct diamonds
      const updatedUser = await tx.users.update({
        where: { id: req.user.id },
        data: {
          diamond: { decrement: Number(diamond) * 4 }
        },
        select: { diamond: true },
      });

      // Create bets
      await tx.greedies.createMany({
        data: [
          {
            user_id: req.user.id,
            round: lastRound.round,
            option_id: 1,
            diamond: Number(diamond),
            return_diamond: Number(diamond) * 15,
            status: GameStatusEnum.PENDING,
            completed: false,
            created_at: timestamp(),
            updated_at: timestamp(),
          },
          {
            user_id: req.user.id,
            round: lastRound.round,
            option_id: 2,
            diamond: Number(diamond),
            return_diamond: Number(diamond) * 25,
            status: GameStatusEnum.PENDING,
            completed: false,
            created_at: timestamp(),
            updated_at: timestamp(),
          },
          {
            user_id: req.user.id,
            round: lastRound.round,
            option_id: 3,
            diamond: Number(diamond),
            return_diamond: Number(diamond) * 45,
            status: GameStatusEnum.PENDING,
            completed: false,
            created_at: timestamp(),
            updated_at: timestamp(),
          },
          {
            user_id: req.user.id,
            round: lastRound.round,
            option_id: 8,
            diamond: Number(diamond),
            return_diamond: Number(diamond) * 10,
            status: GameStatusEnum.PENDING,
            completed: false,
            created_at: timestamp(),
            updated_at: timestamp(),
          },
        ],
      });

      return { updatedUser };
    });

    console.log(
      `✅ Greedy Bet placed: User ${req.user.id} bet ${diamond}`
    );

    // Emit bet event to all connected clients via socket
    const { greedy } = require("../../../games/greedyGame");

    greedy.emit("bet_placed", {
      userId: req.user.id,
      userDiamond: result.updatedUser.diamond,
      options: [
        {
          optionId: Number(1),
          diamond: Number(diamond),
        },
        {
          optionId: Number(2),
          diamond: Number(diamond),
        },
        {
          optionId: Number(3),
          diamond: Number(diamond),
        },
        {
          optionId: Number(8),
          diamond: Number(diamond),
        },
      ],
    });

    res.json({
      success: true,
      message: "Bet placed successfully",
      diamond: result.updatedUser.diamond,
    });
  } catch (err) {
    console.error("❌ Error placing bet:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to place bet",
    });
  }
};

/**
 * Place a bet on the current greedy game round
 * @route POST /api/greedy/add-to-bet
 * @param {number} diamond - The amount of diamonds to bet
 * @param {number} returnDiamond - The expected return amount (8x multiplier)
 * @param {number} optionId - The option number (1-8) to bet on
 */
exports.addBetToSalad = async (req, res) => {
  const { diamond } = req.body;
  console.log("📥 Bet request:", req.body);

  try {
    // Validate input
    if (!diamond) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: diamond.",
      });
    }

    if (diamond <= 0) {
      return res.status(400).json({
        success: false,
        message: "Diamond amount must be greater than 0",
      });
    }

    // Check countdown from Redis
    const countdown = await redisClient.get("greedy:countdown");

    if (parseInt(countdown) <= 5) {
      return res.status(400).json({
        success: false,
        message: "Too late to bet.",
        countdown: parseInt(countdown),
      });
    }
    // Perform atomic bulk bet using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get user
      const user = await tx.users.findUnique({ where: { id: req.user.id } });
      if (!user) {
        throw new Error("User not found");
      }

      // Ensure balance
      if (user.diamond < Number(diamond) * 4) {
        throw new Error("Not enough diamonds");
      }

      // Get current round
      const lastRound = await tx.greedy_rounds.findFirst({
        orderBy: { id: "desc" },
      });
      if (!lastRound) {
        throw new Error("No active round found");
      }

      // Enforce max 6 distinct options with new bet set [4,5,6,7]
      const newOptions = [4, 5, 6, 7];

      // const existing = await tx.greedies.findMany({
      //   where: { user_id: req.user.id, round: lastRound.round },
      //   select: { option_id: true },
      // });
      // const distinct = new Set(existing.map((b) => b.option_id));
      // newOptions.forEach((o) => distinct.add(o));
      // if (distinct.size > 6) {
      //   const chosen = Array.from(distinct).sort((a, b) => a - b);
      //   throw new Error(
      //     `You can only choose 6 options.`
      //   );
      // }

      // Deduct diamonds
      const updatedUser = await tx.users.update({
        where: { id: req.user.id },
        data: {
          diamond: { decrement: Number(diamond) * 4 },
          updated_at: new Date(),
        },
        select: { diamond: true },
      });

      // Create bets
      await tx.greedies.createMany({
        data: [
          {
            user_id: req.user.id,
            round: lastRound.round,
            option_id: 4,
            diamond: Number(diamond),
            return_diamond: Number(diamond) * 5,
            status: GameStatusEnum.PENDING,
            completed: false,
            created_at: timestamp(),
            updated_at: timestamp(),
          },
          {
            user_id: req.user.id,
            round: lastRound.round,
            option_id: 5,
            diamond: Number(diamond),
            return_diamond: Number(diamond) * 5,
            status: GameStatusEnum.PENDING,
            completed: false,
            created_at: timestamp(),
            updated_at: timestamp(),
          },
          {
            user_id: req.user.id,
            round: lastRound.round,
            option_id: 6,
            diamond: Number(diamond),
            return_diamond: Number(diamond) * 5,
            status: GameStatusEnum.PENDING,
            completed: false,
            created_at: timestamp(),
            updated_at: timestamp(),
          },
          {
            user_id: req.user.id,
            round: lastRound.round,
            option_id: 7,
            diamond: Number(diamond),
            return_diamond: Number(diamond) * 10,
            status: GameStatusEnum.PENDING,
            completed: false,
            created_at: timestamp(),
            updated_at: timestamp(),
          },
        ],
      });

      return { updatedUser };
    });

    console.log(
      `✅ Greedy Bet placed: User ${req.user.id} bet ${diamond} on option r round`
    );

    // Emit bet event to all connected clients via socket
    const { greedy } = require("../../../games/greedyGame");

    greedy.emit("bet_placed", {
      userId: req.user.id,
      userDiamond: result.updatedUser.diamond,
      options: [
        {
          optionId: Number(1),
          diamond: Number(diamond),
        },
        {
          optionId: Number(2),
          diamond: Number(diamond),
        },
        {
          optionId: Number(3),
          diamond: Number(diamond),
        },
        {
          optionId: Number(8),
          diamond: Number(diamond),
        },
      ],
    });

    res.json({
      success: true,
      message: "Bet placed successfully",
      diamond: result.updatedUser.diamond,
    });
  } catch (err) {
    console.error("❌ Error placing bet:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to place bet",
    });
  }
};

/**
 * Get current game state
 * @route GET /api/greedy/game-state
 */
exports.getGameState = async (req, res) => {
  try {
    const currentRound = await redisClient.get("greedy:current_round");
    const countdown = await redisClient.get("greedy:countdown");
    const gameState = await redisClient.get("greedy:game_state");
    const winningOption = await redisClient.get("greedy:winning_option");

    res.json({
      success: true,
      data: {
        currentRound: parseInt(currentRound) || 0,
        countdown: parseInt(countdown) || 0,
        gameState: gameState || "waiting",
        winningOption:
          winningOption && winningOption !== "null"
            ? parseInt(winningOption)
            : null,
        optionsCount: 8,
      },
    });
  } catch (err) {
    console.error("❌ Error getting game state:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get game state",
    });
  }
};

/**
 * Get user's bet history
 * @route GET /api/greedy/my-bets
 */
exports.getMyBets = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const bets = await prisma.greedies.findMany({
      where: {
        user_id: req.user.id,
      },
      orderBy: {
        created_at: "desc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.greedies.count({
      where: {
        user_id: req.user.id,
      },
    });

    res.json({
      success: true,
      data: bets.map((bet) => ({
        id: bet.id.toString(),
        round: bet.round,
        option_id: bet.option_id,
        diamond: bet.diamond,
        return_diamond: bet.return_diamond,
        status: bet.status,
        completed: bet.completed,
        created_at: bet.created_at,
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (err) {
    console.error("❌ Error getting user bets:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get bets",
    });
  }
};

/**
 * Get round history
 * @route GET /api/greedy/round-history
 */
exports.getRoundHistory = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;

    const rounds = await prisma.greedy_rounds.findMany({
      orderBy: {
        round: "desc",
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    const total = await prisma.greedy_rounds.count();

    res.json({
      success: true,
      data: rounds.map((round) => ({
        id: round.id.toString(),
        round: round.round,
        win_option_id: round.win_option_id,
        created_at: round.created_at,
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (err) {
    console.error("❌ Error getting round history:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get round history",
    });
  }
};

/**
 * Get game statistics
 * @route GET /api/greedy/stats
 */
exports.getGameStats = async (req, res) => {
  try {
    const { greedyGame } = require("../../../games/greedyGame");
    const stats = await greedyGame.getGameStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (err) {
    console.error("❌ Error getting game stats:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to get game stats",
    });
  }
};
