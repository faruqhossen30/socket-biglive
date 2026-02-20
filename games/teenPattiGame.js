const { io } = require("../config/server");
const teenPattiSocket = io.of("/teen-patti");
const { redisClient } = require("../config/redis");
const teenPattiGameService = require("../services/game/teenPattiGameService");
const { generateGameHands } = require("../utils/teenPattiCards");

// Game constants
const COUNTDOWN_TIME = 25;
const OPTIONS_COUNT = 3; // Teen Patti has 3 betting options
const CALCULATION_TIME = 5;

// Game states
const GAME_STATES = {
  WAITING: "waiting",
  COUNTDOWN: "countdown",
  CALCULATING: "calculating",
  FINISHED: "finished",
};

class TeenPattiGame {
  constructor() {
    this.service = teenPattiGameService;
    this.currentRound = 0;
    this.countdown = COUNTDOWN_TIME;
    this.gameState = GAME_STATES.WAITING;
    this.winningOption = 0;
    this.gameHands = {}; // Stores the card hands for each option
    this.countdownInterval = null;
    this.calculationTimeout = null;
    this.isInitialized = false;
    this.waitForRedisAndStart();
  }

  async waitForRedisAndStart() {
    console.log("⏳ Waiting for Redis connection (Teen Patti)...");

    // Wait for Redis to be ready
    while (!redisClient.isReady) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("✅ Redis is ready, initializing Teen Patti Game...");

    await this.initializeRedis(); // 1
    this.setupSocketHandlers(); // 2
    this.startGame(); // 3
    this.isInitialized = true;
  }

  //🚀 1 Initialize Redis
  async initializeRedis() {
    try {
      await this.service.checkRedisConnection();
      console.log("✅ Using existing Redis connection for Teen Patti Game");
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
    teenPattiSocket.on("connection", (socket) => {
      console.log(`🎮 Player connected to Teen Patti Game: ${socket.id}`);

      // Handle player disconnect
      socket.on("disconnect", () => {
        console.log(
          `👋 Player disconnected from Teen Patti Game: ${socket.id}`
        );
      });
    });
  }

  //🚀 3 Start Teen Patti Game
  async startGame() {
    console.log("🎮 Starting Teen Patti Game...");
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
      this.gameHands = {}; // Reset hands for new round

      // Update Redis data for new round using service
      await this.service.updateRedisRound(this.currentRound);
      await this.service.updateRedisCountdown(this.countdown);
      await this.service.updateRedisGameState(this.gameState);
      await this.service.updateRedisWinningOption("null");
      await this.service.updateRedisGameHands({});

      console.log(`🔄 Starting Teen Patti Round ${this.currentRound}`);

      // Broadcast new round
      teenPattiSocket.emit("round_started", {
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
    console.log(
      `⏰ Starting countdown for Teen Patti Round ${this.currentRound}`
    );

    this.countdownInterval = setInterval(async () => {
      this.countdown--;

      console.log(
        `⏱️ Countdown: ${this.countdown}s - Teen Patti Round ${this.currentRound}`
      );

      // Update Redis using service
      await this.service.updateRedisCountdown(this.countdown);

      // Broadcast countdown to all players with betting stats
      teenPattiSocket.emit("countdown", { countdown: this.countdown });

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
      console.log(
        `⏹️ Countdown stopped for Teen Patti Round ${this.currentRound}`
      );
    }
  }

  // Calculation for win or loss based on 30% profit
  async startCalculation() {
    try {
      this.gameState = GAME_STATES.CALCULATING;
      await this.service.updateRedisGameState(this.gameState);

      // 1. *** Perform calculation using service to determine winning option
      const calculationResult = await this.service.performRoundCalculation(
        this.currentRound
      );

      // Set the winning option for the round
      this.winningOption = calculationResult.winNumber;

      // Generate card hands where winning option has the best hand
      this.gameHands = generateGameHands(this.winningOption);

      // Store hands in Redis
      await this.service.updateRedisGameHands(this.gameHands);

      console.log(
        `🎴 Generated Teen Patti hands for Round ${this.currentRound}:`
      );

      // Object.entries(this.gameHands).forEach(([option, hand]) => {
      //   const cardDisplays = hand.cards
      //     .map((c) => `${c.display}(${c.image})`)
      //     .join(", ");
      //   // console.log(
      //   //   `   Option ${option}: ${cardDisplays} - ${hand.evaluation.description}`
      //   // );
      // });

      // Simulate calculation time (2 seconds)
      this.calculationTimeout = setTimeout(async () => {
        await this.generateWinningOption();
        await this.resumeCountdown();
      }, 1000);
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
        `🎯 Teen Patti Round ${this.currentRound} - Winning Option: ${this.winningOption}`
      );

      // Store in Redis using service
      await this.service.updateRedisWinningOption(this.winningOption);

      // Broadcast winning option
      teenPattiSocket.emit("winning_option_generated", {
        round: this.currentRound,
        winningOption: this.winningOption,
        gameHands: this.gameHands,
      });
    } catch (error) {
      console.error("❌ Error generating winning option:", error);
    }
  }

  async resumeCountdown() {
    console.log(
      `▶️ Resuming countdown for Teen Patti Round ${this.currentRound}`
    );
    this.gameState = GAME_STATES.COUNTDOWN;
    await this.service.updateRedisGameState(this.gameState);

    this.startCountdown();
  }

  async finishRound() {
    try {
      this.gameState = GAME_STATES.FINISHED;
      await this.service.updateRedisGameState(this.gameState);

      console.log(`🏁 Teen Patti Round ${this.currentRound} finished`);

      // Calculate results and pay winners using service

      const roundBets = await this.service.getRoundBetsWithUsers(
        this.currentRound
      );

      // Calculate results using service
      const results = this.service.calculateRoundResults(roundBets);

      console.log('finishRound results', results);
      

      // Process winner payments using service
      const winners = await this.service.processWinnerPayments(results.winningBetsList);
      


      // Return results without the winningBetsList
      // return {
      //   totalBets: results.totalBets,
      //   winningBets: results.winningBets,
      //   totalBetAmount: results.totalBetAmount,
      //   winningBetAmount: results.winningBetAmount,
      //   winRate: results.winRate,
      // };

      // Mark all bets as completed using service
      await this.service.markRoundBetsCompleted(this.currentRound);

      // Broadcast round results with card hands
      teenPattiSocket.emit("round_finished", {
        round: this.currentRound,
        winningOption: this.winningOption,
        gameHands: this.gameHands,
        winners: winners
      });

      console.log("round finish", {
        round: this.currentRound,
        winningOption: this.winningOption,
        gameHands: this.gameHands,
        gameState: this.gameState,
        winners: winners
      });

      console.log(`📊 Teen Patti Round ${this.currentRound} Results:`);
      const winningHand = this.gameHands[this.winningOption];
      if (winningHand) {
        const cardDisplays = winningHand.cards
          .map((c) => `${c.display}(${c.image})`)
          .join(", ");
        console.log(`🏆 Winning Option ${this.winningOption}`);
      }

      // Wait 3 seconds before starting next round
      setTimeout(() => {
        this.startNewRound();
      }, 6000);
    } catch (error) {
      console.error("❌ Error finishing round:", error);
    }
  }
}

// Initialize the game
const teenPattiGame = new TeenPattiGame();

// Export for external access
module.exports = { teenPattiGame, teenPattiSocket };
