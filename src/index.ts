import express from "express";
import cors from "cors";
import "dotenv/config";
import apiKeyMiddleware from "./middlewares/apiKey.middleware";
import userRouter from "./routes/users.routes";
import cookieParser from "cookie-parser";
import https from 'https'
import http from 'http'
import { URL } from 'url'

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cookieParser());
app.use("/proxy", (req, res) => {
  const url = new URL(decodeURIComponent(req.query.url as string));
  const client = url.protocol === "https:" ? https : http;

  const options = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method: "GET",
    headers: {
      // Spoof referrer if needed:
      Referer: "https://smile-movies.uz",
      "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
    },
  };

  const proxy = client.request(options, (r) => {
    res.writeHead(r.statusCode || 200, r.headers);
    r.pipe(res);
  });

  proxy.on("error", (err) => {
    console.error(err);
    res.status(500).send("Proxy failed 💀");
  });

  proxy.end();
});
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
