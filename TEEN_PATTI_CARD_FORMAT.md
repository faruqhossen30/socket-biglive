# Teen Patti Card Data Format

## Overview

The Teen Patti game sends complete card information via Socket.IO events, structured to easily map to your card image files in `public/card/`.

---

## 📦 Card Data Structure

Each card in the game hands contains the following information:

```javascript
{
  "rank": "A",              // Card rank: "2"-"10", "J", "Q", "K", "A"
  "suit": "♠",              // Unicode suit symbol: ♠, ♥, ♦, ♣
  "display": "A♠",          // Display string: rank + suit
  "code": "AS",             // Two-letter code: AS, KH, TD, 2C, etc.
  "suitName": "spades",     // Suit name: spades, hearts, diamonds, clubs
  "suitCode": "S",          // Suit letter: S, H, D, C
  "image": "AS.png"         // Image filename: AS.png, KH.png, TD.png, etc.
}
```

---

## 🎴 Card Code Format

### Rank Codes
- **2-9**: "2", "3", "4", "5", "6", "7", "8", "9"
- **10**: "T" (Ten)
- **Jack**: "J"
- **Queen**: "Q"
- **King**: "K"
- **Ace**: "A"

### Suit Codes
- **♠ Spades**: "S"
- **♥ Hearts**: "H"
- **♦ Diamonds**: "D"
- **♣ Clubs**: "C"

### Examples
- Ace of Spades: `AS.png`
- King of Hearts: `KH.png`
- Ten of Diamonds: `TD.png`
- 7 of Clubs: `7C.png`
- Queen of Spades: `QS.png`

---

## 🎯 Complete Socket Event Data

### Example: `winning_option_generated` Event

```javascript
socket.on('winning_option_generated', (data) => {
  console.log(data);
});
```

**Data Structure:**
```json
{
  "round": 5,
  "winningOption": 2,
  "gameHands": {
    "1": {
      "cards": [
        {
          "rank": "7",
          "suit": "♠",
          "display": "7♠",
          "code": "7S",
          "suitName": "spades",
          "suitCode": "S",
          "image": "7S.png"
        },
        {
          "rank": "5",
          "suit": "♥",
          "display": "5♥",
          "code": "5H",
          "suitName": "hearts",
          "suitCode": "H",
          "image": "5H.png"
        },
        {
          "rank": "2",
          "suit": "♦",
          "display": "2♦",
          "code": "2D",
          "suitName": "diamonds",
          "suitCode": "D",
          "image": "2D.png"
        }
      ],
      "evaluation": {
        "type": 2,
        "typeName": "High Card",
        "strength": [2, 7, 5, 2],
        "description": "High Card 7"
      }
    },
    "2": {
      "cards": [
        {
          "rank": "A",
          "suit": "♠",
          "display": "A♠",
          "code": "AS",
          "suitName": "spades",
          "suitCode": "S",
          "image": "AS.png"
        },
        {
          "rank": "K",
          "suit": "♠",
          "display": "K♠",
          "code": "KS",
          "suitName": "spades",
          "suitCode": "S",
          "image": "KS.png"
        },
        {
          "rank": "Q",
          "suit": "♠",
          "display": "Q♠",
          "code": "QS",
          "suitName": "spades",
          "suitCode": "S",
          "image": "QS.png"
        }
      ],
      "evaluation": {
        "type": 6,
        "typeName": "Pure Sequence",
        "strength": [6, 14, 13, 12],
        "description": "Pure Sequence A♠-K♠-Q♠"
      }
    },
    "3": {
      "cards": [
        {
          "rank": "J",
          "suit": "♥",
          "display": "J♥",
          "code": "JH",
          "suitName": "hearts",
          "suitCode": "H",
          "image": "JH.png"
        },
        {
          "rank": "9",
          "suit": "♣",
          "display": "9♣",
          "code": "9C",
          "suitName": "clubs",
          "suitCode": "C",
          "image": "9C.png"
        },
        {
          "rank": "4",
          "suit": "♦",
          "display": "4♦",
          "code": "4D",
          "suitName": "diamonds",
          "suitCode": "D",
          "image": "4D.png"
        }
      ],
      "evaluation": {
        "type": 2,
        "typeName": "High Card",
        "strength": [2, 11, 9, 4],
        "description": "High Card J"
      }
    }
  }
}
```

---

## 🖼️ Display Cards in Frontend

### React Example

```jsx
function CardDisplay({ card }) {
  return (
    <img 
      src={`/card/${card.image}`}
      alt={card.display}
      title={`${card.rank} of ${card.suitName}`}
      className="playing-card"
    />
  );
}

function HandDisplay({ option, handData }) {
  return (
    <div className={`option-${option}`}>
      <h3>Option {option}</h3>
      <div className="cards">
        {handData.cards.map((card, index) => (
          <CardDisplay key={index} card={card} />
        ))}
      </div>
      <p className="hand-type">{handData.evaluation.description}</p>
    </div>
  );
}

// Usage
socket.on('winning_option_generated', (data) => {
  setGameHands(data.gameHands);
  setWinningOption(data.winningOption);
});

return (
  <div className="game-table">
    {[1, 2, 3].map(option => (
      <HandDisplay 
        key={option}
        option={option}
        handData={gameHands[option]}
      />
    ))}
  </div>
);
```

### Vanilla JavaScript Example

