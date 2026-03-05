import { authenticateUser } from "./auth.service.js";

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const data = await authenticateUser(email, password);
    res.json(data);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};