const jwt = require("jsonwebtoken");
const { io } = require("../config/server");

// Use a more flexible namespace that doesn't depend on hardcoded IP
const NAMESPACE = "/video-live";
const hostSocket = io.of(NAMESPACE);

console.log(`Setting up socket namespace: ${NAMESPACE}`);

// Socket.io auth middleware to prevent server crash on invalid/expired token
hostSocket.use((socket, next) => {
  try {
    const token = socket.handshake.query && socket.handshake.query.jwt;
    if (!token) {
      console.log("No JWT token provided for socket:", socket.id);
      return next(new Error("Authentication required: No JWT token provided"));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err && err.name === "TokenExpiredError") {
        console.log("JWT token expired for socket:", socket.id);
        return next(new Error("Authentication failed: Token expired"));
      }
      console.log("JWT verification failed for socket:", socket.id, err && err.message);
      return next(new Error("Authentication failed: Invalid token"));
    }

    socket.user = decoded.user || decoded;
    next();
  } catch (e) {
    console.log("Unexpected auth middleware error:", e && e.message);
    next(new Error("Authentication failed"));
  }
});

// Socket.io setup with Redis
hostSocket.on("connection", (socket) => {
  const roomId = socket.handshake.query.roomId;
  console.log("try connect");

  console.log("get type", typeof roomId);
  console.log("roomid", roomId);

  // Join room using roomId as room name
  socket.join(roomId);
  // Start socket event

  // Add chat event handler with more detailed logging
  socket.on("chat", (data) => {
    // Broadcast the chat message to all users in the room
    console.log("chat", data);
    const payLoad = {
      id: socket.user && socket.user.id,
      name: socket.user && socket.user.name,
      transaction: data.transaction,
      vvip: data.vvip,
      royal: data.royal,
      text: data.text
    }
    hostSocket.to(roomId).emit("chat", payLoad);
  });

      // User scroll for leave
    socket.on("leave", ({ room }) => {
      const roomName = String(room);
      socket.leave(roomName);
      console.log(`${socket.id} left room: ${room}`);
      //   io.to(room).emit("message", `User ${socket.id} left ${room}`);
    });

    // User scroll for join
    socket.on("join", ({ room }) => {
      const roomName = String(room);
      socket.join(roomName);
      console.log(`${socket.id} join room: ${room}`);

      //   io.to(room).emit("message", `User ${socket.id} left ${room}`);
    });



  socket.on("disconnect", () => {
    console.log("User disconnected:", {
      user: socket.user,
      roomId: roomId,
    });
  });
});

module.exports = { hostSocket };
