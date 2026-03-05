import express from "express";
import { getUserReport,getAggregatedReport,getTopActivities,getLatestActivities,getDailySessions } from "./report.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";

const router = express.Router();
router.get("/daily-sessions/:userId", protect, authorize("admin"), getDailySessions);
router.get("/latest-activities/:userId", protect, authorize("admin"), getLatestActivities);
router.get("/:userId", protect, authorize("admin"), getUserReport);
router.get("/summary/:userId", protect, authorize("admin"), getAggregatedReport);
router.get("/top-apps/:userId", protect, authorize("admin"), getTopActivities);

export default router;