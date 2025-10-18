# Card Image Mapping Reference

## Your Card Image Format

Based on your `public/cards/` directory, your card images follow this format:

**Format:** `{rank}.{suit}.png`

Where:
- **Rank**: 2-14 (2-10 = numbers, 11 = Jack, 12 = Queen, 13 = King, 14 = Ace)
- **Suit**: 1-4 (1 = Clubs ♣, 2 = Diamonds ♦, 3 = Hearts ♥, 4 = Spades ♠)

---

## Complete Card Mapping

### Clubs (♣) - Suit 1

| Card | Filename | Description |
|------|----------|-------------|
| 2♣ | `2.1.png` | Two of Clubs |
| 3♣ | `3.1.png` | Three of Clubs |
| 4♣ | `4.1.png` | Four of Clubs |
| 5♣ | `5.1.png` | Five of Clubs |
| 6♣ | `6.1.png` | Six of Clubs |
| 7♣ | `7.1.png` | Seven of Clubs |
| 8♣ | `8.1.png` | Eight of Clubs |
| 9♣ | `9.1.png` | Nine of Clubs |
| 10♣ | `10.1.png` | Ten of Clubs |
| J♣ | `11.1.png` | Jack of Clubs |
| Q♣ | `12.1.png` | Queen of Clubs |
| K♣ | `13.1.png` | King of Clubs |
| A♣ | `14.1.png` | Ace of Clubs |

### Diamonds (♦) - Suit 2

| Card | Filename | Description |
|------|----------|-------------|
| 2♦ | `2.2.png` | Two of Diamonds |
| 3♦ | `3.2.png` | Three of Diamonds |
| 4♦ | `4.2.png` | Four of Diamonds |
| 5♦ | `5.2.png` | Five of Diamonds |
| 6♦ | `6.2.png` | Six of Diamonds |
| 7♦ | `7.2.png` | Seven of Diamonds |
| 8♦ | `8.2.png` | Eight of Diamonds |
| 9♦ | `9.2.png` | Nine of Diamonds |
| 10♦ | `10.2.png` | Ten of Diamonds |
| J♦ | `11.2.png` | Jack of Diamonds |
| Q♦ | `12.2.png` | Queen of Diamonds |
| K♦ | `13.2.png` | King of Diamonds |
| A♦ | `14.2.png` | Ace of Diamonds |

### Hearts (♥) - Suit 3

| Card | Filename | Description |
|------|----------|-------------|
| 2♥ | `2.3.png` | Two of Hearts |
| 3♥ | `3.3.png` | Three of Hearts |
| 4♥ | `4.3.png` | Four of Hearts |
| 5♥ | `5.3.png` | Five of Hearts |
| 6♥ | `6.3.png` | Six of Hearts |
| 7♥ | `7.3.png` | Seven of Hearts |
| 8♥ | `8.3.png` | Eight of Hearts |
| 9♥ | `9.3.png` | Nine of Hearts |
| 10♥ | `10.3.png` | Ten of Hearts |
| J♥ | `11.3.png` | Jack of Hearts |
| Q♥ | `12.3.png` | Queen of Hearts |
| K♥ | `13.3.png` | King of Hearts |
| A♥ | `14.3.png` | Ace of Hearts |

### Spades (♠) - Suit 4

| Card | Filename | Description |
|------|----------|-------------|
| 2♠ | `2.4.png` | Two of Spades |
| 3♠ | `3.4.png` | Three of Spades |
| 4♠ | `4.4.png` | Four of Spades |
| 5♠ | `5.4.png` | Five of Spades |
| 6♠ | `6.4.png` | Six of Spades |
| 7♠ | `7.4.png` | Seven of Spades |
| 8♠ | `8.4.png` | Eight of Spades |
| 9♠ | `9.4.png` | Nine of Spades |
| 10♠ | `10.4.png` | Ten of Spades |
| J♠ | `11.4.png` | Jack of Spades |
| Q♠ | `12.4.png` | Queen of Spades |
| K♠ | `13.4.png` | King of Spades |
| A♠ | `14.4.png` | Ace of Spades |

---

## Socket Data Format

When the game sends card data via socket, each card includes:

```json
{
  "rank": "7",
  "suit": "♠",
  "display": "7♠",
  "suitNumber": 4,
  "rankNumber": 7,
  "image": "7.4.png"
}
```

**Fields:**
- `rank`: "2"-"10", "J", "Q", "K", "A"
- `suit`: "♠", "♥", "♦", "♣"
- `display`: Human-readable format (e.g., "7♠")
- `suitNumber`: 1-4 (1=Clubs, 2=Diamonds, 3=Hearts, 4=Spades)
- `rankNumber`: 2-14 (2-10=numbers, 11=Jack, 12=Queen, 13=King, 14=Ace)
- `image`: Filename in `public/cards/` directory

