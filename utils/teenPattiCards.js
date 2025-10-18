/**
 * Teen Patti Card Utilities
 * Handles card generation, hand ranking, and comparison
 */

// Card suits and ranks
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// Hand types (ordered by strength, highest first)
const HAND_TYPES = {
  TRAIL: 7,           // Three of a kind (e.g., A-A-A)
  PURE_SEQUENCE: 6,   // Straight flush (e.g., A♠-K♠-Q♠)
  SEQUENCE: 5,        // Straight (e.g., A♠-K♥-Q♦)
  COLOR: 4,           // Flush (e.g., K♠-J♠-9♠)
  PAIR: 3,            // Two of a kind (e.g., K-K-5)
  HIGH_CARD: 2        // Highest card wins
};

const HAND_NAMES = {
  7: 'Trail',
  6: 'Pure Sequence',
  5: 'Sequence',
  4: 'Color',
  3: 'Pair',
  2: 'High Card'
};

/**
 * Suit mapping for image files
 */
const SUIT_CODES = {
  '♠': 'S', // Spades
  '♥': 'H', // Hearts
  '♦': 'D', // Diamonds
  '♣': 'C'  // Clubs
};

const SUIT_NAMES = {
  '♠': 'spades',
  '♥': 'hearts',
  '♦': 'diamonds',
  '♣': 'clubs'
};

// Suit numbers for numeric naming (matching your public/cards/ format)
const SUIT_NUMBERS = {
  '♣': 1, // Clubs
  '♦': 2, // Diamonds
  '♥': 3, // Hearts
  '♠': 4  // Spades
};

// Rank numbers for numeric naming (matching your public/cards/ format)
const RANK_NUMBERS = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,  // Jack
  'Q': 12,  // Queen
  'K': 13,  // King
  'A': 14   // Ace
};

/**
 * Create a card object
 */
function createCard(rank, suit) {
  const rankCode = rank === '10' ? 'T' : rank; // Handle 10 specially
  const suitNum = SUIT_NUMBERS[suit];
  const rankNum = RANK_NUMBERS[rank];
  
  return {
    rank,
    suit,
    value: RANK_VALUES[rank],
    display: `${rank}${suit}`,
    code: `${rankCode}${SUIT_CODES[suit]}`,  // e.g., "AS", "KH", "TD"
    suitName: SUIT_NAMES[suit],
    suitCode: SUIT_CODES[suit],
    suitNumber: suitNum,   // 1-4 (1=Clubs, 2=Diamonds, 3=Hearts, 4=Spades)
    rankNumber: rankNum,   // 2-14 (2-10=numbers, 11=J, 12=Q, 13=K, 14=A)
    // Your image format: rank.suit.png (e.g., 14.4.png = Ace of Spades, 2.1.png = 2 of Clubs)
    image: `${rankNum}.${suitNum}.png`
  };
}

/**
 * Generate a full deck of 52 cards
 */
function generateDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Check if cards form a sequence (considering A-K-Q and A-2-3)
 */
function isSequence(cards) {
  const values = cards.map(c => c.value).sort((a, b) => a - b);
  
  // Check regular sequence
  if (values[2] - values[1] === 1 && values[1] - values[0] === 1) {
    return true;
  }
  
  // Check A-2-3 (special case)
  if (values[0] === 2 && values[1] === 3 && values[2] === 14) {
    return true;
  }
  
  // Check A-K-Q (special case) - values would be [12, 13, 14]
  if (values[0] === 12 && values[1] === 13 && values[2] === 14) {
    return true;
  }
  
  return false;
}

/**
 * Check if all cards are of the same suit
 */
function isFlush(cards) {
  return cards.every(card => card.suit === cards[0].suit);
}

/**
 * Count card rank occurrences
 */
function countRanks(cards) {
  const counts = {};
  cards.forEach(card => {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  });
  return counts;
}

/**
 * Evaluate a 3-card hand and return its type and strength
 */
