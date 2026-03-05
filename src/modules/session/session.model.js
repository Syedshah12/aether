import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    loginTime: Date,
    logoutTime: Date,
    totalActiveTime: { type: Number, default: 0 },
    totalIdleTime: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["Active", "Ended", "Crashed", "Shutdown"],
      default: "Active"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Session", sessionSchema);