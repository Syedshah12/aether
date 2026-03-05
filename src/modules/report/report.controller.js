import Session from "../session/session.model.js";
import Activity from "../activity/activity.model.js";
import mongoose from "mongoose";
export const getUserReport = async (req, res) => {
  const { userId } = req.params;

  const sessions = await Session.find({ user: userId });
  const activities = await Activity.find({ user: userId });

  res.json({ sessions, activities });
};



export const getAggregatedReport = async (req, res) => {
  const { userId } = req.params;
  const { range } = req.query;

  let startDate = new Date();
  if (range === 'today') startDate.setHours(0, 0, 0, 0);
  else if (range === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (range === 'month') startDate.setMonth(startDate.getMonth() - 1);

  try {
    const sessions = await Session.find({
      user: new mongoose.Types.ObjectId(userId),
      createdAt: { $gte: startDate }
    });

    let totalActive = 0;
    let totalIdle = 0;
    const presentDays = new Set();

    sessions.forEach(session => {
      const dateKey = new Date(session.loginTime || session.createdAt).toISOString().split("T")[0];
      presentDays.add(dateKey);

      // 1. Calculate Wall-Clock Time (Start to End)
      const start = new Date(session.loginTime || session.createdAt);
      const end = session.logoutTime ? new Date(session.logoutTime) : new Date();
      const wallClockDuration = Math.max(0, Math.floor((end - start) / 1000));

      const recordedIdle = session.totalIdleTime || 0;
      
      // 2. Reference Logic: Gap goes to Active
      // Active = WallClock - Idle
      const calculatedActive = Math.max(0, wallClockDuration - recordedIdle);

      totalActive += calculatedActive;
      totalIdle += recordedIdle;
    });

    // 3. REMOVED Activity.aggregate
    // Because your Session logic (wall-clock) already accounts for 
    // the time between login and "now" (new Date()) for live sessions.
    // Adding activityStats on top causes the double-count.

    res.json({
      summary: {
        totalActive,
        totalIdle,
        sessionCount: sessions.length
      },
      presentDays: presentDays.size
    });

  } catch (error) {
    res.status(500).json({ message: "Aggregation failed", error: error.message });
  }
};





// modules/report/report.controller.js

// modules/report/report.controller.js

export const getTopActivities = async (req, res) => {
  const { userId } = req.params;
  const { range } = req.query;

  let startDate = new Date();
  if (range === 'today') startDate.setHours(0, 0, 0, 0);
  else if (range === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (range === 'month') startDate.setMonth(startDate.getMonth() - 1);

  try {
    const topActivities = await Activity.aggregate([
      { 
        $match: { 
          user: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: startDate },
          status: "Active"
        } 
      },
      {
        $group: {
          // FIX: Change $title to $windowTitle to match your Schema
          _id: { app: "$appName", title: "$windowTitle" }, 
          count: { $sum: 1 }, 
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          appName: "$_id.app",
          windowTitle: "$_id.title", // This maps the grouped title back to windowTitle
          totalSeconds: { $multiply: ["$count", 5] },
          _id: 0
        }
      }
    ]);

    res.json(topActivities);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch activities", error: error.message });
  }
};


// modules/report/report.controller.js

export const getLatestActivities = async (req, res) => {
  const { userId } = req.params;

  try {
    const latest = await Activity.find({ user: userId })
      .sort({ createdAt: -1 }) // Get newest first
      .limit(10); // Show last 10 pulses

    res.json(latest);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch live feed", error: error.message });
  }
};



// report.controller.js



export const getDailySessions = async (req, res) => {
  const { userId } = req.params;

  try {
    const sessions = await Session.find({ user: userId }).sort({ loginTime: 1 });
    if (!sessions.length) return res.json([]);

    const sessionsByDate = {};

    sessions.forEach((session) => {
      const dateKey = new Date(session.loginTime).toISOString().split("T")[0];

      if (!sessionsByDate[dateKey]) {
        sessionsByDate[dateKey] = {
          date: dateKey,
          totalActiveSeconds: 0,
          totalIdleSeconds: 0,
          sessions: []
        };
      }

      // 1. Calculate the Wall-Clock Time
      const start = new Date(session.loginTime);
      const end = session.logoutTime ? new Date(session.logoutTime) : new Date();
      const wallClockDuration = Math.floor((end - start) / 1000);

      // 2. The "Fairness" Calculation
      // We take the recorded active time and the recorded idle time
      const recordedActive = session.totalActiveTime || 0;
      const recordedIdle = session.totalIdleTime || 0;
      
      // 3. Find the "Unaccounted Time" (The Gaps)
      const gapTime = wallClockDuration - (recordedActive + recordedIdle);

      // 4. LOGIC: If the gap is small relative to the session, it's technical lag.
      // We add the gaps to Active time to be fair to the user.
      if (gapTime > 0) {
        sessionsByDate[dateKey].totalActiveSeconds += (recordedActive + gapTime);
        sessionsByDate[dateKey].totalIdleSeconds += recordedIdle;
      } else {
        sessionsByDate[dateKey].totalActiveSeconds += recordedActive;
        sessionsByDate[dateKey].totalIdleSeconds += recordedIdle;
      }

      sessionsByDate[dateKey].sessions.push({
        start: session.loginTime,
        end: session.logoutTime,
        status: session.status,
        duration: wallClockDuration
      });
    });

    const result = Object.values(sessionsByDate).sort((a, b) => b.date.localeCompare(a.date));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
};