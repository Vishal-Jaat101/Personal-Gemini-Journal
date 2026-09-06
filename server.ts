import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { generateJournalChatReply, generateSessionSummary } from "./server/gemini.js";
import { getSecretStatus } from "./server/secrets.js";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Top-Level Request Deserialization (Guaranteed Ordering)
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request logger
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      console.log(`[API] ${req.method} ${req.path}`);
    }
    next();
  });

  // 2. Health & Secret Status endpoints
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "personal-gemini-journal-api",
    });
  });

  app.get("/api/secret-status", (_req, res) => {
    const status = getSecretStatus();
    res.json(status);
  });

  // 3. Multi-turn Chat Endpoint with Defensive Payload Ingestion
  app.post("/api/chat", async (req, res) => {
    try {
      // Defensive payload ingestion
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const rawMessages = Array.isArray(body.messages) ? body.messages : [];
      const userContext = body.context && typeof body.context === "object" ? body.context : {};

      if (rawMessages.length === 0) {
        return res.status(400).json({
          error: "Invalid payload. 'messages' array cannot be empty.",
        });
      }

      // Sanitize messages
      const sanitizedMessages = rawMessages
        .filter((m: any) => m && typeof m === "object" && typeof m.content === "string")
        .map((m: any) => ({
          role: m.role === "model" ? ("model" as const) : ("user" as const),
          content: String(m.content).trim().slice(0, 8000),
        }));

      if (sanitizedMessages.length === 0) {
        return res.status(400).json({ error: "No valid message content provided." });
      }

      const { reply, modelUsed } = await generateJournalChatReply(
        sanitizedMessages,
        userContext
      );

      return res.json({
        reply,
        modelUsed,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error("[API /api/chat error]:", error?.message || error);
      return res.status(500).json({
        error: error?.message || "Failed to generate journal response from Gemini.",
      });
    }
  });

  // 4. Session Summarization Endpoint with Structured JSON output
  app.post("/api/summarize", async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const rawMessages = Array.isArray(body.messages) ? body.messages : [];

      if (rawMessages.length === 0) {
        return res.status(400).json({
          error: "Cannot summarize an empty conversation session.",
        });
      }

      const sanitizedMessages = rawMessages
        .filter((m: any) => m && typeof m === "object" && typeof m.content === "string")
        .map((m: any) => ({
          role: m.role === "model" ? ("model" as const) : ("user" as const),
          content: String(m.content).trim().slice(0, 8000),
        }));

      const { summary, modelUsed } = await generateSessionSummary(sanitizedMessages);

      return res.json({
        summary,
        modelUsed,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error("[API /api/summarize error]:", error?.message || error);
      return res.status(500).json({
        error: error?.message || "Failed to generate session summary.",
      });
    }
  });

  // 5. Frontend Serving (Vite in Dev, Dist static in Production)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Personal Gemini Journal running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
