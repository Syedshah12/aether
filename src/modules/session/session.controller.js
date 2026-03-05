import Session from "./session.model.js";
import User from "../user/user.model.js";

export const startSession = async (req, res) => {
  const session = await Session.create({
    user: req.user.id,
    loginTime: new Date()
  });

  await User.findByIdAndUpdate(req.user.id, {
    isOnline: true,
    currentStatus: "Active"
  });

  res.json(session);
};

export const endSession = async (req, res) => {
  const { sessionId, totalActiveTime, totalIdleTime, reason } = req.body;

  try {
    const session = await Session.findById(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const logoutTime = new Date();
    const loginTime = new Date(session.loginTime);
    
    // 1. Calculate the actual seconds between login and logout
    const wallClockDuration = Math.floor((logoutTime - loginTime) / 1000);

    // 2. See what the agent reported
    const reportedActive = totalActiveTime || 0;
    const reportedIdle = totalIdleTime || 0;

    // 3. Calculate the "Technical Gap" (those 37 seconds you were worried about)
    const gap = wallClockDuration - (reportedActive + reportedIdle);

    // 4. Fill the gap: Add the gap to Active time.
    // This way, if the user was idle for only 37s (less than your 60s rule),
    // it counts as Active time rather than just disappearing.
    const finalActive = reportedActive + (gap > 0 ? gap : 0);

    await Session.findByIdAndUpdate(sessionId, {
      logoutTime,
      totalActiveTime: finalActive,
      totalIdleTime: reportedIdle,
      status: reason || "Manual Logout"
    });

    await User.findByIdAndUpdate(req.user.id, {
      isOnline: false,
      currentStatus: "Offline",
      lastSeen: new Date()
    });

    res.json({ message: "Session Ended Successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};