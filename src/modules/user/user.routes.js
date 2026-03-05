import express from "express";
import { createUser, getAllUsers,getMyUsers,assignUserToMe,deleteUserEntirely } from "./user.controller.js";
import { protect } from "../../middleware/auth.middleware.js";
import { authorize } from "../../middleware/role.middleware.js";

const router = express.Router();

router.post("/", protect, authorize("admin"), createUser);
router.get("/", protect, authorize("admin"), getAllUsers);
router.get("/my-team", protect, authorize("admin"),  getMyUsers);
// routes/userRoutes.js
router.delete("/purge/:targetUserId", protect, authorize("admin"), deleteUserEntirely);
// Assign a specific user to the currently logged-in admin
// PATCH /api/users/assign
router.patch("/assign", protect,authorize("admin"),  assignUserToMe);
export default router;