function evaluateHand(cards) {
  if (cards.length !== 3) {
    throw new Error('Hand must contain exactly 3 cards');
  }

  const rankCounts = countRanks(cards);
  const countValues = Object.values(rankCounts);
  const isFlushHand = isFlush(cards);
  const isSequenceHand = isSequence(cards);
  
  const sortedCards = [...cards].sort((a, b) => b.value - a.value);
  const values = sortedCards.map(c => c.value);

  // Trail (Three of a kind)
  if (countValues.includes(3)) {
    const trailRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
    return {
      type: HAND_TYPES.TRAIL,
      typeName: HAND_NAMES[HAND_TYPES.TRAIL],
      strength: [HAND_TYPES.TRAIL, RANK_VALUES[trailRank]],
      cards: sortedCards,
      description: `Trail of ${trailRank}s`
    };
  }

  // Pure Sequence (Straight Flush)
  if (isSequenceHand && isFlushHand) {
    // For A-2-3, consider A as 1 for comparison
    let highCard = values[0];
    if (values[0] === 14 && values[1] === 3 && values[2] === 2) {
      highCard = 3; // A-2-3, highest is 3 for comparison
    }
    
    return {
      type: HAND_TYPES.PURE_SEQUENCE,
      typeName: HAND_NAMES[HAND_TYPES.PURE_SEQUENCE],
      strength: [HAND_TYPES.PURE_SEQUENCE, highCard, values[1], values[2]],
      cards: sortedCards,
      description: `Pure Sequence ${sortedCards.map(c => c.display).join('-')}`
    };
  }

  // Sequence (Straight)
  if (isSequenceHand) {
    let highCard = values[0];
    if (values[0] === 14 && values[1] === 3 && values[2] === 2) {
      highCard = 3; // A-2-3, highest is 3 for comparison
    }
    
    return {
      type: HAND_TYPES.SEQUENCE,
      typeName: HAND_NAMES[HAND_TYPES.SEQUENCE],
      strength: [HAND_TYPES.SEQUENCE, highCard, values[1], values[2]],
      cards: sortedCards,
      description: `Sequence ${sortedCards.map(c => c.rank).join('-')}`
    };
  }

  // Color (Flush)
  if (isFlushHand) {
    return {
      type: HAND_TYPES.COLOR,
      typeName: HAND_NAMES[HAND_TYPES.COLOR],
      strength: [HAND_TYPES.COLOR, ...values],
      cards: sortedCards,
      description: `Color (${sortedCards[0].suit}) ${sortedCards.map(c => c.rank).join('-')}`
    };
  }

  // Pair
  if (countValues.includes(2)) {
    const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
    const kicker = Object.keys(rankCounts).find(rank => rankCounts[rank] === 1);
    
    return {
      type: HAND_TYPES.PAIR,
      typeName: HAND_NAMES[HAND_TYPES.PAIR],
      strength: [HAND_TYPES.PAIR, RANK_VALUES[pairRank], RANK_VALUES[kicker]],
      cards: sortedCards,
      description: `Pair of ${pairRank}s with ${kicker} kicker`
    };
  }

  // High Card
  return {
    type: HAND_TYPES.HIGH_CARD,
    typeName: HAND_NAMES[HAND_TYPES.HIGH_CARD],
    strength: [HAND_TYPES.HIGH_CARD, ...values],
    cards: sortedCards,
    description: `High Card ${sortedCards[0].rank}`
  };
}

/**
 * Compare two hands - returns 1 if hand1 wins, -1 if hand2 wins, 0 if tie
 */
function compareHands(hand1, hand2) {
  const eval1 = evaluateHand(hand1);
  const eval2 = evaluateHand(hand2);

  // Compare strength arrays element by element
  for (let i = 0; i < Math.max(eval1.strength.length, eval2.strength.length); i++) {
    const val1 = eval1.strength[i] || 0;
    const val2 = eval2.strength[i] || 0;
    
    if (val1 > val2) return 1;
    if (val1 < val2) return -1;
  }

  return 0; // Tie
}

/**
 * Generate a specific type of hand
 */