```javascript
function displayCards(gameHands, winningOption) {
  for (let option = 1; option <= 3; option++) {
    const hand = gameHands[option];
    const containerDiv = document.getElementById(`option-${option}`);
    
    // Clear previous cards
    containerDiv.innerHTML = '';
    
    // Add cards
    hand.cards.forEach(card => {
      const img = document.createElement('img');
      img.src = `/card/${card.image}`;
      img.alt = card.display;
      img.title = `${card.rank} of ${card.suitName}`;
      img.className = 'playing-card';
      containerDiv.appendChild(img);
    });
    
    // Add hand description
    const desc = document.createElement('p');
    desc.textContent = hand.evaluation.description;
    desc.className = 'hand-description';
    containerDiv.appendChild(desc);
    
    // Highlight winner
    if (option === winningOption) {
      containerDiv.classList.add('winner');
    }
  }
}

socket.on('winning_option_generated', (data) => {
  displayCards(data.gameHands, data.winningOption);
});
```

### jQuery Example

```javascript
function displayCards(gameHands, winningOption) {
  for (let option = 1; option <= 3; option++) {
    const hand = gameHands[option];
    const $container = $(`#option-${option}`);
    
    // Clear and add cards
    $container.empty();
    
    hand.cards.forEach(card => {
      $container.append(
        $('<img>')
          .attr('src', `/card/${card.image}`)
          .attr('alt', card.display)
          .attr('title', `${card.rank} of ${card.suitName}`)
          .addClass('playing-card')
      );
    });
    
    // Add description
    $container.append(
      $('<p>')
        .text(hand.evaluation.description)
        .addClass('hand-description')
    );
    
    // Highlight winner
    if (option === winningOption) {
      $container.addClass('winner');
    }
  }
}
```

---

## 📂 Expected File Structure

Your card images should be organized as:

```
public/
  card/
    AS.png    (Ace of Spades)
    AH.png    (Ace of Hearts)
    AD.png    (Ace of Diamonds)
    AC.png    (Ace of Clubs)
    KS.png    (King of Spades)
    KH.png    (King of Hearts)
    KD.png    (King of Diamonds)
    KC.png    (King of Clubs)
    QS.png    (Queen of Spades)
    ...
    TS.png    (Ten of Spades)
    TH.png    (Ten of Hearts)
    TD.png    (Ten of Diamonds)
    TC.png    (Ten of Clubs)
    9S.png    (9 of Spades)
    ...
    2S.png    (2 of Spades)
    2H.png    (2 of Hearts)
    2D.png    (2 of Diamonds)
    2C.png    (2 of Clubs)
```

**Total: 52 card images**

---

## 🎨 CSS Styling Example

```css
.playing-card {
  width: 100px;
  height: 140px;
  margin: 5px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  transition: transform 0.3s;
}

.playing-card:hover {
  transform: translateY(-10px);
}

.option-1, .option-2, .option-3 {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border: 2px solid #ddd;
  border-radius: 12px;
  margin: 10px;
}

.option-1.winner, .option-2.winner, .option-3.winner {
  border-color: gold;
  background: linear-gradient(135deg, #fff9e6 0%, #ffe4b3 100%);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
}

.hand-description {
  margin-top: 10px;
  font-weight: bold;
  color: #333;
}

.cards {
  display: flex;
  justify-content: center;
  gap: 10px;
}
```

---

## 🔍 Alternative Card Naming Conventions

If your card images use different naming conventions, you can easily adjust the mapping:

### Option 1: Lowercase (as.png, kh.png)
```javascript
image: `${rankCode}${SUIT_CODES[suit]}`.toLowerCase() + '.png'
```

### Option 2: Full Names (ace_spades.png, king_hearts.png)
```javascript
const RANK_NAMES = {
  'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack',
  '10': 'ten', '9': 'nine', '8': 'eight', '7': 'seven',
  '6': 'six', '5': 'five', '4': 'four', '3': 'three', '2': 'two'
};
image: `${RANK_NAMES[rank]}_${suitName}.png`
```

### Option 3: Numbers (1.png = AS, 2.png = AH, etc.)
Create a mapping function based on your numbering scheme.

---

## 📊 All Possible Card Codes

### Spades (♠)
AS, KS, QS, JS, TS, 9S, 8S, 7S, 6S, 5S, 4S, 3S, 2S

### Hearts (♥)
AH, KH, QH, JH, TH, 9H, 8H, 7H, 6H, 5H, 4H, 3H, 2H

### Diamonds (♦)
AD, KD, QD, JD, TD, 9D, 8D, 7D, 6D, 5D, 4D, 3D, 2D

### Clubs (♣)
AC, KC, QC, JC, TC, 9C, 8C, 7C, 6C, 5C, 4C, 3C, 2C

---

## 🎯 Summary

✅ **Each card object includes:**
- Display info (`rank`, `suit`, `display`)
- Image mapping (`code`, `image`)
- Suit details (`suitName`, `suitCode`)

✅ **Image filename format:** `{rank}{suit}.png`
- Examples: `AS.png`, `KH.png`, `TD.png`, `7C.png`

✅ **Easy to render:**
```javascript
<img src={`/card/${card.image}`} alt={card.display} />
```

✅ **All 3 options always included** in socket events with complete card data

✅ **Winner identified** by `winningOption` field (1, 2, or 3)

