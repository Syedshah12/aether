import express from "express";
import { startSession, endSession } from "./session.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/start", protect, startSession);
router.post("/end", protect, endSession);

export default router;