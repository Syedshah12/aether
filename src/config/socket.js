


import { Server } from "socket.io";
import User from "../modules/user/user.model.js";

let io;
const userSockets = new Map();

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    // --- SCREENSHOT LOGIC (MOVE OUTSIDE registerUser) ---
    // Inside io.on("connection", (socket) => { ...

// 3. Admin sends a priority message to a user
socket.on("adminSendMessage", ({ targetUserId, message }) => {
  io.to(targetUserId).emit("RECEIVE_PRIORITY_MESSAGE", { 
    message,
    timestamp: new Date() 
  });
});
    // 1. Admin sends the command
    socket.on("adminTriggerScreenshot", (targetUserId) => {
      // Direct the command to the user's specific room
      io.to(targetUserId).emit("COMMAND_CAPTURE_SCREEN", { 
        adminSocketId: socket.id 
      });
    });

    // 2. User sends the result back
    socket.on("SCREENSHOT_RESULT", (data) => {
      // Send directly to the specific admin who requested it
      io.to(data.adminSocketId).emit("DISPLAY_SCREENSHOT", data.image);
    });

    // --- EXISTING LOGIC ---

    socket.on("registerUser", async (userId) => {
      socket.join(userId);
      userSockets.set(socket.id, userId);
      
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        currentStatus: "Active",
        lastSeen: new Date()
      });

      io.emit("adminStatusUpdate", { userId, status: "Active", isOnline: true });
    });

    socket.on("statusUpdate", async ({ userId, status }) => {
      await User.findByIdAndUpdate(userId, {
        currentStatus: status,
        lastSeen: new Date()
      });
      io.emit("adminStatusUpdate", { userId, status });
    });

    socket.on("disconnect", async () => {
      const userId = userSockets.get(socket.id);
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          currentStatus: "Offline",
          lastSeen: new Date()
        });
        
        io.emit("adminStatusUpdate", { userId, status: "Offline", isOnline: false });
        userSockets.delete(socket.id);
      }
      console.log("Client disconnected");
    });
  });
};

export const getIO = () => io;