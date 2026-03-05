// src/config/socket.js
import { Server } from "socket.io";
import User from "../modules/user/user.model.js";

let io;
const userSockets = new Map(); // Store socketId -> userId mapping

export const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" }
  });

  io.on("connection", (socket) => {
    socket.on("registerUser", async (userId) => {
      socket.join(userId);
      userSockets.set(socket.id, userId); // Link this connection to the user
      
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        currentStatus: "Active",
        lastSeen: new Date()
      });

      // Notify admins immediately that a user came online
      io.emit("adminStatusUpdate", { userId, status: "Active", isOnline: true });
    });

    socket.on("statusUpdate", async ({ userId, status }) => {
      await User.findByIdAndUpdate(userId, {
        currentStatus: status,
        lastSeen: new Date()
      });

      // This matches what your AdminDashboard.jsx is listening for
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