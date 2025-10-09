const { PrismaClient } = require("./../../generated/prisma");
const { GameStatusEnum } = require("../../enums/gameStatusEnum");
const { redisClient } = require("../../config/redis");

const prisma = new PrismaClient();

// Game constants
const REDIS_KEYS = {
  CURRENT_ROUND: "greedy:current_round",
  COUNTDOWN: "greedy:countdown",
  GAME_STATE: "greedy:game_state",
  WINNING_OPTION: "greedy:winning_option",
};

const OPTIONS_COUNT = 8;

/**
 * GreedyGameService - Handles all data operations and business logic for Greedy Game
 * Follows OOP principles with clear separation of concerns
 */
class GreedyGameService {
  constructor() {
    this.prisma = prisma;
    this.redisClient = redisClient;
  }

  /**
   * Redis Operations
   */

  async checkRedisConnection() {
    if (!this.redisClient.isReady) {
      throw new Error("Redis client is not ready");
    }
  }

  async initializeRedisState(currentRound, countdown, gameState, winningOption) {
    try {
      await this.checkRedisConnection();
      await this.redisClient.set(REDIS_KEYS.CURRENT_ROUND, currentRound);
      await this.redisClient.set(REDIS_KEYS.COUNTDOWN, countdown);
      await this.redisClient.set(REDIS_KEYS.GAME_STATE, gameState);
      await this.redisClient.set(REDIS_KEYS.WINNING_OPTION, winningOption || 0);
      console.log("✅ Redis state initialized");
    } catch (error) {
      console.error("❌ Redis initialization error:", error);
      throw error;
    }
  }

  async updateRedisCountdown(countdown) {
    await this.redisClient.set(REDIS_KEYS.COUNTDOWN, countdown);
  }

  async updateRedisGameState(gameState) {
    await this.redisClient.set(REDIS_KEYS.GAME_STATE, gameState);
  }

  async updateRedisWinningOption(winningOption) {
    await this.redisClient.set(REDIS_KEYS.WINNING_OPTION, winningOption);
  }

  async updateRedisRound(round) {
    await this.redisClient.set(REDIS_KEYS.CURRENT_ROUND, round);
  }

  /**
   * Round Management
   */

  async getLastRound() {
    try {
      const lastRound = await this.prisma.greedy_rounds.findFirst({
        orderBy: { id: "desc" },
      });
      return lastRound;
    } catch (error) {
      console.error("❌ Error getting last round:", error);
      throw error;
    }
  }