function generateSpecificHand(deck, handType, preferHighCards = true) {
  const availableCards = [...deck];
  
  switch (handType) {
    case HAND_TYPES.TRAIL: {
      // Generate three of a kind
      const targetRanks = preferHighCards ? ['A', 'K', 'Q'] : ['3', '4', '5'];
      for (const rank of targetRanks) {
        const cardsOfRank = availableCards.filter(c => c.rank === rank);
        if (cardsOfRank.length >= 3) {
          return shuffle(cardsOfRank).slice(0, 3);
        }
      }
      break;
    }
    
    case HAND_TYPES.PURE_SEQUENCE: {
      // Generate straight flush
      const sequences = preferHighCards 
        ? [['A', 'K', 'Q'], ['K', 'Q', 'J'], ['Q', 'J', '10']]
        : [['5', '4', '3'], ['4', '3', '2'], ['A', '2', '3']];
      
      for (const suit of SUITS) {
        for (const seq of sequences) {
          const cards = seq.map(rank => 
            availableCards.find(c => c.rank === rank && c.suit === suit)
          ).filter(Boolean);
          
          if (cards.length === 3) {
            return cards;
          }
        }
      }
      break;
    }
    
    case HAND_TYPES.SEQUENCE: {
      // Generate straight (mixed suits)
      const sequences = preferHighCards 
        ? [['A', 'K', 'Q'], ['K', 'Q', 'J'], ['Q', 'J', '10']]
        : [['5', '4', '3'], ['4', '3', '2'], ['A', '2', '3']];
      
      for (const seq of sequences) {
        const cards = [];
        for (const rank of seq) {
          const card = availableCards.find(c => c.rank === rank);
          if (card) {
            cards.push(card);
            // Remove from available to ensure different suits
            availableCards.splice(availableCards.indexOf(card), 1);
          }
        }
        
        if (cards.length === 3 && !isFlush(cards)) {
          return cards;
        }
      }
      break;
    }
    
    case HAND_TYPES.COLOR: {
      // Generate flush (same suit, not in sequence)
      for (const suit of SUITS) {
        const suitCards = availableCards.filter(c => c.suit === suit);
        if (suitCards.length >= 3) {
          const sorted = suitCards.sort((a, b) => b.value - a.value);
          // Try to find non-sequence cards
          for (let i = 0; i < sorted.length - 2; i++) {
            const hand = [sorted[i], sorted[i + 1], sorted[i + 2]];
            if (!isSequence(hand)) {
              return hand;
            }
          }
        }
      }
      break;
    }
    
    case HAND_TYPES.PAIR: {
      // Generate pair
      const targetRanks = preferHighCards ? ['A', 'K', 'Q', 'J'] : ['5', '4', '3', '2'];
      for (const rank of targetRanks) {
        const pairCards = availableCards.filter(c => c.rank === rank);
        if (pairCards.length >= 2) {
          const kicker = availableCards.find(c => c.rank !== rank);
          if (kicker) {
            return [...pairCards.slice(0, 2), kicker];
          }
        }
      }
      break;
    }
    
    case HAND_TYPES.HIGH_CARD:
    default: {
      // Generate high card (no combination)
      const selected = [];
      const targetRanks = preferHighCards ? ['A', 'K', 'J'] : ['7', '5', '2'];
      
      for (const rank of targetRanks) {
        const card = availableCards.find(c => c.rank === rank && !selected.includes(c));
        if (card) selected.push(card);
        if (selected.length === 3) break;
      }
      
      // Make sure it's not a sequence or flush
      if (selected.length === 3 && !isSequence(selected) && !isFlush(selected)) {
        return selected;
      }
      break;
    }
  }
  
  // Fallback: return random cards
  return shuffle(availableCards).slice(0, 3);
}

/**
 * Generate hands for Teen Patti game where winning option gets highest hand
 * @param {number} winningOption - The option (1, 2, or 3) that should win
 * @returns {Object} Object containing hands for each option
 */
