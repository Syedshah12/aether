import express from "express";
import { createUser, getAllUsers } from "./user.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";

const router = express.Router();

router.post("/", protect, authorize("admin"), createUser);
router.get("/", protect, authorize("admin"), getAllUsers);

export default router;