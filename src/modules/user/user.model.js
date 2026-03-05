import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ["admin", "user"], default: "user" },
    isOnline: { type: Boolean, default: false },
    lastSeen: Date,
    currentStatus: {
      type: String,
      enum: [
        "Active",
        "Idle",
        "Offline",
        "Sleeping",
        "Shutdown",
        "No Internet"
      ],
      default: "Offline"
    }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);