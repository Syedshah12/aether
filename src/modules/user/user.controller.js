import User from "./user.model.js";
import bcrypt from "bcryptjs";

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