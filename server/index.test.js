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

  it("returns 500 when API key is missing", async () => {
    const app = createApp({
      apiKey: "",
      enableRequestLogging: false,
      apiRateLimitMax: 1000,
      diagnoseRateLimitMax: 1000,
    });

    const response = await request(app).post("/api/diagnose").send({ symptoms: "headache" });

    expect(response.status).toBe(500);
    expect(response.body.error).toMatch(/missing ANTHROPIC_API_KEY/i);
  });

  it("rejects unsupported upload mime types", async () => {
    const fetchMock = vi.fn();
    const app = createApp({
      apiKey: "test-key",
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
      apiKey: "test-key",
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

  it("adds triage metadata and applies language and reading level to prompt", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Please seek emergency help immediately." }],
      }),
    });

    const app = createApp({
      apiKey: "test-key",
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
    expect(response.body.triage.level).toBe("emergency");
    expect(response.body.triage.reasons.length).toBeGreaterThan(0);
    expect(response.body.handoff.language).toBe("es");
    expect(response.body.handoff.readingLevel).toBe("very_simple");

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.system).toMatch(/Spanish/i);
    expect(callBody.system).toMatch(/very short sentences/i);
  });

  it("returns model output on successful diagnosis", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        content: [{ type: "text", text: "Drink water and rest." }],
      }),
    });

    const app = createApp({
      apiKey: "test-key",
      fetchImpl: fetchMock,
      enableRequestLogging: false,
      apiRateLimitMax: 1000,
      diagnoseRateLimitMax: 1000,
    });

    const response = await request(app)
      .post("/api/diagnose")
      .send({ symptoms: "mild headache", name: "Mia", age: "8" });

    expect(response.status).toBe(200);
    expect(response.body.result).toContain("Drink water and rest.");
    expect(response.body.triage).toBeTruthy();
    expect(response.body.handoff).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
