const { io } = require("../config/server");
const greedy = io.of("/greedy");
const { redisClient } = require("../config/redis");
const greedyGameService = require("../services/game/greedyGameService");

// Game constants
const COUNTDOWN_TIME = 15;
const OPTIONS_COUNT = 8;
const CALCULATION_TIME = 5;

// Game states
const GAME_STATES = {
  WAITING: "waiting",
  COUNTDOWN: "countdown",
  CALCULATING: "calculating",
  FINISHED: "finished",
};

class GreedyGame {
  constructor() {
    this.service = greedyGameService;
    this.currentRound = 0;
    this.countdown = COUNTDOWN_TIME;
    this.gameState = GAME_STATES.WAITING;
    this.winningOption = 0;
    this.countdownInterval = null;
    this.calculationTimeout = null;
    this.isInitialized = false;
    this.waitForRedisAndStart();
  }

  async waitForRedisAndStart() {
    console.log("⏳ Waiting for Redis connection...");

    // Wait for Redis to be ready
    while (!redisClient.isReady) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("✅ Redis is ready, initializing Greedy Game...");

    await this.initializeRedis(); // 1
    this.setupSocketHandlers(); // 2
    this.startGame(); // 3
    this.isInitialized = true;
  }

  //🚀 1 Initialize Redis
  async initializeRedis() {
    try {
      await this.service.checkRedisConnection();
      console.log("✅ Using existing Redis connection for Greedy Game");
      // Initialize game data in Redis using service
      await this.service.initializeRedisState(
        this.currentRound,
        this.countdown,
        this.gameState,
        this.winningOption
      );
    } catch (error) {
      console.error("❌ Redis initialization error:", error);
    }
  }

  //🚀 2 Set up socket handlers
  setupSocketHandlers() {
    greedy.on("connection", (socket) => {
      console.log(`🎮 Player connected to Greedy Game: ${socket.id}`);

      // Send current game state to new player
      this.sendGameState(socket);

      // Handle player disconnect
      socket.on("disconnect", () => {
        console.log(`👋 Player disconnected from Greedy Game: ${socket.id}`);
      });
    });
  }

  //🚀 3 Start Greedy Game
  async startGame() {
    console.log("🎮 Starting Greedy Game...");
    await this.startNewRound();
  }

  async startNewRound() {
    try {
      await this.service.checkRedisConnection();

      // Get the last round from database using service
      const lastRound = await this.service.getLastRound();

      // Calculate next round number
      const nextRoundNumber = lastRound ? lastRound.round + 1 : 1;

      // Create new round in database using service
      const newRound = await this.service.createNewRound(nextRoundNumber);

      this.currentRound = newRound.round;
      this.countdown = COUNTDOWN_TIME;
      this.gameState = GAME_STATES.COUNTDOWN;
      this.winningOption = 0;

      // Update Redis data for new round using service
      await this.service.updateRedisRound(this.currentRound);
      await this.service.updateRedisCountdown(this.countdown);
      await this.service.updateRedisGameState(this.gameState);
      await this.service.updateRedisWinningOption("null");

      console.log(`🔄 Starting Round ${this.currentRound}`);

      // Broadcast new round
      greedy.emit("round_started", {
        round: this.currentRound,
        countdown: this.countdown,
        gameState: this.gameState,
      });

      this.startCountdown();
    } catch (error) {
      console.error("❌ Error starting new round:", error);
      // Retry after 2 seconds if there's an error
      setTimeout(() => {
        if (!this.isInitialized) {
          console.log("🔄 Retrying to start new round...");
          this.startNewRound();
        }
      }, 2000);
    }
  }

