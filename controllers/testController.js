const { PrismaClient } = require("./../generated/prisma");
const { redisClient } = require("../config/redis");
const prisma = new PrismaClient();

// startCalculation
exports.onTest = async (req, res) => {
  try {
    const lastRound = await prisma.greedy_rounds.findFirst({
      orderBy: { id: "desc" },
    });

    const [singleRoundBet, singleRoundBetSum, totalBetSum] = await Promise.all([
      prisma.greedies.findMany({
        where: {
          round: lastRound.round,
        },
      }),

      prisma.greedies.aggregate({
        where: {
          round: lastRound.round,
        },
        _sum: {
          diamond: true,
          return_diamond: true,
        },
      }),
      await prisma.greedies.groupBy({
        by: ["status"],
        _sum: { diamond: true },
        where: {
          status: { in: ["win", "loss"] },
        },
      }),
    ]);
    
    const summary = {
      win: 0,
      loss: 0,
    };

    for (const row of totalBetSum) {
      summary[row.status] = row._sum.diamond ?? 0;
    }

    return res.json({ singleRoundBet, singleRoundBetSum, summary });

    const [totalWinDiamond, totalLossDiamond] = await Promise.all([
      prisma.greedies.aggregate({
        where: { status: "win" },
        _sum: { diamond: true },
      }),
      prisma.greedies.aggregate({
        where: { status: "loss" },
        _sum: { diamond: true },
      }),
    ]);

    return res.json({ totalWinDiamond, totalLossDiamond });
    // return  res.json(singleRoundBet);
    const resultData = await prisma.greedies.aggregate({
      _sum: {
        diamond: true,
      },
    });

    return res.json(result2);

    // Calculate total bet amounts for current round
    const currentRoundDiamond = singleRoundBet._sum.diamond ?? 0;
    const allDiamond = allBets._sum.diamond ?? 0;

    // Get all historical bets to calculate profit and cost

    return res.send(allBets);

    // Profit: all bets where status=3 (loss) - we keep these amounts
    const profit = allBets
      .filter((bet) => bet.status === 3)
      .reduce((sum, bet) => sum + bet.amount, 0);

    // Cost: all bets where status=2 (win) - we pay these return amounts
    const cost = allBets
      .filter((bet) => bet.status === 2)
      .reduce((sum, bet) => sum + bet.returnAmount, 0);

    const netProfit = profit - cost - profit * 0.3; // 30% deduction

    console.log(
      `💰 Historical - Profit (status=3): ${profit}, Cost (status=2): ${cost}, Net Profit: ${netProfit}`
    );
    console.log(`💰 Current Round - Total Bet Amount: ${totalBetAmount}`);

    // Calculate potential return amounts for each option in current round
    const optionReturnAmounts = {};
    singleRoudBet.forEach((bet) => {
      if (!optionReturnAmounts[bet.optionId]) {
        optionReturnAmounts[bet.optionId] = 0;
      }
      optionReturnAmounts[bet.optionId] += bet.returnAmount;
    });

    console.log(`📊 Current Round Option Return Amounts:`, optionReturnAmounts);

    let winNumber;

    // Check if we can afford to pay any winning option
    const maxReturnAmount = Math.max(...Object.values(optionReturnAmounts), 0);
    const isAnyReturnAmountPayable = netProfit >= maxReturnAmount;

    if (isAnyReturnAmountPayable) {
      // If net profit can cover the highest return amount, select random winning number
      winNumber = Math.floor(Math.random() * 8) + 1;
      console.log(
        `✅ Net profit (${netProfit}) can cover max return amount (${maxReturnAmount}). Selecting random win number: ${winNumber}`
      );
    } else {
      // If net profit cannot cover any return amount, select option that wasn't bet on
      const betOptions = singleRoudBet.map((bet) => bet.optionId);
      const allOptions = [1, 2, 3, 4, 5, 6, 7, 8];
      const unbettedOptions = allOptions.filter(
        (option) => !betOptions.includes(option)
      );

      if (unbettedOptions.length > 0) {
        // Select random from unbetted options
        winNumber =
          unbettedOptions[Math.floor(Math.random() * unbettedOptions.length)];
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
        console.log(
          `⚠️ All options bet on. Selecting randomly from minimum return amount options: ${minReturnOptions}, selected: ${winNumber}`
        );
      }
    }

    // Get the return amount for the selected winning option
    const selectedOptionReturnAmount = optionReturnAmounts[winNumber] || 0;
    console.log(
      `🎯 Selected winning option ${winNumber} with return amount: ${selectedOptionReturnAmount}`
    );

    // Update status for each bet based on winNumber using updateMany
    const updateResult = await Greedy.updateMany({ round: this.currentRound }, [
      {
        $set: {
          status: {
            $cond: {
              if: { $eq: ["$optionId", winNumber] },
              then: 2, // WIN
              else: 3, // LOSS
            },
          },
        },
      },
    ]);

    // Set the winning option for the round
    this.winningOption = winNumber;

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
};
