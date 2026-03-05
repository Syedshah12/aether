import Activity from "./activity.model.js";
// workign one
// activity.controller.js
// export const logActivity = async (req, res) => {
//   try {
//     // Only log if the status being sent is "Active"
//     if (req.body.status === "Idle") {
//        return res.status(200).json({ message: "Idle skipped" });
//     }

//     const activity = await Activity.create({
//       ...req.body,
//       user: req.user._id || req.user.id 
//     });
//     res.status(201).json(activity);
//   } catch (error) {
//     res.status(400).json({ message: "Activity log failed", error: error.message });
//   }
// };


// activity.controller.js
export const logActivity = async (req, res) => {
  try {
    // 1. SKIP ADMINS: Check the role from the authenticated user
    // We check req.user.role (assuming your protect middleware loads the full user)
    if (req.user && req.user.role === "admin") {
      return res.status(200).json({ message: "Admin tracking disabled" });
    }

    // 2. SKIP IDLE: Your existing logic
    if (req.body.status === "Idle") {
      return res.status(200).json({ message: "Idle skipped" });
    }

    // 3. LOG ACTIVITY: Only for non-admin users with "Active" status
    const activity = await Activity.create({
      ...req.body,
      user: req.user._id || req.user.id 
    });

    res.status(201).json(activity);
  } catch (error) {
    // We use 400 or 500 here, but the desktop app won't crash 
    // because the "Admin" skip above returns a 200 OK.
    res.status(400).json({ message: "Activity log failed", error: error.message });
  }
};

// controllers/activityController.js

export const logBatchActivity = async (req, res) => {
  try {
    // 1. SKIP ADMINS: Same logic as your reference
    if (req.user && req.user.role === "admin") {
      return res.status(200).json({ message: "Admin tracking disabled" });
    }

    const { session, activities } = req.body;

    if (!activities || !Array.isArray(activities) || activities.length === 0) {
      return res.status(200).json({ message: "No activities to log" });
    }

    // 2. FILTER & FORMAT: Skip "Idle" entries and attach User ID
    // This replicates your "SKIP IDLE" step for every item in the batch
    const validActivities = activities
      .filter(act => act.status !== "Idle") 
      .map(act => ({
        session: session,
        user: req.user._id || req.user.id,
        appName: act.appName,
        windowTitle: act.windowTitle,
        startTime: act.timestamp, // Uses the timestamp recorded at the moment of activity
        status: act.status,
        duration: 5 // Default duration per pulse
      }));

    // 3. LOG ACTIVITIES: If there's anything left after filtering
    if (validActivities.length > 0) {
      await Activity.insertMany(validActivities);
      return res.status(201).json({ 
        message: `Batch logged: ${validActivities.length} activities saved.` 
      });
    }

    res.status(200).json({ message: "Batch processed (all items were filtered out)" });

  } catch (error) {
    console.error("Batch Log Error:", error);
    res.status(400).json({ message: "Batch activity log failed", error: error.message });
  }
};