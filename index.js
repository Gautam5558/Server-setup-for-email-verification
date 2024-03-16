import express, { json } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import userRouter from "./routes/user.route.js";
import authRouter from "./routes/auth.route.js";
import cors from "cors";
import cookieParser from "cookie-parser";
const app = express();

dotenv.config();

app.use(cors());

const connectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to mongoDb");
  } catch (err) {
    console.log(err);
  }
};

mongoose.connection.on("disconnected", () => {
  console.log("mongodb disconnected");
});

app.listen(process.env.PORT, async (req, res) => {
  await connectDb();
  console.log("Server is running");
});

app.use(express.json());
app.use(cookieParser());

app.use("/api/users", userRouter);
app.use("/api/auth", authRouter);

app.use((err, req, res, next) => {
  const status = err.status || 400;
  const message = err.message || "There was some error on the server side";
  res.status(status).json({
    status,
    message,
    stack: err.stack,
    success: false,
  });
});
