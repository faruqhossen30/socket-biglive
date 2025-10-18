const express = require("express");
const { app, server, io } = require("./config/server");
const port = process.env.PORT || 3000;
require("dotenv").config();
const router = express.Router();
const jwt = require("jsonwebtoken");
require("./socket/hostSocket");
require("./utils/json-bigint");

const { redisClient, radisURL } = require('./config/redis');
// Initialize Greedy Game
console.log('🎮 Initializing Greedy Game...');
const { greedyGame } = require('./games/greedyGame');

// Initialize Teen Patti Game
// console.log('🎴 Initializing Teen Patti Game...');
const { teenPattiGame } = require('./games/teenPattiGame');

// Router
const videoLiveRoute = require("./routes/videoLiveRoute");
const greedyGameRoute = require("./routes/greedyGameRoute");
const teenPattiGameRoute = require("./routes/teenPattiGameRoute");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use("/", router);
app.use("/api/video-live", videoLiveRoute);
app.use("/api/greedy", greedyGameRoute);
app.use("/api/teen-patti", teenPattiGameRoute);

// jwt
router.post("/jwt", (req, res) => {
  const { id, name } = req.body;
  try {
    if (!id || !name) {
      return res.status(400).json({ error: "Missing id or name" });
    }
    const token = jwt.sign(
      { user: { id: id, name: name } },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: `Internal server error: ${error}` });
  }
});

router.post("/verify", (req, res) => {
  const token = req.body.token;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('decode', decoded);
    res.send(decoded);
  } catch (error) {
    res.json({ error: "Invalid token" });
  }
});

app.get("/api", (req, res) => {
  res.send("Hello World!");
});

server.listen(port, async () => {
  console.log(`Listening on port ${port}`);
  console.log("Socket.io server is running");
  await redisClient.connect(radisURL).then(() => {
    console.log("redis connect");
  });
});
