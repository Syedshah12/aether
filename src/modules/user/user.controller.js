import User from "./user.model.js";
import bcrypt from "bcryptjs";
import Session from "../session/session.model.js";
import Activity from "../activity/activity.model.js";
export const createUser = async (req, res) => {
  const { name, email, password, role } = req.body;
// Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already registered in system." });
  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashed,
    role
  });

  res.status(201).json(user);
};

export const getAllUsers = async (req, res) => {
  try {
    // We find all users WHERE the role is NOT EQUAL ($ne) to 'admin'
    const users = await User.find({ role: { $ne: "admin" } }).select("-password");
    
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error: error.message });
  }
};



// user.controller.js

// 1. Assign a user to the logged-in admin
export const assignUserToMe = async (req, res) => {
  const { targetUserId } = req.body;
  console.log(targetUserId);
  const adminId = req.user.id;
console.log(adminId,"admin");
  const user = await User.findByIdAndUpdate(
    targetUserId, 
    { assignedAdmin: adminId }, 
    { new: true }
  );

  res.json({ message: `User ${user.name} is now assigned to you.` });
};

// 2. Get only the users assigned to the logged-in admin
export const getMyUsers = async (req, res) => {
  const adminId = req.user.id;
  const users = await User.find({ assignedAdmin: adminId }).select("-password");
  res.json(users);
};



// controllers/userController.js (or wherever your user logic lives)

export const deleteUserEntirely = async (req, res) => {
  try {
    const { targetUserId } = req.params; // Using params for DELETE requests is standard
  console.log(targetUserId);
    // 1. Verify user exists first
    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ message: "Node not found in directory." });
    }

    // 2. Wipe linked data 
    // Assuming your models are named 'Session' and 'Activity'
    await Promise.all([
      Session.deleteMany({ user: targetUserId }),
      Activity.deleteMany({ user: targetUserId }),
      User.findByIdAndDelete(targetUserId)
    ]);

    res.json({ 
      message: `Node ${user.name} and all associated data have been purged from the system.` 
    });
  } catch (error) {
    console.error("Purge Error:", error);
    res.status(500).json({ 
      message: "Critical error during data purge sequence.",
      error: error.message 
    });
  }
};