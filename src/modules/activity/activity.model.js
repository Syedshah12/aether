import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    session: { type: mongoose.Schema.Types.ObjectId, ref: "Session" },
    appName: String,
    windowTitle: String,
    startTime: Date,
    endTime: Date,
    duration: Number,
    status: { type: String, enum: ["Active", "Idle"] }
  },
  { timestamps: true }
);

export default mongoose.model("Activity", activitySchema);