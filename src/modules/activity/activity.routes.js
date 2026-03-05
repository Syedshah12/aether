import express from "express";
import { logActivity,logBatchActivity } from "./activity.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();
router.post("/", protect, logActivity);
router.post("/batch",protect, logBatchActivity);
export default router;