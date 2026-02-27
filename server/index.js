import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { z } from "zod";

dotenv.config();

const DEFAULT_ALLOWED_ORIGINS = ["http://localhost:5173"];
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_UPLOAD_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, "application/pdf", "text/plain"]);
const SUPPORTED_LANGUAGES = ["en", "es", "fr"];
const LANGUAGE_NAMES = {
  en: "English",
  es: "Spanish",
  fr: "French",
};
const SUPPORTED_READING_LEVELS = ["very_simple", "simple", "detailed"];
const READING_LEVEL_PROMPTS = {
  very_simple: "Use very short sentences and very simple words for younger children.",
  simple: "Use simple child-friendly language with clear examples.",
  detailed: "Use child-friendly language with slightly more detail for older children.",
};

const TRIAGE_COPY = {
  en: {
    emergencyTitle: "Emergency warning",
    emergencyMessage: "Some symptoms look urgent. Please seek emergency care now.",
    cautionTitle: "Doctor follow-up recommended",
    cautionMessage: "These symptoms should be checked by a doctor soon.",
    routineTitle: "Monitor and follow guidance",
    routineMessage: "No urgent red flags detected, but keep monitoring symptoms.",
  },
  es: {
    emergencyTitle: "Advertencia de emergencia",
    emergencyMessage: "Algunos sintomas parecen urgentes. Busquen atencion de emergencia ahora.",
    cautionTitle: "Se recomienda consulta medica",
    cautionMessage: "Estos sintomas deben revisarse pronto con un medico.",
    routineTitle: "Monitorear y seguir indicaciones",
    routineMessage: "No se detectaron alertas urgentes, pero sigan observando los sintomas.",
  },
  fr: {
    emergencyTitle: "Alerte urgence",
    emergencyMessage: "Certains symptomes semblent urgents. Veuillez consulter les urgences maintenant.",
    cautionTitle: "Suivi medical recommande",
    cautionMessage: "Ces symptomes devraient etre verifies par un medecin rapidement.",
    routineTitle: "Surveiller et suivre les conseils",
    routineMessage: "Aucun signal urgent detecte, mais continuez a surveiller les symptomes.",
  },
};

const URGENT_TRIAGE_PATTERNS = [
  { regex: /\b(can'?t breathe|cannot breathe|trouble breathing|struggling to breathe)\b/i, reason: "Breathing difficulty" },
  { regex: /\b(chest pain|severe chest pain)\b/i, reason: "Chest pain" },
  { regex: /\b(unconscious|passed out|not waking up)\b/i, reason: "Loss of consciousness" },
  { regex: /\b(seizure|convulsion)\b/i, reason: "Possible seizure" },
  { regex: /\b(blue lips|blue face)\b/i, reason: "Possible low oxygen signs" },
  { regex: /\b(thoughts of self harm|suicidal|want to die)\b/i, reason: "Mental health emergency signs" },
];

const WATCH_TRIAGE_PATTERNS = [
  { regex: /\b(high fever|fever over|fever for [0-9]+ days)\b/i, reason: "Persistent or high fever" },
  { regex: /\b(vomiting|diarrhea|rash|ear pain|sore throat)\b/i, reason: "Symptoms may need a doctor check" },
  { regex: /\b(headache|dizzy|fatigue|stomach pain|tummy hurts)\b/i, reason: "Common symptoms to monitor" },
];

function parsePositiveInt(value, fallback) {
  const numberValue = Number(value);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    return fallback;
  }
  return numberValue;
}

function parseAllowedOrigins(value) {
  const fromEnv = String(value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) {
    return fromEnv;
  }

  return DEFAULT_ALLOWED_ORIGINS;
}

function estimateBase64Size(base64Payload) {
  const normalized = base64Payload.replace(/\s+/g, "");
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.floor((normalized.length * 3) / 4) - padding;
}

function createDiagnosisSchema(maxFileBytes) {
  return z
    .object({
      symptoms: z.string().trim().min(3, "Please provide symptoms.").max(1500, "Symptoms are too long."),
      name: z.string().trim().max(50, "Name is too long.").optional().default(""),
      age: z.union([z.string(), z.number()]).optional().default(""),
      language: z.enum(SUPPORTED_LANGUAGES).optional().default("en"),
      readingLevel: z.enum(SUPPORTED_READING_LEVELS).optional().default("simple"),
      file: z
        .object({
          base64: z.string().min(16, "Invalid file content.").max(6_000_000, "File payload is too large."),
          mimeType: z.string().trim().min(3).max(120),
          fileName: z.string().trim().max(200).optional().default("upload"),
          isImage: z.boolean(),
        })
        .superRefine((file, ctx) => {
          const normalizedMimeType = file.mimeType.toLowerCase();
          const cleanBase64 = file.base64.replace(/\s+/g, "");
          if (!/^[A-Za-z0-9+/=]+$/.test(cleanBase64)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Uploaded file content is invalid.",
            });
          }

          if (!ALLOWED_UPLOAD_MIME_TYPES.has(normalizedMimeType)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Unsupported upload type. Use JPEG, PNG, WEBP, PDF, or TXT.",
            });
          }

          if (file.isImage && !IMAGE_MIME_TYPES.has(normalizedMimeType)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Image uploads must be JPEG, PNG, or WEBP.",
            });
          }

          const fileBytes = estimateBase64Size(cleanBase64);
          if (fileBytes > maxFileBytes) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `File is too large. Max size is ${Math.floor(maxFileBytes / (1024 * 1024))}MB.`,
            });
          }
        })
        .optional()
        .nullable(),
    })
    .superRefine((value, ctx) => {
      const normalizedAge = String(value.age ?? "").trim();
      if (!normalizedAge) {
        return;
      }

      const ageNumber = Number(normalizedAge);
      if (!Number.isInteger(ageNumber) || ageNumber < 1 || ageNumber > 18) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["age"],
          message: "Age must be a whole number from 1 to 18.",
        });
      }
    });
}

