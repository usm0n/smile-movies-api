import express, { json, Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import apiKeyMiddleware from "./middlewares/apiKey.middleware";
import userRouter from "./routes/users.routes";
import cookieParser from "cookie-parser";
import { getMovie, getTv } from "./api";
import { getMovieFromTmdb, getTvFromTmdb } from "./workers/tmdb";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use(cookieParser());
app.use(apiKeyMiddleware);
app.get("/", apiKeyMiddleware, (req, res) => {
  res.json({ message: "Welcome to the Smile Movies API" });
});
app.use("/api/v3/users", userRouter);
app.get("/proxy", async (req: any, res: any) => {
  const url = decodeURIComponent(req.query.url);
  if (!url) return res.status(400).send("URL required");

  try {
    const proxied = await fetch(url, {
      headers: {
        Referer: "https://autoembed.cc/",
        Origin: "https://autoembed.cc/",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

    res.set("Content-Type", proxied.headers.get("content-type"));
    const reader = proxied.body?.getReader();
    if (!reader) return res.status(500).send("Failed to get reader");

    const stream = new ReadableStream({
      async start(controller) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          controller.enqueue(value);
        }
        controller.close();
      },
    });

    stream.pipeTo(res.writeableStream);
  } catch (err) {
    res.status(500).send("Failed to proxy");
  }
});
app.get("/movie/:tmdbId", async (req, res) => {
  if (isNaN(parseInt(req.params.tmdbId))) {
    res.status(405).json({
      error: "Invalid movie id",
      hint: "Check the documentation again to see how to use this endpoint",
    });
    return;
  }

  const media = await getMovieFromTmdb(req.params.tmdbId);

  if (media instanceof Error) {
    res.status(405).json({ error: media.message });
    return;
  }

  let output = await getMovie(media);

  if (output === null || output instanceof Error) {
    res.status(404).json({
      error: "No sources fond for this movie.",
      hint: "If you know where to find this movie and know programming feel free to join us on GitHub: https://github.com/Inside4ndroid/TMDB-Embed-API to add it.",
    });
  } else {
    res.status(200).json(output);
  }
});

app.get("/movie/:provider/:tmdbId", async (req, res) => {
  const allowedProviders = ["2embed", "autoembed", "embedsu", "vidsrcsu"];
  if (!allowedProviders.includes(req.params.provider)) {
    res.status(400).json({
      error: "Invalid provider",
      hint: `Provider must be one of: ${allowedProviders.join(", ")}`,
    });
    return;
  }

  if (isNaN(parseInt(req.params.tmdbId))) {
    res.status(400).json({
      error: "Invalid movie id",
      hint: "Check the documentation again to see how to use this endpoint",
    });
    return;
  }

  const media = await getMovieFromTmdb(req.params.tmdbId);

  if (media instanceof Error) {
    res.status(405).json({ error: media.message });
    return;
  }

  let output = await getMovie(media, req.params.provider);

  if (output === null || output instanceof Error) {
    res.status(404).json({
      error: "No sources fond for this movie.",
      hint: "If you know where to find this movie and know programming feel free to join us on GitHub: https://github.com/Inside4ndroid/TMDB-Embed-API to add it.",
    });
  } else {
    res.status(200).json(output);
  }
});

app.get("/tv/:tmdbId", async (req, res) => {
  if (
    !req.params.tmdbId ||
    isNaN(parseInt(req.params.tmdbId)) ||
    !req.query.s ||
    isNaN(parseInt(req.query.s as string)) ||
    !req.query.e ||
    isNaN(parseInt(req.query.e as string))
  ) {
    res.status(405).json({
      error: "Invalid show id, season, or episode number",
      hint: "Check the documentation again to see how to use this endpoint",
    });
    return;
  }

  const media = await getTvFromTmdb(
    req.params.tmdbId,
    req.query.s as string,
    req.query.e as string
  );

  if (media instanceof Error) {
    res.status(405).json({ error: media.message });
    return;
  }

  let output = await getTv(media, req.query.s as string, req.query.e as string);

  if (output === null || output instanceof Error) {
    res.status(404).json({
      error: "No sources found for this show.",
      hint: "If you know where to find this show and know programming feel free to join us on GitHub: https://github.com/Inside4ndroid/TMDB-Embed-API to add it.",
    });
  } else {
    res.status(200).json(output);
  }
});

app.get("/tv/:provider?/:tmdbId", async (req: any, res: any) => {
  const allowedProviders = ["2embed", "autoembed", "embedsu", "vidsrcsu"];
  if (!allowedProviders.includes(req.params.provider || "")) {
    res.status(400).json({
      error: "Invalid provider",
      hint: `Provider must be one of: ${allowedProviders.join(", ")}`,
    });
    return;
  }

  if (isNaN(parseInt(req.params.tmdbId))) {
    res.status(400).json({
      error: "Invalid show id",
      hint: "Check the documentation again to see how to use this endpoint",
    });
    return;
  }

  if (
    !req.query.s ||
    isNaN(parseInt(req.query.s as string)) ||
    !req.query.e ||
    isNaN(parseInt(req.query.e as string))
  ) {
    return res.status(400).json({
      error: "Invalid season, or episode number",
      hint: "Check the documentation again to see how to use this endpoint",
    });
  }

  const media = await getTvFromTmdb(
    req.params.tmdbId,
    req.query.s,
    req.query.e
  );

  if (media instanceof Error) {
    return res.status(405).json({ error: media.message });
  }

  let output = await getTv(
    media,
    req.query.s,
    req.query.e,
    req.params.provider
  );

  if (output === null || output instanceof Error) {
    return res.status(404).json({
      error: "No sources found for this show.",
      hint: "If you know where to find this show and know programming feel free to join us on GitHub: https://github.com/Inside4ndroid/TMDB-Embed-API to add it.",
    });
  }

  return res.status(200).json(output);
});
app.get("/movie/", (req, res) => {
  res.status(405).json({
    error: "Invalid movie id",
    hint: "Check the documentation again to see how to use this endpoint",
  });
});

app.get("/tv/", (req, res) => {
  res.status(405).json({
    error: "Invalid show id",
    hint: "Check the documentation again to see how to use this endpoint",
  });
});

app.get("*", (req, res) => {
  res.status(404).json({ error: "Not found", hint: "Go to /" });
});

app.listen(PORT, () => {
  console.log(`Running server with port ${PORT}`);
});
import { error } from "console";
import e from "express";
import { query } from "firebase/firestore";
import { get } from "http";
import { join } from "path";
