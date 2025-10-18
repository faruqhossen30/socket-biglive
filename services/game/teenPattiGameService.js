const { PrismaClient } = require("./../../generated/prisma");
const { GameStatusEnum } = require("../../enums/gameStatusEnum");
const { redisClient } = require("../../config/redis");

const prisma = new PrismaClient();

// Game constants
const REDIS_KEYS = {
  CURRENT_ROUND: "teen_patti:current_round",
  COUNTDOWN: "teen_patti:countdown",
  GAME_STATE: "teen_patti:game_state",
  WINNING_OPTION: "teen_patti:winning_option",
  GAME_HANDS: "teen_patti:game_hands",
};

const OPTIONS_COUNT = 3; // Teen Patti has 3 options

/**
 * TeenPattiGameService - Handles all data operations and business logic for Teen Patti Game
 * Follows OOP principles with clear separation of concerns
 */
class TeenPattiGameService {
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

  async initializeRedisState(
    currentRound,
    countdown,
    gameState,
    winningOption
  ) {
    try {
      await this.checkRedisConnection();
      await this.redisClient.set(REDIS_KEYS.CURRENT_ROUND, currentRound);
      await this.redisClient.set(REDIS_KEYS.COUNTDOWN, countdown);
      await this.redisClient.set(REDIS_KEYS.GAME_STATE, gameState);
      await this.redisClient.set(REDIS_KEYS.WINNING_OPTION, winningOption || 0);
      await this.redisClient.set(REDIS_KEYS.GAME_HANDS, JSON.stringify({}));
      console.log("✅ Teen Patti Redis state initialized");
    } catch (error) {
      console.error("❌ Teen Patti Redis initialization error:", error);
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

  async updateRedisGameHands(hands) {
    await this.redisClient.set(REDIS_KEYS.GAME_HANDS, JSON.stringify(hands));
  }

  async getRedisGameHands() {
    const hands = await this.redisClient.get(REDIS_KEYS.GAME_HANDS);
    return hands ? JSON.parse(hands) : {};
  }

  /**
   * Round Management
   */

  async getLastRound() {
    try {
      const lastRound = await this.prisma.teen_patti_rounds.findFirst({
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
      const newRound = await this.prisma.teen_patti_rounds.create({
        data: {
          round: roundNumber,
          win_option_id: null,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
      console.log(`✅ Created new Teen Patti round: ${roundNumber}`);
      return newRound;
    } catch (error) {
      console.error("❌ Error creating new round:", error);
      throw error;
    }
  }

  async updateRoundWinningOption(round, winningOption) {
    try {
      await this.prisma.teen_patti_rounds.updateMany({
        where: {
          round: round,
        },
        data: {
          win_option_id: winningOption,
          updated_at: new Date(),
        },
      });
      console.log(
        `✅ Updated Teen Patti round ${round} with winning option: ${winningOption}`
      );
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
      const bets = await this.prisma.teen_pattis.findMany({
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
      // Note: teen_pattis table doesn't have user relation in schema
      // We'll just return bets without user info for now
      const bets = await this.prisma.teen_pattis.findMany({
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

      await this.prisma.teen_pattis.updateMany({
        where: whereClause,
        data: {
          status: status,
          updated_at: new Date(),
        },
      });
      console.log(
        `✅ Updated Teen Patti bets for round ${round} with status: ${status}`
      );
    } catch (error) {
      console.error("❌ Error updating bet status:", error);
      throw error;
    }
  }

  async markRoundBetsCompleted(round) {
    try {
      await this.prisma.teen_pattis.updateMany({
        where: {
          round: round,
        },
        data: {
          paid: true,
          updated_at: new Date(),
        },
      });
      console.log(
        `✅ Marked all Teen Patti bets as completed for round ${round}`
      );
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
    const optionReturnAmounts = { 1: 0, 2: 0, 3: 0 };
    bets.forEach((bet) => {
      if (bet.option_id >= 1 && bet.option_id <= 3) {
        optionReturnAmounts[bet.option_id] += bet.return_diamond;
      }
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
   * This is where we control which option wins based on 30% profit calculation
   */

  determineWinningOption(optionReturnAmounts, netProfit, currentRoundBets) {
    let winNumber;
    let strategy;

    // Find all payable options (return amount <= netProfit)
    const payableOptions = [];
    // Find all options with return amount > 0
    const nonZeroOptions = [];
    
    for (let option = 1; option <= OPTIONS_COUNT; option++) {
      const returnAmount = optionReturnAmounts[option] || 0;
      
      if (returnAmount <= netProfit) {
        payableOptions.push(option);
      }
      
      if (returnAmount > 0) {
        nonZeroOptions.push(option);
      }
    }

    console.log(`💰 Net profit: ${netProfit}`);
    console.log(`💸 Option return amounts:`, optionReturnAmounts);
    console.log(`✅ Payable options (return amount <= netProfit):`, payableOptions);
    console.log(`🎯 Non-zero return options:`, nonZeroOptions);

    // Find options that are both non-zero AND payable
    const nonZeroPayableOptions = nonZeroOptions.filter(option => payableOptions.includes(option));
    
    console.log(`🎯 Non-zero AND payable options:`, nonZeroPayableOptions);

    if (payableOptions.length === 0) {
      // If no options are payable, select randomly from all options (fallback)
      winNumber = Math.floor(Math.random() * OPTIONS_COUNT) + 1;
      strategy = "fallback_random";
      console.log(`❌ No payable options found. Using fallback random selection: ${winNumber}`);
    } else if (nonZeroPayableOptions.length === 0 && nonZeroOptions.length === 0) {
      // If all 3 options have return amount = 0 AND are payable, select random from all 3
      winNumber = Math.floor(Math.random() * OPTIONS_COUNT) + 1;
      strategy = "random_all_zero_payable";
      console.log(`🎲 All options have zero return amounts and are payable. Random selection from all 3: ${winNumber}`);
    } else if (nonZeroPayableOptions.length > 0) {
      // If any options have return amount > 0 AND are payable, select only from those options
      winNumber = nonZeroPayableOptions[Math.floor(Math.random() * nonZeroPayableOptions.length)];
      strategy = "random_non_zero_payable";
      console.log(`🎯 Selecting from non-zero return options that are payable: ${nonZeroPayableOptions}, selected: ${winNumber}`);
    } else {
      // If no non-zero options are payable, but some zero options are payable, select from payable zero options
      const zeroPayableOptions = payableOptions.filter(option => (optionReturnAmounts[option] || 0) === 0);
      if (zeroPayableOptions.length > 0) {
        winNumber = zeroPayableOptions[Math.floor(Math.random() * zeroPayableOptions.length)];
        strategy = "random_zero_payable";
        console.log(`🎲 No non-zero payable options. Selecting from zero return options that are payable: ${zeroPayableOptions}, selected: ${winNumber}`);
      } else {
        // Last resort fallback
        winNumber = Math.floor(Math.random() * OPTIONS_COUNT) + 1;
        strategy = "fallback_random";
        console.log(`❌ No payable options found. Using fallback random selection: ${winNumber}`);
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
        console.log("⚠️ No winning Teen Patti bets to process");
        return [];
      }

      console.log(`💰 Processing ${winningBets.length} winning Teen Patti bets`);

      // Group winning bets by user to get total return amount per user
      const userWinnings = {};
      winningBets.forEach((bet) => {
        const userId = bet.user_id.toString();
        if (!userWinnings[userId]) {
          userWinnings[userId] = 0;
        }
        userWinnings[userId] += bet.return_diamond;
      });

      // Update each winning user's diamond balance and prepare return array
      const paymentResults = [];
      for (const [userId, totalWinnings] of Object.entries(userWinnings)) {
        const user = await this.prisma.users.update({
          where: { id: BigInt(userId) },
          data: {
            diamond: {
              increment: totalWinnings,
            },
            updated_at: new Date(),
          },
          select: {
            diamond: true,
          },
        });
        
        console.log(`💎 User ${userId} won ${totalWinnings} diamonds total`);
        
        // Add to return array
        paymentResults.push({
          user_id: parseInt(userId),
          diamond: user.diamond
        });

      }

      console.log(`✅ Processed payments for ${winningBets.length} winning Teen Patti bets`);
      return paymentResults;
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
   * Complete Calculation Flow
   * This orchestrates the entire calculation process
   */

  async performRoundCalculation(currentRound) {
    try {
      console.log(
        `🧮 Starting Teen Patti calculation for Round ${currentRound}`
      );

      // 1.1  Get all bets for current round
      const currentRoundBets = await this.getRoundBets(currentRound);

      // 1.2  Calculate total bet amounts for current round
      const totalBetAmount = this.calculateTotalBetAmount(currentRoundBets);

      // 1.3 Get all historical bets to calculate profit and cost
      const allBets = await prisma.teen_pattis.findMany({
        where: {
          completed: false,
        },
      });

      // 1.4  Calculate historical profit and cost
      const { profit, cost, netProfit } =
        this.calculateHistoricalProfitAndCost(allBets);

      console.log(
        `💰 Historical - Profit (loss): ${profit}, Cost (win): ${cost}, Net Profit: ${netProfit}`
      );
      console.log(`💰 Current Round - Total Bet Amount: ${totalBetAmount}`);

      // 1.5 Calculate potential return amounts for each option in current round
      const optionReturnAmounts =
        this.calculateOptionReturnAmounts(currentRoundBets);

      console.log(
        `📊 Current Round Option Return Amounts:`,
        optionReturnAmounts
      );

      // 1.6 Determine winning option based on 30% profit calculation
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
module.exports = new TeenPattiGameService();
