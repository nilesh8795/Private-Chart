const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const mongoose = require("mongoose");

// ====== Setup App ======
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ====== Connect to MongoDB ======
mongoose.connect("mongodb+srv://HR_dashboard:PIulbLr1yqsPtULa@cluster0.gxidgzw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// ====== Message Model (inline) ======
const messageSchema = new mongoose.Schema({
  to: String,
  from: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});

const Message = mongoose.model("Message", messageSchema);

// ====== Core Logic ======
const allowedUsers = ["user1", "user2"];
const users = {}; // username -> socket.id

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Set username
  socket.on("set_username", async (username) => {
    if (!allowedUsers.includes(username)) {
      socket.emit("auth_error", "Username not allowed");
      socket.disconnect();
      return;
    }

    users[username] = socket.id;
    socket.username = username;
    console.log(`User logged in: ${username}`);

    // Deliver offline messages
    const offlineMessages = await Message.find({ to: username });
    offlineMessages.forEach((msg) => {
      io.to(socket.id).emit("receive_message", {
        sender: msg.from,
        message: msg.message,
      });
    });

    // Clear delivered messages
    await Message.deleteMany({ to: username });
  });

  // Handle private message
  socket.on("private_message", async ({ message }) => {
    const recipient = allowedUsers.find((u) => u !== socket.username);
    const receiverId = users[recipient];

    if (receiverId) {
      io.to(receiverId).emit("receive_message", {
        sender: socket.username,
        message,
      });
    } else {
      // Save message if user is offline
      const msg = new Message({
        from: socket.username,
        to: recipient,
        message,
      });
      await msg.save();
      console.log(`Offline message stored for ${recipient}`);
    }
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    if (socket.username) {
      delete users[socket.username];
      console.log(`User disconnected: ${socket.username}`);
    }
  });
});

server.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
