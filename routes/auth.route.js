import express from "express";
import {
  activateUser,
  login,
  logout,
  register,
  updateToken,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../utils/verification.js";

const router = express.Router();

router.post("/register", register);

router.post("/activate", activateUser);

router.post("/login", login);

router.post("/logout", verifyToken, logout);

router.get("/updatetoken", updateToken);

export default router;
