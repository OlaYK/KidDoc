import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "./index.js";

describe("server api", () => {
  it("returns health status", async () => {
    const app = createApp({
      enableRequestLogging: false,
      apiRateLimitMax: 1000,
      diagnoseRateLimitMax: 1000,
    });

    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.timestamp).toBeTypeOf("string");
  });

  it("returns 500 when no provider keys are configured", async () => {
    const app = createApp({
      geminiApiKey: "",
      groqApiKey: "",
      anthropicApiKey: "",
      enableRequestLogging: false,
      apiRateLimitMax: 1000,
      diagnoseRateLimitMax: 1000,
    });

    const response = await request(app).post("/api/diagnose").send({ symptoms: "headache" });

    expect(response.status).toBe(500);
    expect(response.body.error).toMatch(/missing provider keys/i);
  });

  it("rejects unsupported upload mime types", async () => {
    const fetchMock = vi.fn();
    const app = createApp({
      geminiApiKey: "test-key",
      fetchImpl: fetchMock,
      enableRequestLogging: false,
      apiRateLimitMax: 1000,
      diagnoseRateLimitMax: 1000,
    });

    const response = await request(app)
      .post("/api/diagnose")
      .send({
        symptoms: "headache",
        file: {
          base64: "aGVsbG8gd29ybGQ=",
          mimeType: "application/x-msdownload",
          fileName: "bad.exe",
          isImage: false,
        },
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/unsupported upload type/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects unsupported language values", async () => {
    const app = createApp({
      geminiApiKey: "test-key",
      fetchImpl: vi.fn(),
      enableRequestLogging: false,
      apiRateLimitMax: 1000,
      diagnoseRateLimitMax: 1000,
    });

    const response = await request(app).post("/api/diagnose").send({
      symptoms: "headache",
      language: "de",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/invalid enum value/i);
  });

  it("uses anthropic when only anthropic key is configured", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Please seek emergency help immediately." }],
      }),
    });

    const app = createApp({
      anthropicApiKey: "test-key",
      fetchImpl: fetchMock,
      enableRequestLogging: false,
      apiRateLimitMax: 1000,
      diagnoseRateLimitMax: 1000,
    });

    const response = await request(app).post("/api/diagnose").send({
      symptoms: "My child can't breathe and has chest pain",
      language: "es",
      readingLevel: "very_simple",
    });

    expect(response.status).toBe(200);
    expect(response.body.provider).toBe("anthropic");
    expect(response.body.triage.level).toBe("emergency");

    const callUrl = fetchMock.mock.calls[0][0];
    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callUrl).toContain("api.anthropic.com/v1/messages");
    expect(callBody.system).toMatch(/Respond in Spanish/i);
    expect(callBody.system).toMatch(/very short sentences/i);
  });

  it("falls back from gemini to groq when gemini fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: { message: "gemini unavailable" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Groq fallback response" } }],
        }),
      });

    const app = createApp({
      geminiApiKey: "gem-key",
      groqApiKey: "groq-key",
      anthropicApiKey: "anth-key",
      fetchImpl: fetchMock,
      enableRequestLogging: false,
      apiRateLimitMax: 1000,
      diagnoseRateLimitMax: 1000,
    });

    const response = await request(app).post("/api/diagnose").send({ symptoms: "mild headache" });

    expect(response.status).toBe(200);
    expect(response.body.provider).toBe("groq");
    expect(response.body.result).toContain("Groq fallback response");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toContain("generativelanguage.googleapis.com");
    expect(fetchMock.mock.calls[1][0]).toContain("api.groq.com/openai/v1/chat/completions");
  });

  it("uses gemini first when it succeeds", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "Gemini primary response" }],
            },
          },
        ],
      }),
    });

    const app = createApp({
      geminiApiKey: "gem-key",
      groqApiKey: "groq-key",
      anthropicApiKey: "anth-key",
      fetchImpl: fetchMock,
      enableRequestLogging: false,
      apiRateLimitMax: 1000,
      diagnoseRateLimitMax: 1000,
    });

    const response = await request(app).post("/api/diagnose").send({ symptoms: "mild headache" });

    expect(response.status).toBe(200);
    expect(response.body.provider).toBe("gemini");
    expect(response.body.result).toContain("Gemini primary response");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("generativelanguage.googleapis.com");
  });
});