  async createNewRound(roundNumber) {
    try {
      const newRound = await this.prisma.greedy_rounds.create({
        data: {
          round: roundNumber,
          win_option_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      console.log(`✅ Created new round: ${roundNumber}`);
      return newRound;
    } catch (error) {
      console.error("❌ Error creating new round:", error);
      throw error;
    }
  }

  async updateRoundWinningOption(round, winningOption) {
    try {
      await this.prisma.greedy_rounds.updateMany({
        where: {
          round: round,
        },
        data: {
          win_option_id: winningOption,
          updated_at: new Date(),
        },
      });
      console.log(`✅ Updated round ${round} with winning option: ${winningOption}`);
    } catch (error) {
      console.error("❌ Error updating round winning option:", error);
      throw error;
    }
  }

  /**
   * Bet Operations
   */

  async getRoundBets(round) {
    try {
      const bets = await this.prisma.greedies.findMany({
        where: {
          round: round,
        },
      });
      return bets;
    } catch (error) {
      console.error("❌ Error getting round bets:", error);
      throw error;
    }
  }

  async getRoundBetsWithUsers(round) {
    try {
      const bets = await this.prisma.greedies.findMany({
        where: {
          round: round,
        },
        include: {
          users: true,
        },
      });
      return bets;
    } catch (error) {
      console.error("❌ Error getting round bets with users:", error);
      throw error;
    }
  }

  async getAllCompletedBets() {
    try {
      const bets = await this.prisma.greedies.findMany({
        where: {
          completed: true,
        },
      });
      return bets;
    } catch (error) {
      console.error("❌ Error getting all completed bets:", error);
      throw error;
    }
  }

  async updateBetStatus(round, optionId, status) {
    try {
      const whereClause = {
        round: round,
      };

      if (status === GameStatusEnum.WIN) {
        whereClause.option_id = optionId;
      } else {
        whereClause.option_id = { not: optionId };
      }

      await this.prisma.greedies.updateMany({
        where: whereClause,
        data: {
          status: status,
          updated_at: new Date(),
        },
      });
      console.log(`✅ Updated bets for round ${round} with status: ${status}`);
    } catch (error) {
      console.error("❌ Error updating bet status:", error);
      throw error;
    }
  }

  async markRoundBetsCompleted(round) {
    try {
      await this.prisma.greedies.updateMany({
        where: {
          round: round,
        },
        data: {
          completed: true,
          updated_at: new Date(),
        },
      });
      console.log(`✅ Marked all bets as completed for round ${round}`);
    } catch (error) {
      console.error("❌ Error marking bets as completed:", error);
      throw error;
    }
  }

  /**
   * Financial Calculations
   */

  calculateTotalBetAmount(bets) {
    return bets.reduce((sum, bet) => sum + bet.diamond, 0);
  }

  calculateOptionReturnAmounts(bets) {
    const optionReturnAmounts = {};
    bets.forEach((bet) => {
      if (!optionReturnAmounts[bet.option_id]) {
        optionReturnAmounts[bet.option_id] = 0;
      }
      optionReturnAmounts[bet.option_id] += bet.return_diamond;
    });
    return optionReturnAmounts;
  }

  calculateHistoricalProfitAndCost(allBets) {
    // Profit: all bets where status="loss" - we keep these amounts
    const profit = allBets
      .filter((bet) => bet.status === GameStatusEnum.LOSS)
      .reduce((sum, bet) => sum + bet.diamond, 0);

    // Cost: all bets where status="win" - we pay these return amounts
    const cost = allBets
      .filter((bet) => bet.status === GameStatusEnum.WIN)
      .reduce((sum, bet) => sum + bet.return_diamond, 0);

    const netProfit = profit - cost - profit * 0.3; // 30% deduction

    return { profit, cost, netProfit };
  }

  /**
   * Winning Option Determination Logic
   */

  determineWinningOption(optionReturnAmounts, netProfit, currentRoundBets) {
    const maxReturnAmount = Math.max(...Object.values(optionReturnAmounts), 0);
    const isAnyReturnAmountPayable = netProfit >= maxReturnAmount;

    let winNumber;
    let strategy;

    if (isAnyReturnAmountPayable) {
      // If net profit can cover the highest return amount, select random winning number
      winNumber = Math.floor(Math.random() * OPTIONS_COUNT) + 1;
      strategy = "random";
      console.log(
        `✅ Net profit (${netProfit}) can cover max return amount (${maxReturnAmount}). Selecting random win number: ${winNumber}`
      );
    } else {
      // If net profit cannot cover any return amount, select option that wasn't bet on
      const betOptions = currentRoundBets.map((bet) => bet.option_id);
      const allOptions = Array.from({ length: OPTIONS_COUNT }, (_, i) => i + 1);
      const unbettedOptions = allOptions.filter(
        (option) => !betOptions.includes(option)
      );

      if (unbettedOptions.length > 0) {
        // Select random from unbetted options
        winNumber =
          unbettedOptions[Math.floor(Math.random() * unbettedOptions.length)];
        strategy = "unbetted";
        console.log(
          `❌ Net profit (${netProfit}) cannot cover any return amount. Selecting unbetted option: ${winNumber}`
        );
      } else {
        // If all options are bet on, select randomly from options with minimum return amount
        const minReturnAmount = Math.min(...Object.values(optionReturnAmounts));
        const minReturnOptions = Object.entries(optionReturnAmounts)
          .filter(([, amount]) => amount === minReturnAmount)
          .map(([option]) => parseInt(option));

        winNumber =
          minReturnOptions[Math.floor(Math.random() * minReturnOptions.length)];
        strategy = "minimum_return";
        console.log(
          `⚠️ All options bet on. Selecting randomly from minimum return amount options: ${minReturnOptions}, selected: ${winNumber}`
        );
      }
    }

    const selectedOptionReturnAmount = optionReturnAmounts[winNumber] || 0;

    return {
      winNumber,
      strategy,
      selectedOptionReturnAmount,
    };
  }

  /**
   * Winner Payment Processing
   */

  async processWinnerPayments(winningBets) {
    try {
      if (winningBets.length === 0) {
        console.log("⚠️ No winning bets to process");
        return;
      }

      // Group winning bets by user to get total return amount per user
      const userWinnings = {};
      winningBets.forEach((bet) => {
        const userId = bet.user_id.toString();
        if (!userWinnings[userId]) {
          userWinnings[userId] = 0;
        }
        userWinnings[userId] += bet.return_diamond;
      });

      // Update each winning user's diamond balance
      for (const [userId, totalWinnings] of Object.entries(userWinnings)) {
        await this.prisma.users.update({
          where: { id: BigInt(userId) },
          data: {
            diamond: {
              increment: totalWinnings,
            },
            updated_at: new Date(),
          },
        });
        console.log(`💰 User ${userId} won ${totalWinnings} diamonds total`);
      }

      console.log(`✅ Processed payments for ${winningBets.length} winning bets`);
    } catch (error) {
      console.error("❌ Error processing winner payments:", error);
      throw error;
    }
  }

  /**
   * Results Calculation
   */

  calculateRoundResults(roundBets) {
    const winningBets = roundBets.filter(
      (bet) => bet.status === GameStatusEnum.WIN
    );

    const totalBets = roundBets.length;
    const winningBetsCount = winningBets.length;
    const totalBetAmount = roundBets.reduce((sum, bet) => sum + bet.diamond, 0);
    const winningBetAmount = winningBets.reduce(
      (sum, bet) => sum + bet.return_diamond,
      0
    );

    const winRate = totalBets > 0 ? (winningBetsCount / totalBets) * 100 : 0;

    return {
      totalBets,
      winningBets: winningBetsCount,
      totalBetAmount,
      winningBetAmount,
      winRate: Math.round(winRate * 100) / 100,
      winningBetsList: winningBets,
    };
  }

  /**
   * Statistics
   */

  async getGameStatistics() {
    try {
      const totalRounds = await this.prisma.greedy_rounds.count();

      const allBets = await this.getAllCompletedBets();

      const winningBets = allBets.filter(
        (bet) => bet.status === GameStatusEnum.WIN
      );

      const averageWinRate =
        allBets.length > 0 ? (winningBets.length / allBets.length) * 100 : 0;

      // Calculate most winning option
      const optionWins = {};
      winningBets.forEach((bet) => {
        optionWins[bet.option_id] = (optionWins[bet.option_id] || 0) + 1;
      });

      const mostWinningOption = Object.entries(optionWins).reduce(
        (max, [option, count]) => {
          return count > max.count ? { option: parseInt(option), count } : max;
        },
        { option: null, count: 0 }
      );

      return {
        totalRounds,
        averageWinRate: Math.round(averageWinRate * 100) / 100,
        mostWinningOption: mostWinningOption.option,
        totalBets: allBets.length,
        totalWinningBets: winningBets.length,
      };
    } catch (error) {
      console.error("❌ Error getting game statistics:", error);
      return null;
    }
  }

  /**
   * Complete Calculation Flow
   * This orchestrates the entire calculation process
   */

  async performRoundCalculation(currentRound) {
    try {
      console.log(`🧮 Starting calculation for Round ${currentRound}`);

      // Get all bets for current round
      const currentRoundBets = await this.getRoundBets(currentRound);

      // Calculate total bet amounts for current round
      const totalBetAmount = this.calculateTotalBetAmount(currentRoundBets);

      // Get all historical bets to calculate profit and cost
      const allBets = await this.getAllCompletedBets();

      // Calculate historical profit and cost
      const { profit, cost, netProfit } =
        this.calculateHistoricalProfitAndCost(allBets);

      console.log(
        `💰 Historical - Profit (loss): ${profit}, Cost (win): ${cost}, Net Profit: ${netProfit}`
      );
      console.log(`💰 Current Round - Total Bet Amount: ${totalBetAmount}`);

      // Calculate potential return amounts for each option in current round
      const optionReturnAmounts =
        this.calculateOptionReturnAmounts(currentRoundBets);

      console.log(
        `📊 Current Round Option Return Amounts:`,
        optionReturnAmounts
      );

      // Determine winning option
      const { winNumber, strategy, selectedOptionReturnAmount } =
        this.determineWinningOption(
          optionReturnAmounts,
          netProfit,
          currentRoundBets
        );

      console.log(
        `🎯 Selected winning option ${winNumber} (strategy: ${strategy}) with return amount: ${selectedOptionReturnAmount}`
      );

      // Update winning bets
      await this.updateBetStatus(currentRound, winNumber, GameStatusEnum.WIN);

      // Update losing bets
      await this.updateBetStatus(currentRound, winNumber, GameStatusEnum.LOSS);

      return {
        winNumber,
        strategy,
        totalBetAmount,
        selectedOptionReturnAmount,
        netProfit,
      };
    } catch (error) {
      console.error("❌ Error performing round calculation:", error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new GreedyGameService();