function generateGameHands(winningOption) {
  const deck = shuffle(generateDeck());
  
  // Determine hand types for each option
  // Winning option gets the best hand, others get progressively weaker hands
  const handTypes = [
    HAND_TYPES.TRAIL,
    HAND_TYPES.PURE_SEQUENCE,
    HAND_TYPES.SEQUENCE,
    HAND_TYPES.COLOR,
    HAND_TYPES.PAIR,
    HAND_TYPES.HIGH_CARD
  ];
  
  // Randomly select ANY hand type for winner (not just top 3)
  const winnerHandType = handTypes[Math.floor(Math.random() * handTypes.length)];
  
  // Select weaker hand types for losers
  const loserHandTypes = handTypes.filter(t => t < winnerHandType);
  if (loserHandTypes.length < 2) {
    // If winner has weakest hand (HIGH_CARD), losers also get HIGH_CARD but weaker cards
    loserHandTypes.push(HAND_TYPES.HIGH_CARD, HAND_TYPES.HIGH_CARD);
  }
  
  const hands = {};
  const usedCards = [];
  
  // Generate winner hand first
  let winnerHand = generateSpecificHand(
    deck.filter(c => !usedCards.includes(c)), 
    winnerHandType, 
    true  // preferHighCards = true for winner
  );
  usedCards.push(...winnerHand);
  
  // Generate loser hands
  const loserOptions = [1, 2, 3].filter(opt => opt !== winningOption);
  
  for (let i = 0; i < loserOptions.length; i++) {
    const loserType = loserHandTypes[i % loserHandTypes.length];
    let loserHand = generateSpecificHand(
      deck.filter(c => !usedCards.includes(c)),
      loserType,
      false  // preferHighCards = false for losers
    );
    
    // Ensure loser hand is actually weaker
    let attempts = 0;
    while (compareHands(loserHand, winnerHand) >= 0 && attempts < 10) {
      // If loser hand is not weaker, try to generate a weaker version
      loserHand = generateSpecificHand(
        deck.filter(c => !usedCards.includes(c)),
        loserType,
        false
      );
      attempts++;
    }
    
    // If still not weaker after attempts, force a weaker hand by taking lower cards
    if (compareHands(loserHand, winnerHand) >= 0) {
      const availableCards = deck.filter(c => !usedCards.includes(c));
      // Sort by rank value (lowest first) and take first 3
      const sortedCards = availableCards.sort((a, b) => a.rankNumber - b.rankNumber);
      loserHand = sortedCards.slice(0, 3);
    }
    
    hands[loserOptions[i]] = {
      cards: loserHand.map(c => (c.image)),
      name: HAND_NAMES[loserType],
      winner: false,
    };
    usedCards.push(...loserHand);
  }
  
  // Assign winner hand
  hands[winningOption] = {
    cards: winnerHand.map(c => (c.image)),
    name: HAND_NAMES[winnerHandType],
    winner: true,
  };
  
  // Convert object to array format [hand1, hand2, hand3]
  const handsArray = [];
  for (let i = 1; i <= 3; i++) {
    handsArray.push(hands[i]);
  }
  
  return handsArray;
}

/**
 * Generate random Teen Patti hands for 3 options
 */
function generateRandomHands() {
  const deck = shuffle(generateDeck());
  const hands = {};
  
  for (let option = 1; option <= 3; option++) {
    const startIdx = (option - 1) * 3;
    const hand = deck.slice(startIdx, startIdx + 3);
    hands[option] = {
      cards: hand.map(c => ({
        rank: c.rank,
        suit: c.suit,
        display: c.display,
        suitNumber: c.suitNumber,
        rankNumber: c.rankNumber,
        image: c.image
      })),
      evaluation: evaluateHand(hand)
    };
  }
  
  return hands;
}

module.exports = {
  HAND_TYPES,
  HAND_NAMES,
  generateDeck,
  shuffle,
  evaluateHand,
  compareHands,
  generateGameHands,
  generateRandomHands,
  createCard,
  SUITS,
  RANKS,
  SUIT_CODES,
  SUIT_NAMES
};