function detectTriage(symptoms, language) {
  const copy = TRIAGE_COPY[language] || TRIAGE_COPY.en;
  const urgentReasons = URGENT_TRIAGE_PATTERNS.filter((pattern) => pattern.regex.test(symptoms)).map(
    (pattern) => pattern.reason,
  );
  if (urgentReasons.length > 0) {
    return {
      level: "emergency",
      title: copy.emergencyTitle,
      message: copy.emergencyMessage,
      reasons: urgentReasons,
    };
  }

  const cautionReasons = WATCH_TRIAGE_PATTERNS.filter((pattern) => pattern.regex.test(symptoms)).map(
    (pattern) => pattern.reason,
  );
  if (cautionReasons.length > 0) {
    return {
      level: "caution",
      title: copy.cautionTitle,
      message: copy.cautionMessage,
      reasons: cautionReasons,
    };
  }

  return {
    level: "routine",
    title: copy.routineTitle,
    message: copy.routineMessage,
    reasons: [],
  };
}

function buildSystemPrompt({ childName, childAge, language, readingLevel, triageLevel }) {
  const languageName = LANGUAGE_NAMES[language] || LANGUAGE_NAMES.en;
  const readingInstruction = READING_LEVEL_PROMPTS[readingLevel] || READING_LEVEL_PROMPTS.simple;
  const emergencyInstruction =
    triageLevel === "emergency"
      ? "- Start with a direct warning to seek emergency care immediately."
      : "- If symptoms may need urgent care, clearly say so.";

  return `You are Dr. Buddy, a friendly doctor AI for children ages 4-14.
Keep your response warm, calm, and simple for ${childName} who is ${childAge}.
Rules:
- Respond in ${languageName}.
- ${readingInstruction}
- Use short clear sentences with supportive tone.
- Avoid scary language and avoid medical jargon.
- Do not provide diagnosis certainty.
- Always remind the user this is educational and they should see a real doctor for concerning symptoms.
- ${emergencyInstruction}
- Keep response under 250 words.
- Return these sections:
1. What might be happening
2. What can help at home
3. Should you see a doctor?
4. Encouragement`;
}

function buildUserContent({ symptoms, childName, childAge, language, readingLevel, file }) {
  if (file?.base64 && file.isImage) {
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: file.mimeType,
          data: file.base64,
        },
      },
      {
        type: "text",
        text: `Hi Dr. Buddy. I am ${childName}, ${childAge}. My symptoms: ${symptoms}. Preferred language: ${language}. Reading level: ${readingLevel}. Please read my lab image and explain it simply for a child.`,
      },
    ];
  }

  let text = `Hi Dr. Buddy. I am ${childName}, ${childAge}. My symptoms: ${symptoms}. Preferred language: ${language}. Reading level: ${readingLevel}.`;
  if (file?.base64 && !file.isImage) {
    text += " I uploaded a non-image file. Please provide advice from symptoms only.";
  }

  return [{ type: "text", text }];
}

