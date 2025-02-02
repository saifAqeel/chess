const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

// Initialize Express and create an HTTP server
const app = express();
const server = http.createServer(app);
const io = socket(server);

// Port for deployment (Render provides the PORT environment variable)
const PORT = process.env.PORT || 3000;

// Chess logic and player management
const chess = new Chess();
let players = {};

// Middleware and static files
app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

// Socket.io logic
io.on("connection", (uniquesocket) => {
  console.log("A player connected:", uniquesocket.id);

  // Assign players
  if (!players.white) {
    players.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    uniquesocket.emit("spectatorRole");
  }

  // Handle disconnections
  uniquesocket.on("disconnect", () => {
    console.log("A player disconnected:", uniquesocket.id);
    if (uniquesocket.id === players.white) delete players.white;
    if (uniquesocket.id === players.black) delete players.black;
  });

  // Handle chess moves
  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== players.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== players.black) return;

      const result = chess.move(move);
      if (result) {
        io.emit("move", move);
        io.emit("boardState", chess.fen());
      } else {
        console.log("Invalid Move:", move);
        uniquesocket.emit("Invalid Move", move);
      }
    } catch (err) {
      console.error(err);
      uniquesocket.emit("Invalid Move", move);
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
