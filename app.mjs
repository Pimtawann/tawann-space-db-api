import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import postRouter from "./routes/post.mjs";
import authRouter from "./routes/auth.mjs";

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());
app.use("/posts", postRouter);
app.use("/auth", authRouter);

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});