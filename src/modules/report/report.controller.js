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
  const LAG_THRESHOLD = 300; // 5 minutes

  let startDate = new Date();
  if (range === 'today') startDate.setHours(0, 0, 0, 0);
  else if (range === 'week') startDate.setDate(startDate.getDate() - 7);
  else if (range === 'month') startDate.setMonth(startDate.getMonth() - 1);

  try {
    const sessions = await Session.find({
      user: new mongoose.Types.ObjectId(userId),
      loginTime: { $gte: startDate }
    }).sort({ loginTime: 1 });

    if (!sessions.length) {
      return res.json({ summary: { totalActive: 0, totalIdle: 0, sessionCount: 0 }, presentDays: 0 });
    }

    const presentDays = new Set();
    const intervals = [];
    let totalIdle = 0;

    sessions.forEach(session => {
      const dateKey = new Date(session.loginTime).toISOString().split("T")[0];
      presentDays.add(dateKey);

      const start = new Date(session.loginTime).getTime();
      const end = session.logoutTime ? new Date(session.logoutTime).getTime() : Date.now();
      
      const wallClockSeconds = (end - start) / 1000;
      const recordedActive = session.totalActiveTime || 0;
      const recordedIdle = session.totalIdleTime || 0;
      const gapTime = wallClockSeconds - (recordedActive + recordedIdle);

      // FAIR CALCULATION:
      // If the session has a massive gap (crash), we only trust the recorded active time.
      // If the gap is small (lag), we use the wall-clock time.
      if (gapTime > 0 && gapTime < LAG_THRESHOLD) {
        intervals.push({ start, end });
      } else {
        // For crashed/large gap sessions, we create a "virtual" interval 
        // that only lasts for the duration of the recorded active + idle time
        const virtualEnd = start + (recordedActive + recordedIdle) * 1000;
        intervals.push({ start, end: virtualEnd });
      }

      totalIdle += recordedIdle;
    });

    // --- MERGE OVERLAPPING INTERVALS ---
    // This prevents "Double Counting" if multiple sessions happen at once
    const merged = [];
    if (intervals.length > 0) {
      intervals.sort((a, b) => a.start - b.start);
      let current = intervals[0];

      for (let i = 1; i < intervals.length; i++) {
        if (intervals[i].start < current.end) {
          current.end = Math.max(current.end, intervals[i].end);
        } else {
          merged.push(current);
          current = intervals[i];
        }
      }
      merged.push(current);
    }

    const totalWallClockMs = merged.reduce((acc, interval) => acc + (interval.end - interval.start), 0);
    const totalWallClockSeconds = Math.floor(totalWallClockMs / 1000);

    // Active time is the merged connection time minus the idle time
    const finalActive = Math.max(0, totalWallClockSeconds - totalIdle);

    res.json({
      summary: {
        totalActive: finalActive,
        totalIdle: totalIdle,
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
  const LAG_THRESHOLD = 300; // 5 minutes in seconds

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
      // NOTE: If status is 'Crashed', you might want to cap this at a reasonable length
      const end = session.logoutTime ? new Date(session.logoutTime) : new Date();
      const wallClockDuration = Math.floor((end - start) / 1000);

      const recordedActive = session.totalActiveTime || 0;
      const recordedIdle = session.totalIdleTime || 0;
      
      // 2. Identify the Gap
      const gapTime = wallClockDuration - (recordedActive + recordedIdle);

      // 3. LOGIC: Only count small gaps as "Technical Lag" (Active)
      // If the gap is large (>= 300s), it's not lag; it's a disconnect or crash.
      // We do NOT add this to active time.
      if (gapTime > 0 && gapTime < LAG_THRESHOLD) {
        sessionsByDate[dateKey].totalActiveSeconds += (recordedActive + gapTime);
        sessionsByDate[dateKey].totalIdleSeconds += recordedIdle;
      } else {
        // Just add the actual recorded values, ignoring the massive gap
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