---

## Example Socket Response

```json
{
  "round": 5,
  "winningOption": 2,
  "gameHands": {
    "1": {
      "cards": [
        { "rank": "7", "suit": "♠", "display": "7♠", "suitNumber": 4, "rankNumber": 7, "image": "7.4.png" },
        { "rank": "5", "suit": "♥", "display": "5♥", "suitNumber": 3, "rankNumber": 5, "image": "5.3.png" },
        { "rank": "2", "suit": "♦", "display": "2♦", "suitNumber": 2, "rankNumber": 2, "image": "2.2.png" }
      ],
      "evaluation": { "typeName": "High Card", "description": "High Card 7" }
    },
    "2": {
      "cards": [
        { "rank": "A", "suit": "♠", "display": "A♠", "suitNumber": 4, "rankNumber": 14, "image": "14.4.png" },
        { "rank": "K", "suit": "♠", "display": "K♠", "suitNumber": 4, "rankNumber": 13, "image": "13.4.png" },
        { "rank": "Q", "suit": "♠", "display": "Q♠", "suitNumber": 4, "rankNumber": 12, "image": "12.4.png" }
      ],
      "evaluation": { "typeName": "Pure Sequence", "description": "Pure Sequence A♠-K♠-Q♠" }
    },
    "3": {
      "cards": [
        { "rank": "J", "suit": "♥", "display": "J♥", "suitNumber": 3, "rankNumber": 11, "image": "11.3.png" },
        { "rank": "9", "suit": "♣", "display": "9♣", "suitNumber": 1, "rankNumber": 9, "image": "9.1.png" },
        { "rank": "4", "suit": "♦", "display": "4♦", "suitNumber": 2, "rankNumber": 4, "image": "4.2.png" }
      ],
      "evaluation": { "typeName": "High Card", "description": "High Card J" }
    }
  }
}
```

---

## Usage in Frontend

### React/JavaScript
```javascript
socket.on('winning_option_generated', (data) => {
  const hand = data.gameHands[1]; // Get option 1
  
  hand.cards.forEach(card => {
    // Display card image
    const imgPath = `/cards/${card.image}`;
    // e.g., "/cards/14.1.png" for Ace of Spades
  });
});
```

### Flutter
```dart
// Load from network
Image.network('http://yourserver.com/cards/${card.image}')

// Or from assets
Image.asset('assets/cards/${card.image}')
```

### HTML
```html
<img src="/cards/14.1.png" alt="Ace of Spades">
<img src="/cards/13.2.png" alt="King of Hearts">
<img src="/cards/7.1.png" alt="7 of Spades">
```

---

## Quick Reference

**Rank Numbers:**
- 2-10 = Number cards (as is)
- 11 = Jack (J)
- 12 = Queen (Q)
- 13 = King (K)
- 14 = Ace (A)

**Suit Numbers:**
- 1 = Clubs (♣)
- 2 = Diamonds (♦)
- 3 = Hearts (♥)
- 4 = Spades (♠)

**Formula:**
```
filename = `${rankNumber}.${suitNumber}.png`
```

**Examples:**
- Ace of Spades = `14.4.png`
- King of Hearts = `13.3.png`
- 7 of Spades = `7.4.png`
- 2 of Diamonds = `2.2.png`
- Jack of Clubs = `11.1.png`

---

## All 52 Cards

```
Clubs (1):    2.1.png, 3.1.png, 4.1.png, 5.1.png, 6.1.png, 7.1.png, 8.1.png, 9.1.png, 10.1.png, 11.1.png, 12.1.png, 13.1.png, 14.1.png
Diamonds (2): 2.2.png, 3.2.png, 4.2.png, 5.2.png, 6.2.png, 7.2.png, 8.2.png, 9.2.png, 10.2.png, 11.2.png, 12.2.png, 13.2.png, 14.2.png
Hearts (3):   2.3.png, 3.3.png, 4.3.png, 5.3.png, 6.3.png, 7.3.png, 8.3.png, 9.3.png, 10.3.png, 11.3.png, 12.3.png, 13.3.png, 14.3.png
Spades (4):   2.4.png, 3.4.png, 4.4.png, 5.4.png, 6.4.png, 7.4.png, 8.4.png, 9.4.png, 10.4.png, 11.4.png, 12.4.png, 13.4.png, 14.4.png
```

---

✅ **The `image` field in socket data matches your exact file names!**

