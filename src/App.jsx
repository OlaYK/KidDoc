import { useRef, useState } from "react";

const MAX_UPLOAD_MB = 4;
const IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const SUPPORTED_UPLOAD_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, "application/pdf", "text/plain"]);
const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];
const READING_LEVEL_OPTIONS = [
  { value: "very_simple", label: "Very Simple" },
  { value: "simple", label: "Simple" },
  { value: "detailed", label: "Detailed" },
];

const THEMES = {
  pink: {
    name: "Pinky",
    bg: "linear-gradient(135deg, #ffb6d9 0%, #ff8ec8 45%, #ffd6ec 100%)",
    card: "rgba(255,255,255,0.9)",
    primary: "#ff2f90",
    text: "#7a0046",
    bubble: "#fff0f8",
    border: "#ffb6d9",
    btn: "linear-gradient(135deg, #ff4ca3, #d91574)",
    btnText: "#fff",
    shadow: "rgba(255, 76, 163, 0.28)",
  },
  sky: {
    name: "Sky",
    bg: "linear-gradient(135deg, #cae9ff 0%, #8cc9ff 45%, #e7f4ff 100%)",
    card: "rgba(255,255,255,0.9)",
    primary: "#1f74d9",
    text: "#0f3f7e",
    bubble: "#edf6ff",
    border: "#b4dbff",
    btn: "linear-gradient(135deg, #3d92f3, #1761c0)",
    btnText: "#fff",
    shadow: "rgba(31, 116, 217, 0.24)",
  },
  mint: {
    name: "Mint",
    bg: "linear-gradient(135deg, #c9f2db 0%, #8ce3b5 45%, #e9fff2 100%)",
    card: "rgba(255,255,255,0.9)",
    primary: "#177a46",
    text: "#145933",
    bubble: "#edfff4",
    border: "#b4ebca",
    btn: "linear-gradient(135deg, #35a568, #167543)",
    btnText: "#fff",
    shadow: "rgba(23, 122, 70, 0.24)",
  },
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read the file."));
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function defaultHandoff({ name, age, symptoms, language, readingLevel }) {
  return {
    createdAt: new Date().toISOString(),
    childName: name || "little friend",
    childAge: age ? `${age} years old` : "a young child",
    symptoms,
    language,
    readingLevel,
  };
}

function triageStyle(level) {
  if (level === "emergency") {
    return {
      background: "rgba(255, 82, 82, 0.2)",
      border: "2px solid #c62828",
      color: "#6d0c0c",
    };
  }

  if (level === "caution") {
    return {
      background: "rgba(255, 193, 7, 0.2)",
      border: "2px solid #f57c00",
      color: "#7a4300",
    };
  }

  return {
    background: "rgba(76, 175, 80, 0.2)",
    border: "2px solid #2e7d32",
    color: "#165519",
  };
}

export default function App() {
  const [themeName, setThemeName] = useState("pink");
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [language, setLanguage] = useState("en");
  const [readingLevel, setReadingLevel] = useState("simple");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [triage, setTriage] = useState(null);
  const [handoff, setHandoff] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  const theme = THEMES[themeName];

  const cardStyle = {
    background: theme.card,
    borderRadius: "22px",
    padding: "20px",
    marginBottom: "14px",
    border: `2px solid ${theme.border}`,
    boxShadow: `0 8px 26px ${theme.shadow}`,
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: `2px solid ${theme.border}`,
    background: theme.bubble,
    color: theme.text,
    fontSize: "1rem",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const buttonStyle = {
    background: theme.btn,
    color: theme.btnText,
    border: "none",
    borderRadius: "999px",
    padding: "14px 26px",
    fontWeight: 800,
    fontSize: "1rem",
    cursor: "pointer",
    boxShadow: `0 8px 20px ${theme.shadow}`,
    transform: loading ? "scale(0.98)" : "scale(1)",
    transition: "transform .2s ease",
  };

  const clearUpload = () => {
    setUploadedFile(null);
    setFilePreview(null);
    setFileBase64(null);
    setIsImage(false);
    if (fileRef.current) {
      fileRef.current.value = "";
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const mimeType = String(file.type || "").toLowerCase();
    if (!SUPPORTED_UPLOAD_MIME_TYPES.has(mimeType)) {
      setError("Unsupported file type. Please upload JPEG, PNG, WEBP, PDF, or TXT.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setError(`File is too large. Please upload a file under ${MAX_UPLOAD_MB}MB.`);
      event.target.value = "";
      return;
    }

    setError(null);
    setUploadedFile(file);
    const imageFile = IMAGE_MIME_TYPES.has(mimeType);
    setIsImage(imageFile);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const base64 = typeof dataUrl === "string" ? dataUrl.split(",")[1] : null;
      setFileBase64(base64 || null);
      setFilePreview(imageFile ? dataUrl : null);
    } catch {
      clearUpload();
      setError("Could not read the uploaded file. Please try a different file.");
    }
  };

  const runDiagnosis = async () => {
    if (!symptoms.trim()) {
      setError("Please tell me how you're feeling first.");
      return;
    }

    if (age && (Number(age) < 1 || Number(age) > 18)) {
      setError("Age must be between 1 and 18.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setTriage(null);
    setHandoff(null);

    try {
      const payload = {
        symptoms: symptoms.trim(),
        name: name.trim(),
        age: age.trim(),
        language,
        readingLevel,
      };

      if (fileBase64 && uploadedFile) {
        payload.file = {
          base64: fileBase64,
          mimeType: uploadedFile.type || "application/octet-stream",
          fileName: uploadedFile.name,
          isImage,
        };
      }

      const response = await fetch("/api/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "The diagnosis request failed. Please try again.");
      }

      setResult(data.result || "No response was returned. Please try again.");
      setTriage(data.triage || null);
      setHandoff(data.handoff || defaultHandoff({ name: name.trim(), age: age.trim(), symptoms: symptoms.trim(), language, readingLevel }));
    } catch (requestError) {
      setError(requestError.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setTriage(null);
    setHandoff(null);
    setSymptoms("");
    clearUpload();
    setError(null);
  };

  const printSummary = () => {
    if (!result || !handoff) {
      setError("No summary available to print yet.");
      return;
    }

    const popup = window.open("", "kiddoc-summary", "width=900,height=700");
    if (!popup) {
      setError("Pop-up blocked. Please allow pop-ups to print the summary.");
      return;
    }

    const languageLabel = LANGUAGE_OPTIONS.find((option) => option.value === handoff.language)?.label || "English";
    const readingLabel = READING_LEVEL_OPTIONS.find((option) => option.value === handoff.readingLevel)?.label || "Simple";
    const triageReasons = (triage?.reasons || []).map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");

    popup.document.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>KidDoc Doctor Handoff Summary</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
      h1, h2 { margin: 0 0 12px; }
      .muted { color: #666; font-size: 12px; margin-bottom: 16px; }
      .card { border: 1px solid #ddd; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
      ul { margin: 8px 0 0 18px; }
      pre { white-space: pre-wrap; line-height: 1.45; margin: 0; }
      .disclaimer { font-size: 12px; color: #8a5200; background: #fff4dd; border: 1px solid #f1cc8c; }
    </style>
  </head>
  <body>
    <h1>KidDoc Doctor Handoff Summary</h1>
    <p class="muted">Generated ${escapeHtml(new Date(handoff.createdAt || Date.now()).toLocaleString())}</p>

    <div class="card">
      <h2>Child Details</h2>
      <p><strong>Name:</strong> ${escapeHtml(handoff.childName || "Not provided")}</p>
      <p><strong>Age:</strong> ${escapeHtml(handoff.childAge || "Not provided")}</p>
      <p><strong>Language:</strong> ${escapeHtml(languageLabel)}</p>
      <p><strong>Reading Level:</strong> ${escapeHtml(readingLabel)}</p>
    </div>

    <div class="card">
      <h2>Reported Symptoms</h2>
      <pre>${escapeHtml(handoff.symptoms || "")}</pre>
    </div>

    <div class="card">
      <h2>Triage Summary</h2>
      <p><strong>Level:</strong> ${escapeHtml(String(triage?.level || "routine").toUpperCase())}</p>
      <p><strong>Guidance:</strong> ${escapeHtml(triage?.message || "No triage message available.")}</p>
      ${triageReasons ? `<p><strong>Matched Signals:</strong></p><ul>${triageReasons}</ul>` : ""}
    </div>

    <div class="card">
      <h2>AI Health Explanation</h2>
      <pre>${escapeHtml(result)}</pre>
    </div>

    <div class="card disclaimer">
      This report is educational and is not a medical diagnosis. Seek a licensed clinician for medical care.
    </div>
  </body>
</html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        fontFamily: "'Nunito', 'Trebuchet MS', sans-serif",
        color: theme.text,
        transition: "background .4s ease",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        button:hover { filter: brightness(1.04); }
      `}</style>

      <div style={{ maxWidth: "620px", margin: "0 auto", padding: "20px 14px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ margin: "0 0 6px", fontSize: "2rem", fontWeight: 900 }}>MediKids</h1>
          <p style={{ margin: 0, fontWeight: 700 }}>Friendly symptom support for kids and caregivers</p>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong>Theme</strong>
            <button
              type="button"
              onClick={() => setShowThemePicker((open) => !open)}
              style={{
                background: theme.btn,
                color: theme.btnText,
                border: "none",
                borderRadius: "999px",
                padding: "8px 14px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {showThemePicker ? "Close" : THEMES[themeName].name}
            </button>
          </div>
          {showThemePicker && (
            <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {Object.entries(THEMES).map(([key, option]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setThemeName(key);
                    setShowThemePicker(false);
                  }}
                  style={{
                    background: option.btn,
                    color: option.btnText,
                    border: key === themeName ? "3px solid #222" : "3px solid transparent",
                    borderRadius: "999px",
                    padding: "8px 14px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {option.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {!result ? (
          <>
            <div style={cardStyle}>
              <p style={{ margin: "0 0 12px", fontWeight: 800 }}>Tell me about your child</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label htmlFor="child-name" style={{ display: "block", marginBottom: "6px", fontWeight: 700 }}>
                    Name
                  </label>
                  <input
                    id="child-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Emma"
                    style={inputStyle}
                    maxLength={50}
                  />
                </div>
                <div>
                  <label htmlFor="child-age" style={{ display: "block", marginBottom: "6px", fontWeight: 700 }}>
                    Age
                  </label>
                  <input
                    id="child-age"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    placeholder="e.g. 8"
                    type="number"
                    min="1"
                    max="18"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: "0 0 12px", fontWeight: 800 }}>Response Settings</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label htmlFor="response-language" style={{ display: "block", marginBottom: "6px", fontWeight: 700 }}>
                    Language
                  </label>
                  <select
                    id="response-language"
                    value={language}
                    onChange={(event) => setLanguage(event.target.value)}
                    style={inputStyle}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="reading-level" style={{ display: "block", marginBottom: "6px", fontWeight: 700 }}>
                    Reading Level
                  </label>
                  <select
                    id="reading-level"
                    value={readingLevel}
                    onChange={(event) => setReadingLevel(event.target.value)}
                    style={inputStyle}
                  >
                    {READING_LEVEL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div style={cardStyle}>
              <p style={{ margin: "0 0 12px", fontWeight: 800 }}>How are you feeling?</p>
              <textarea
                value={symptoms}
                onChange={(event) => setSymptoms(event.target.value)}
                placeholder="Tell Dr. Buddy everything. Example: my tummy hurts and I feel warm."
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: "1.5" }}
                maxLength={1500}
              />
            </div>

            <div style={cardStyle}>
              <p style={{ margin: "0 0 12px", fontWeight: 800 }}>Upload Lab Report (Optional)</p>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileRef.current?.click();
                  }
                }}
                style={{
                  border: `2px dashed ${theme.primary}`,
                  borderRadius: "14px",
                  padding: "18px",
                  textAlign: "center",
                  background: theme.bubble,
                  cursor: "pointer",
                }}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                {uploadedFile ? (
                  <>
                    {filePreview && (
                      <img
                        src={filePreview}
                        alt="Uploaded lab report preview"
                        style={{ maxWidth: "100%", maxHeight: "190px", borderRadius: "10px", marginBottom: "8px" }}
                      />
                    )}
                    <p style={{ margin: "0 0 6px", fontWeight: 700 }}>Uploaded: {uploadedFile.name}</p>
                    <p style={{ margin: "0 0 8px" }}>{isImage ? "Image uploaded. AI can read this file." : "File uploaded."}</p>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        clearUpload();
                      }}
                      style={{
                        border: `1px solid ${theme.primary}`,
                        background: "transparent",
                        color: theme.primary,
                        borderRadius: "999px",
                        padding: "6px 10px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Remove File
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ margin: "0 0 4px", fontWeight: 700 }}>Tap to upload a lab report</p>
                    <p style={{ margin: 0, fontSize: "0.86rem", opacity: 0.75 }}>Images, PDF, or TXT. Max {MAX_UPLOAD_MB}MB.</p>
                  </>
                )}
              </div>
            </div>

            {error && (
              <div style={{ ...cardStyle, background: "rgba(255, 82, 82, 0.15)", border: "2px solid #ff5b5b" }}>
                <p style={{ margin: 0, color: "#b10f0f", fontWeight: 700 }}>{error}</p>
              </div>
            )}

            <div style={{ textAlign: "center" }}>
              <button className="big-btn" type="button" onClick={runDiagnosis} disabled={loading} style={buttonStyle}>
                {loading ? "Checking..." : name.trim() ? `Check ${name.trim()}'s Health` : "Check My Health"}
              </button>
              <p style={{ margin: "8px 0 0", fontSize: "0.75rem", opacity: 0.65 }}>
                Educational use only. Always seek real medical care for concerning symptoms.
              </p>
            </div>
          </>
        ) : (
          <div>
            {triage && (
              <div style={{ ...cardStyle, ...triageStyle(triage.level) }}>
                <p style={{ margin: "0 0 6px", fontWeight: 800 }}>{triage.title || "Triage"}</p>
                <p style={{ margin: 0, fontWeight: 700 }}>{triage.message}</p>
                {triage.reasons?.length > 0 && (
                  <ul style={{ margin: "8px 0 0", paddingLeft: "20px" }}>
                    {triage.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div style={{ ...cardStyle, border: `3px solid ${theme.primary}` }}>
              <h2 style={{ margin: "0 0 10px", fontSize: "1.3rem" }}>Health Report</h2>
              <p style={{ margin: "0 0 10px", fontWeight: 700 }}>
                Language: {LANGUAGE_OPTIONS.find((option) => option.value === language)?.label || "English"} | Reading Level: {" "}
                {READING_LEVEL_OPTIONS.find((option) => option.value === readingLevel)?.label || "Simple"}
              </p>
              <div
                style={{
                  background: theme.bubble,
                  borderRadius: "12px",
                  padding: "16px",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.6",
                  fontWeight: 600,
                }}
              >
                {result}
              </div>
            </div>

            <div style={{ ...cardStyle, background: "rgba(255, 205, 90, 0.22)", border: "2px solid #ffb53a" }}>
              <p style={{ margin: 0, fontWeight: 700 }}>
                Reminder: This tool is educational only and is not a medical diagnosis.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", justifyContent: "center" }}>
              <button type="button" style={buttonStyle} onClick={printSummary}>
                Print Summary For Doctor
              </button>
              <button type="button" style={buttonStyle} onClick={reset}>
                Check Again
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", margin: "18px 0 4px", fontSize: "0.75rem", opacity: 0.6 }}>
          MediKids | Powered by AI | Built for child-friendly education
        </p>
      </div>
    </div>
  );
}