/**
 * Greedy Game Database Initialization Script
 * 
 * This script initializes the greedy_rounds table with the first round
 * Run this once before starting the game for the first time
 */

const { PrismaClient } = require("../generated/prisma");
const prisma = new PrismaClient();

async function initGreedyGame() {
  console.log("🎮 Initializing Greedy Game Database...");

  try {
    // Check if there are any existing rounds
    const existingRounds = await prisma.greedy_rounds.findMany();

    if (existingRounds.length > 0) {
      console.log(`✅ Database already initialized with ${existingRounds.length} rounds`);
      console.log(`📊 Latest round: ${existingRounds[existingRounds.length - 1].round}`);
      return;
    }

    // Create the first round
    const firstRound = await prisma.greedy_rounds.create({
      data: {
        round: 1,
        win_option_id: null,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    console.log("✅ Created first round:", firstRound);
    console.log("🎉 Greedy Game database initialized successfully!");
    console.log("💡 You can now start the game server");

  } catch (error) {
    console.error("❌ Error initializing database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  initGreedyGame()
    .then(() => {
      console.log("✅ Initialization complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Initialization failed:", error);
      process.exit(1);
    });
}

module.exports = { initGreedyGame };

