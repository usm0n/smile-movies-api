import express from "express";
import cors from "cors";
import "dotenv/config";
import apiKeyMiddleware from "./middlewares/apiKey.middleware";
import userRouter from "./routes/users.routes";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cookieParser());
app.use(apiKeyMiddleware);
app.get("/", apiKeyMiddleware, (req, res) => {
  res.json({ message: "Welcome to the Smile Movies API" });
});
app.use("/api/v3/users", userRouter);

app.get("*", (req, res) => {
  res.status(404).json({ error: "Not found", hint: "Go to /" });
});

app.listen(PORT, () => {
  console.log(`Running server with port ${PORT}`);
});
