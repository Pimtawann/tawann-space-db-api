import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import connectionPool from './utils/db.mjs';
import validatePostData from "./middleware/postValidation.mjs";
import postRouter from "./routes/post.mjs";

const app = express();
const port = process.env.PORT || 4001;

app.use(cors());
app.use(express.json());
app.use("/posts", postRouter);

app.listen(port, () => {
  console.log(`Server is running at ${port}`);
});