  startCountdown() {
    console.log(`⏰ Starting countdown for Round ${this.currentRound}`);

    this.countdownInterval = setInterval(async () => {
      this.countdown--;

      console.log(
        `⏱️ Countdown: ${this.countdown}s - Round ${this.currentRound}`
      );

      // Update Redis using service
      await this.service.updateRedisCountdown(this.countdown);

      // Broadcast countdown to all players
      greedy.emit(
        "game",
        JSON.stringify({
          round: this.currentRound,
          countdown: this.countdown,
          winningOption: this.winningOption,
        })
      );

      // Check if countdown reached calculation time
      if (this.countdown === CALCULATION_TIME) {
        this.stopCountdown();
        this.startCalculation();
      }

      // Check if countdown finished
      if (this.countdown <= 0) {
        this.stopCountdown();
        this.finishRound();
      }
    }, 1000);
  }

  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
      console.log(`⏹️ Countdown stopped for Round ${this.currentRound}`);
    }
  }

  // Calculation for win or loss
  async startCalculation() {
    try {
      this.gameState = GAME_STATES.CALCULATING;
      await this.service.updateRedisGameState(this.gameState);

      // Perform calculation using service
      const calculationResult = await this.service.performRoundCalculation(
        this.currentRound
      );

      // Set the winning option for the round
      this.winningOption = calculationResult.winNumber;

      // Broadcast calculation phase
      greedy.emit("calculation_started", {
        round: this.currentRound,
        gameState: this.gameState,
      });

      // Simulate calculation time (2 seconds)
      this.calculationTimeout = setTimeout(async () => {
        await this.generateWinningOption();
        await this.resumeCountdown();
      }, 2000);
    } catch (error) {
      console.error("❌ Error starting calculation:", error);
    }
  }

  async generateWinningOption() {
    try {
      // Update the round with winning option using service
      await this.service.updateRoundWinningOption(
        this.currentRound,
        this.winningOption
      );

      console.log(
        `🎯 Round ${this.currentRound} - Winning Option: ${this.winningOption}`
      );

      // Store in Redis using service
      await this.service.updateRedisWinningOption(this.winningOption);

      // Broadcast winning option
      greedy.emit("winning_option_generated", {
        round: this.currentRound,
        winningOption: this.winningOption,
      });
    } catch (error) {
      console.error("❌ Error generating winning option:", error);
    }
  }

  async resumeCountdown() {
    console.log(`▶️ Resuming countdown for Round ${this.currentRound}`);
    this.gameState = GAME_STATES.COUNTDOWN;
    await this.service.updateRedisGameState(this.gameState);

    this.startCountdown();
  }

  async finishRound() {
    try {
      this.gameState = GAME_STATES.FINISHED;
      await this.service.updateRedisGameState(this.gameState);

      console.log(`🏁 Round ${this.currentRound} finished`);

      // Calculate results and pay winners using service
      const results = await this.calculateResults();

      // Mark all bets as completed using service
      await this.service.markRoundBetsCompleted(this.currentRound);

      // Broadcast round results
      greedy.emit("round_finished", {
        round: this.currentRound,
        winningOption: this.winningOption,
        results: results,
        gameState: this.gameState,
      });

      console.log(`📊 Round ${this.currentRound} Results:`, results);

      // Wait 3 seconds before starting next round
      setTimeout(() => {
        this.startNewRound();
      }, 3000);
    } catch (error) {
      console.error("❌ Error finishing round:", error);
    }
  }

  async calculateResults() {
    try {
      // Get all bets for current round using service
      const roundBets = await this.service.getRoundBetsWithUsers(
        this.currentRound
      );

      // Calculate results using service
      const results = this.service.calculateRoundResults(roundBets);

      // Process winner payments using service
      await this.service.processWinnerPayments(results.winningBetsList);

      // Return results without the winningBetsList
      return {
        totalBets: results.totalBets,
        winningBets: results.winningBets,
        totalBetAmount: results.totalBetAmount,
        winningBetAmount: results.winningBetAmount,
        winRate: results.winRate,
      };
    } catch (error) {
      console.error("❌ Error calculating results:", error);
      return {
        totalBets: 0,
        winningBets: 0,
        totalBetAmount: 0,
        winningBetAmount: 0,
        winRate: 0,
      };
    }
  }

  async sendGameState(socket) {
    try {
      const gameState = {
        currentRound: this.currentRound,
        countdown: this.countdown,
        gameState: this.gameState,
        winningOption: this.winningOption,
        optionsCount: OPTIONS_COUNT,
      };

      socket.emit("game_state", gameState);
      console.log(`📤 Sent game state to player ${socket.id}`);
    } catch (error) {
      console.error("❌ Error sending game state:", error);
    }
  }

  // Utility method to get game statistics
  async getGameStats() {
    try {
      const stats = await this.service.getGameStatistics();
      
      if (stats) {
        // Add current round to the stats
        return {
          currentRound: this.currentRound,
          ...stats,
        };
      }
      
      return null;
    } catch (error) {
      console.error("❌ Error getting game stats:", error);
      return null;
    }
  }
}

// Initialize the game
const greedyGame = new GreedyGame();

// Export for external access
module.exports = { greedyGame, greedy };
