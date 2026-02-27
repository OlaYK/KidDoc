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
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";
const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const PROVIDER_PRIORITY = ["gemini", "groq", "anthropic"];
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

function buildUserText({ symptoms, childName, childAge, language, readingLevel, file }) {
  let text = `Hi Dr. Buddy. I am ${childName}, ${childAge}. My symptoms: ${symptoms}. Preferred language: ${language}. Reading level: ${readingLevel}.`;
  if (file?.base64 && file.isImage) {
    text += " I uploaded a lab image. Please read and explain it simply for a child.";
  } else if (file?.base64 && !file.isImage) {
    text += " I uploaded a non-image file. Please provide advice from symptoms only.";
  }
  return text;
}

function buildAnthropicUserContent({ text, file }) {
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
      { type: "text", text },
    ];
  }
  return [{ type: "text", text }];
}

async function parseJsonSafe(response) {
  return response.json().catch(() => ({}));
}

function extractGeminiText(data) {
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("\n")
      .trim() || ""
  );
}

function extractGroqText(data) {
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
  }
  return "";
}

function extractAnthropicText(data) {
  return Array.isArray(data?.content)
    ? data.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("\n")
        .trim()
    : "";
}

async function requestGeminiDiagnosis({ config, systemPrompt, userText, file }) {
  const parts = [{ text: userText }];
  if (file?.base64 && file.isImage) {
    parts.unshift({
      inline_data: {
        mime_type: file.mimeType,
        data: file.base64,
      },
    });
  }

  const response = await config.fetchImpl(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.geminiModel)}:generateContent?key=${encodeURIComponent(config.geminiApiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [{ role: "user", parts }],
        generationConfig: {
          maxOutputTokens: 900,
          temperature: 0.4,
        },
      }),
    },
  );

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const message = data?.error?.message || "Gemini request failed.";
    throw new Error(message);
  }

  const text = extractGeminiText(data);
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }
  return text;
}

async function requestGroqDiagnosis({ config, systemPrompt, userText, file }) {
  const content = [{ type: "text", text: userText }];
  if (file?.base64 && file.isImage) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${file.mimeType};base64,${file.base64}` },
    });
  }

  const response = await config.fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.groqApiKey}`,
    },
    body: JSON.stringify({
      model: config.groqModel,
      max_tokens: 900,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
    }),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const message = data?.error?.message || data?.error || "Groq request failed.";
    throw new Error(message);
  }

  const text = extractGroqText(data);
  if (!text) {
    throw new Error("Groq returned an empty response.");
  }
  return text;
}

async function requestAnthropicDiagnosis({ config, systemPrompt, userText, file }) {
  const response = await config.fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.anthropicApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: 900,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: buildAnthropicUserContent({ text: userText, file }),
        },
      ],
    }),
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const message = data?.error?.message || "Anthropic request failed.";
    throw new Error(message);
  }

  const text = extractAnthropicText(data);
  if (!text) {
    throw new Error("Anthropic returned an empty response.");
  }
  return text;
}

async function requestWithFallback({ config, systemPrompt, userText, file }) {
  const providers = [
    {
      name: "gemini",
      enabled: Boolean(config.geminiApiKey),
      request: () => requestGeminiDiagnosis({ config, systemPrompt, userText, file }),
    },
    {
      name: "groq",
      enabled: Boolean(config.groqApiKey),
      request: () => requestGroqDiagnosis({ config, systemPrompt, userText, file }),
    },
    {
      name: "anthropic",
      enabled: Boolean(config.anthropicApiKey),
      request: () => requestAnthropicDiagnosis({ config, systemPrompt, userText, file }),
    },
  ];

  const enabledProviders = providers.filter((provider) => provider.enabled);
  if (enabledProviders.length === 0) {
    throw new Error("No AI provider key configured.");
  }

  const errors = [];
  for (const providerName of PROVIDER_PRIORITY) {
    const provider = enabledProviders.find((entry) => entry.name === providerName);
    if (!provider) {
      continue;
    }
    try {
      const text = await provider.request();
      return { provider: provider.name, text };
    } catch (error) {
      errors.push(`${provider.name}: ${error.message || "failed"}`);
    }
  }

  throw new Error(`All providers failed. ${errors.join(" | ")}`);
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
  const resolved = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: parsePositiveInt(process.env.PORT, 8787),
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    groqApiKey: process.env.GROQ_API_KEY || "",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    groqModel: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    anthropicModel: process.env.ANTHROPIC_MODEL || process.env.MODEL || DEFAULT_ANTHROPIC_MODEL,
    allowedOrigins: parseAllowedOrigins(process.env.CORS_ORIGIN),
    diagnoseRateLimitMax: parsePositiveInt(process.env.RATE_LIMIT_MAX, 20),
    apiRateLimitMax: parsePositiveInt(process.env.API_RATE_LIMIT_MAX, 120),
    maxFileBytes: parsePositiveInt(process.env.MAX_FILE_BYTES, 4 * 1024 * 1024),
    trustProxy: process.env.TRUST_PROXY === "true",
    enableRequestLogging: process.env.ENABLE_REQUEST_LOGGING !== "false",
    fetchImpl: globalThis.fetch,
    ...overrides,
  };

  if (resolved.apiKey && !resolved.anthropicApiKey) {
    resolved.anthropicApiKey = resolved.apiKey;
  }

  return resolved;
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
    if (!config.geminiApiKey && !config.groqApiKey && !config.anthropicApiKey) {
      res.status(500).json({
        error: "Server is missing provider keys. Configure GEMINI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY.",
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
    const systemPrompt = buildSystemPrompt({
      childName,
      childAge,
      language: payload.language,
      readingLevel: payload.readingLevel,
      triageLevel: triage.level,
    });
    const userText = buildUserText({
      symptoms: payload.symptoms,
      childName,
      childAge,
      language: payload.language,
      readingLevel: payload.readingLevel,
      file: payload.file,
    });

    try {
      const diagnosis = await requestWithFallback({
        config,
        systemPrompt,
        userText,
        file: payload.file,
      });

      res.json({
        result: diagnosis.text,
        provider: diagnosis.provider,
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
    } catch (error) {
      res.status(502).json({ error: error.message || "Could not reach AI provider. Please try again." });
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
