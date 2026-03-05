import express from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import sessionRoutes from "./modules/session/session.routes.js";
import activityRoutes from "./modules/activity/activity.routes.js";
import reportRoutes from "./modules/report/report.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/reports", reportRoutes);

export default app;