import http from "http";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { initSocket } from "./config/socket.js";
import { PORT } from "./config/env.js";
import { markUnclosedSessionsAsCrashed } from "./utils/status.utils.js";
import Session from "./modules/session/session.model.js";

const server = http.createServer(app);

await connectDB();
await markUnclosedSessionsAsCrashed(Session);

initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});