function requestLogger(enabled) {
  return (req, res, next) => {
    const requestId = req.header("x-request-id") || crypto.randomUUID();
    const startedAt = process.hrtime.bigint();

    res.setHeader("x-request-id", requestId);

    if (enabled) {
      res.on("finish", () => {
        const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
        console.info(
          JSON.stringify({
            requestId,
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            durationMs: Number(elapsedMs.toFixed(1)),
            ip: req.ip,
          }),
        );
      });
    }

    next();
  };
}

export function createServerConfig(overrides = {}) {
  return {
    nodeEnv: process.env.NODE_ENV || "development",
    port: parsePositiveInt(process.env.PORT, 8787),
    model: process.env.MODEL || DEFAULT_MODEL,
    apiKey: process.env.ANTHROPIC_API_KEY || "",
    allowedOrigins: parseAllowedOrigins(process.env.CORS_ORIGIN),
    diagnoseRateLimitMax: parsePositiveInt(process.env.RATE_LIMIT_MAX, 20),
    apiRateLimitMax: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 120),
    maxFileBytes: parsePositiveInt(process.env.MAX_FILE_BYTES, 4 * 1024 * 1024),
    trustProxy: process.env.TRUST_PROXY === "true",
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== "false",
    fetchImpl: globalThis.fetch,
    ...overrides,
  };
}

function buildApp(config) {
  const app = express();
  const diagnosisSchema = createDiagnosisSchema(config.maxFileBytes);

  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(requestLogger(config.enableRequestLogging));
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(express.json({ limit: "6mb" }));

  const apiCors = cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS."));
    },
    methods: ["GET", "POST", "OPTIONS"],
  });

  app.use("/api", apiCors);

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: config.apiRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many API requests. Please try again later." },
  });

  const diagnoseLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: config.diagnoseRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many diagnosis requests. Please try again in a few minutes." },
  });

  app.use("/api", apiLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/diagnose", diagnoseLimiter, async (req, res) => {
    if (!config.apiKey) {
      res.status(500).json({
        error: "Server is missing ANTHROPIC_API_KEY. Add it to .env before using diagnose.",
      });
      return;
    }

    if (typeof config.fetchImpl !== "function") {
      res.status(500).json({ error: "Server fetch client is not configured." });
      return;
    }

    const parsed = diagnosisSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || "Invalid input payload.",
      });
      return;
    }

    const payload = parsed.data;
    const childName = payload.name || "little friend";
    const ageText = String(payload.age || "").trim();
    const childAge = ageText ? `${ageText} years old` : "a young child";
    const triage = detectTriage(payload.symptoms, payload.language);

    try {
      const anthropicResponse = await config.fetchImpl("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model,
          max_tokens: 900,
          system: buildSystemPrompt({
            childName,
            childAge,
            language: payload.language,
            readingLevel: payload.readingLevel,
            triageLevel: triage.level,
          }),
          messages: [
            {
              role: "user",
              content: buildUserContent({
                symptoms: payload.symptoms,
                childName,
                childAge,
                language: payload.language,
                readingLevel: payload.readingLevel,
                file: payload.file,
              }),
            },
          ],
        }),
      });

      const data = await anthropicResponse.json().catch(() => ({}));
      if (!anthropicResponse.ok) {
        res.status(502).json({
          error: data.error?.message || "Anthropic request failed.",
        });
        return;
      }

      const text = Array.isArray(data.content)
        ? data.content
            .map((block) => (block.type === "text" ? block.text : ""))
            .join("\n")
            .trim()
        : "";

      if (!text) {
        res.status(502).json({ error: "No diagnosis response was returned by the model." });
        return;
      }

      res.json({
        result: text,
        triage,
        handoff: {
          createdAt: new Date().toISOString(),
          childName,
          childAge,
          symptoms: payload.symptoms,
          language: payload.language,
          readingLevel: payload.readingLevel,
        },
      });
    } catch {
      res.status(502).json({ error: "Could not reach AI provider. Please try again." });
    }
  });

  if (config.nodeEnv === "production") {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const distPath = path.join(__dirname, "..", "dist");

    app.use(express.static(distPath));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        next();
        return;
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((error, _req, res, _next) => {
    if (error?.message?.includes("CORS")) {
      res.status(403).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Unexpected server error." });
  });

  return app;
}

export function createApp(overrides = {}) {
  const config = createServerConfig(overrides);
  return buildApp(config);
}

export function startServer(overrides = {}) {
  const config = createServerConfig(overrides);
  const app = buildApp(config);

  return app.listen(config.port, () => {
    console.log(`KidDoc server listening on port ${config.port}`);
  });
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  startServer();
}
