import Session from "./session.model.js";
import User from "../user/user.model.js";
import { getIO } from "../../config/socket.js";

export const startSession = async (req, res) => {
  const userId = req.user.id;
  const io = getIO();

  // Kill any existing sessions for this user (concurrent login protection)
  if (io) {
    io.to(userId.toString()).emit("FORCE_LOGOUT", {
      message: "Concurrent login detected. Current node terminating."
    });
  }

  await Session.updateMany(
    { user: userId, logoutTime: { $exists: false } },
    { $set: { logoutTime: new Date(), status: "Force closed: concurrent login" } }
  );

  const session = await Session.create({
    user: userId,
    loginTime: new Date()
  });

  await User.findByIdAndUpdate(userId, { isOnline: true, currentStatus: "Active" });
  res.json(session);
};

export const endSession = async (req, res) => {
  const { sessionId, totalActiveTime, totalIdleTime, reason } = req.body;

  try {
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    // KEY FIX: Trust the values from the Electron main process completely.
    // The main process has already done the gap flush before sending these numbers.
    // DO NOT add any gap arithmetic here — that was the double-counting bug.
    await Session.findByIdAndUpdate(sessionId, {
      logoutTime: new Date(),
      totalActiveTime: totalActiveTime || 0,
      totalIdleTime: totalIdleTime || 0,
      status: reason || "Manual Stop",
    });

    await User.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      currentStatus: "Offline",
      lastSeen: new Date(),
    });

    res.json({ message: "Session Ended Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};