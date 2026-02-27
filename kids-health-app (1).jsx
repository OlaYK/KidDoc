import { useState, useRef, useEffect } from "react";

const THEMES = {
  pink: {
    name: "🌸 Pinky",
    bg: "linear-gradient(135deg, #FFB6D9 0%, #FF8EC8 40%, #FFD6EC 100%)",
    card: "rgba(255,255,255,0.85)",
    primary: "#FF69B4",
    secondary: "#FF1493",
    accent: "#FFB6D9",
    text: "#8B0057",
    bubble: "#FFF0F8",
    btn: "linear-gradient(135deg, #FF69B4, #FF1493)",
    btnText: "#fff",
    shadow: "rgba(255,105,180,0.3)",
    star: "⭐",
    emoji: "🌸",
  },
  blue: {
    name: "💙 Ocean",
    bg: "linear-gradient(135deg, #A8D8FF 0%, #5BB8FF 40%, #C8E8FF 100%)",
    card: "rgba(255,255,255,0.85)",
    primary: "#2196F3",
    secondary: "#0D47A1",
    accent: "#BBDEFB",
    text: "#0D47A1",
    bubble: "#E3F2FD",
    btn: "linear-gradient(135deg, #42A5F5, #1565C0)",
    btnText: "#fff",
    shadow: "rgba(33,150,243,0.3)",
    star: "⭐",
    emoji: "💙",
  },
  gold: {
    name: "✨ Golden",
    bg: "linear-gradient(135deg, #FFE57F 0%, #FFD700 40%, #FFF5CC 100%)",
    card: "rgba(255,255,255,0.88)",
    primary: "#F9A825",
    secondary: "#E65100",
    accent: "#FFF9C4",
    text: "#7B4F00",
    bubble: "#FFFDE7",
    btn: "linear-gradient(135deg, #FFD700, #F57F17)",
    btnText: "#fff",
    shadow: "rgba(249,168,37,0.35)",
    star: "🌟",
    emoji: "✨",
  },
  purple: {
    name: "💜 Dreamy",
    bg: "linear-gradient(135deg, #CE93D8 0%, #9C27B0 40%, #E8C8F0 100%)",
    card: "rgba(255,255,255,0.85)",
    primary: "#9C27B0",
    secondary: "#4A148C",
    accent: "#E1BEE7",
    text: "#4A148C",
    bubble: "#F3E5F5",
    btn: "linear-gradient(135deg, #AB47BC, #6A1B9A)",
    btnText: "#fff",
    shadow: "rgba(156,39,176,0.3)",
    star: "⭐",
    emoji: "💜",
  },
  green: {
    name: "🌿 Jungle",
    bg: "linear-gradient(135deg, #A8E6CF 0%, #56C596 40%, #D4F5E2 100%)",
    card: "rgba(255,255,255,0.85)",
    primary: "#2E7D32",
    secondary: "#1B5E20",
    accent: "#C8E6C9",
    text: "#1B5E20",
    bubble: "#E8F5E9",
    btn: "linear-gradient(135deg, #66BB6A, #2E7D32)",
    btnText: "#fff",
    shadow: "rgba(46,125,50,0.3)",
    star: "🍀",
    emoji: "🌿",
  },
  black: {
    name: "🌙 Midnight",
    bg: "linear-gradient(135deg, #2D2D2D 0%, #1A1A2E 40%, #16213E 100%)",
    card: "rgba(255,255,255,0.08)",
    primary: "#BB86FC",
    secondary: "#03DAC6",
    accent: "#37474F",
    text: "#E0E0E0",
    bubble: "rgba(255,255,255,0.06)",
    btn: "linear-gradient(135deg, #BB86FC, #7C4DFF)",
    btnText: "#fff",
    shadow: "rgba(187,134,252,0.3)",
    star: "⭐",
    emoji: "🌙",
  },
  white: {
    name: "🤍 Cloud",
    bg: "linear-gradient(135deg, #FAFAFA 0%, #F0F4FF 50%, #FFFFFF 100%)",
    card: "rgba(255,255,255,0.95)",
    primary: "#5C6BC0",
    secondary: "#3949AB",
    accent: "#E8EAF6",
    text: "#283593",
    bubble: "#F5F5F5",
    btn: "linear-gradient(135deg, #7986CB, #3949AB)",
    btnText: "#fff",
    shadow: "rgba(92,107,192,0.25)",
    star: "⭐",
    emoji: "☁️",
  },
  red: {
    name: "❤️ Fiery",
    bg: "linear-gradient(135deg, #FFAB91 0%, #FF5722 40%, #FFD0B5 100%)",
    card: "rgba(255,255,255,0.88)",
    primary: "#E53935",
    secondary: "#B71C1C",
    accent: "#FFCDD2",
    text: "#7F0000",
    bubble: "#FFF3E0",
    btn: "linear-gradient(135deg, #EF5350, #B71C1C)",
    btnText: "#fff",
    shadow: "rgba(229,57,53,0.3)",
    star: "💫",
    emoji: "❤️",
  },
};

const MASCOTS = {
  doctor: { emoji: "👨‍⚕️", name: "Dr. Buddy", msg: "Hi friend! Tell me how you feel!" },
  robot: { emoji: "🤖", name: "MediBot", msg: "Beep boop! I'm here to help!" },
  bear: { emoji: "🐻", name: "Dr. Bear", msg: "Don't worry! I'll help you feel better!" },
  unicorn: { emoji: "🦄", name: "Uni-Doc", msg: "Magic medicine powers, activate!" },
};

const FloatingBubble = ({ style, emoji }) => (
  <div style={{
    position: "absolute",
    fontSize: "1.5rem",
    opacity: 0.3,
    animation: "floatUp 6s ease-in-out infinite",
    ...style,
  }}>{emoji}</div>
);

const StarRain = ({ theme }) => {
  const stars = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {stars.map(i => (
        <div key={i} style={{
          position: "absolute",
          left: `${(i * 8.3) % 100}%`,
          top: "-50px",
          fontSize: `${0.8 + (i % 3) * 0.4}rem`,
          animation: `starFall ${3 + (i % 4)}s linear infinite`,
          animationDelay: `${(i * 0.5) % 5}s`,
          opacity: 0.5,
        }}>{theme.star}</div>
      ))}
    </div>
  );
};

export default function KidsHealthApp() {
  const [themeName, setThemeName] = useState("pink");
  const [mascotKey, setMascotKey] = useState("doctor");
  const [symptoms, setSymptoms] = useState("");
  const [age, setAge] = useState("");
  const [name, setName] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [fileBase64, setFileBase64] = useState(null);
  const [isImage, setIsImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [mascotBounce, setMascotBounce] = useState(false);
  const fileRef = useRef();

  const theme = THEMES[themeName];
  const mascot = MASCOTS[mascotKey];

  useEffect(() => {
    const interval = setInterval(() => {
      setMascotBounce(b => !b);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadedFile(file);
    const isImg = file.type.startsWith("image/");
    setIsImage(isImg);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      if (isImg) setFilePreview(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setFileBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const runDiagnosis = async () => {
    if (!symptoms.trim()) {
      setError("Please tell me how you're feeling first! 😊");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const childName = name.trim() || "little friend";
      const childAge = age.trim() ? `${age} years old` : "a young child";

      const systemPrompt = `You are Dr. Buddy, a friendly and kind doctor AI for kids! 
Your job is to help children aged 4-14 understand their health.
ALWAYS respond in a way that is:
- Super simple and easy to understand for a ${childAge} named ${childName}
- Warm, encouraging, and NOT scary
- Use lots of friendly emojis
- Use short sentences
- Avoid medical jargon — explain things like you're talking to a child
- Structure your response in these sections:
  1. 🌟 What might be happening (simple explanation)
  2. 🍎 What can help (simple home remedies or actions)
  3. 🏥 Should you see a real doctor? (Yes/No/Maybe with reason)
  4. 💪 A fun encouragement message for the child
- If there's a lab report image, read all the values and explain them simply
- IMPORTANT: You are NOT replacing a real doctor. Always remind them to visit a real doctor for serious things.
- Keep the total response under 250 words`;

      const userContent = [];

      if (fileBase64 && isImage) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: uploadedFile.type, data: fileBase64 }
        });
        userContent.push({
          type: "text",
          text: `Hi Dr. Buddy! I'm ${childName} and I'm ${childAge}. ${symptoms.trim() ? `My symptoms are: ${symptoms}. ` : ""}Please read my lab report from the image above and explain what it means in a simple and friendly way for a kid!`
        });
      } else {
        let textContent = `Hi Dr. Buddy! I'm ${childName} and I'm ${childAge}. My symptoms are: ${symptoms}`;
        if (fileBase64 && !isImage) {
          textContent += `\n\nHere is text from my uploaded file: [File uploaded but it's a non-image file, please advise based on symptoms only]`;
        }
        userContent.push({ type: "text", text: textContent });
      }

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map(b => b.text || "").join("\n") || "Hmm, I couldn't get a response. Please try again!";
      setResult(text);
    } catch (err) {
      setError("Oops! Something went wrong. Please try again! 🙈");
    }
    setLoading(false);
  };

  const reset = () => {
    setResult(null);
    setSymptoms("");
    setUploadedFile(null);
    setFilePreview(null);
    setFileBase64(null);
    setIsImage(false);
    setError(null);
  };

  const cardStyle = {
    background: theme.card,
    backdropFilter: "blur(12px)",
    borderRadius: "24px",
    padding: "24px",
    marginBottom: "16px",
    boxShadow: `0 8px 32px ${theme.shadow}`,
    border: `2px solid ${theme.accent}`,
    position: "relative",
    zIndex: 1,
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "16px",
    border: `2px solid ${theme.accent}`,
    background: theme.bubble,
    color: theme.text,
    fontSize: "1rem",
    fontFamily: "'Nunito', 'Comic Sans MS', cursive",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  const btnStyle = {
    background: theme.btn,
    color: theme.btnText,
    border: "none",
    borderRadius: "50px",
    padding: "16px 40px",
    fontSize: "1.2rem",
    fontFamily: "'Nunito', 'Comic Sans MS', cursive",
    fontWeight: "800",
    cursor: "pointer",
    boxShadow: `0 6px 20px ${theme.shadow}`,
    transform: loading ? "scale(0.96)" : "scale(1)",
    transition: "all 0.2s",
    letterSpacing: "0.5px",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: theme.bg,
      fontFamily: "'Nunito', 'Comic Sans MS', cursive",
      position: "relative",
      overflowX: "hidden",
      transition: "background 0.6s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        @keyframes floatUp {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(15deg); opacity: 0.6; }
        }
        @keyframes starFall {
          0% { transform: translateY(-50px) rotate(0deg); opacity: 0; }
          10% { opacity: 0.5; }
          90% { opacity: 0.5; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-10px) scale(1.1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes slideIn {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .theme-btn:hover { transform: scale(1.15) !important; }
        .upload-zone:hover { border-color: ${theme.primary} !important; transform: scale(1.02); }
        .big-btn:hover { transform: scale(1.05) !important; box-shadow: 0 10px 30px ${theme.shadow} !important; }
        .mascot-btn:hover { transform: scale(1.2) !important; }
        textarea:focus { border-color: ${theme.primary} !important; }
        input:focus { border-color: ${theme.primary} !important; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: ${theme.bubble}; border-radius: 10px; }
        ::-webkit-scrollbar-thumb { background: ${theme.primary}; border-radius: 10px; }
      `}</style>

      <StarRain theme={theme} />

      {/* Floating decorative bubbles */}
      <FloatingBubble style={{ top: "10%", left: "5%", animationDelay: "0s" }} emoji={theme.emoji} />
      <FloatingBubble style={{ top: "20%", right: "8%", animationDelay: "1s" }} emoji="💊" />
      <FloatingBubble style={{ top: "60%", left: "3%", animationDelay: "2s" }} emoji="🩺" />
      <FloatingBubble style={{ top: "75%", right: "5%", animationDelay: "1.5s" }} emoji={theme.emoji} />

      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "20px 16px", position: "relative", zIndex: 2 }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "20px", animation: "slideIn 0.6s ease" }}>
          <div style={{
            fontSize: "4rem",
            animation: "bounce 2s ease-in-out infinite",
            display: "inline-block",
            cursor: "pointer",
            marginBottom: "4px",
          }} onClick={() => {
            const keys = Object.keys(MASCOTS);
            const idx = keys.indexOf(mascotKey);
            setMascotKey(keys[(idx + 1) % keys.length]);
          }}>{mascot.emoji}</div>
          <h1 style={{
            margin: "0 0 4px",
            fontSize: "2rem",
            fontWeight: "900",
            color: theme.text,
            textShadow: `2px 2px 0 ${theme.accent}`,
          }}>MediKids ✨</h1>
          <p style={{
            margin: 0,
            color: theme.primary,
            fontWeight: "700",
            fontSize: "1rem",
          }}>{mascot.name} says: "{name.trim() ? `Hi ${name.trim()}! 💖 I\'m here to help you feel better!` : mascot.msg}"</p>
          <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: theme.text, opacity: 0.6 }}>Tap the doctor to change mascot!</p>
        </div>

        {/* Theme Picker */}
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showThemePicker ? "16px" : "0" }}>
            <span style={{ fontWeight: "800", color: theme.text, fontSize: "1rem" }}>🎨 Pick Your Theme</span>
            <button onClick={() => setShowThemePicker(!showThemePicker)} style={{
              background: theme.btn, color: theme.btnText, border: "none",
              borderRadius: "20px", padding: "6px 16px", cursor: "pointer",
              fontFamily: "inherit", fontWeight: "700", fontSize: "0.85rem",
            }}>
              {showThemePicker ? "Close ✕" : theme.name}
            </button>
          </div>
          {showThemePicker && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", animation: "slideIn 0.3s ease" }}>
              {Object.entries(THEMES).map(([key, t]) => (
                <button key={key} className="theme-btn" onClick={() => { setThemeName(key); setShowThemePicker(false); }}
                  style={{
                    background: t.btn, color: t.btnText, border: themeName === key ? `3px solid ${t.text}` : "3px solid transparent",
                    borderRadius: "20px", padding: "8px 14px", cursor: "pointer",
                    fontFamily: "inherit", fontWeight: "700", fontSize: "0.85rem",
                    transition: "transform 0.2s", transform: themeName === key ? "scale(1.1)" : "scale(1)",
                    boxShadow: `0 4px 12px ${t.shadow}`,
                  }}>
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {!result ? (
          <>
            {/* Name & Age */}
            <div style={cardStyle}>
              <p style={{ margin: "0 0 12px", fontWeight: "800", color: theme.text, fontSize: "1rem" }}>{name.trim() ? `👋 Hey ${name.trim()}, tell me about yourself!` : "👋 Tell me about yourself!"}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: "700", color: theme.primary, display: "block", marginBottom: "6px" }}>Your Name 😊</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    placeholder="e.g. Emma" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: "700", color: theme.primary, display: "block", marginBottom: "6px" }}>Your Age 🎂</label>
                  <input value={age} onChange={e => setAge(e.target.value)}
                    placeholder="e.g. 8" type="number" min="1" max="18" style={inputStyle} />
                </div>
              </div>
            </div>

            {/* Symptoms */}
            <div style={cardStyle}>
              <p style={{ margin: "0 0 12px", fontWeight: "800", color: theme.text, fontSize: "1rem" }}>{name.trim() ? `🤒 How are you feeling, ${name.trim()}?` : "🤒 How are you feeling?"}</p>
              <textarea
                value={symptoms}
                onChange={e => setSymptoms(e.target.value)}
                placeholder="Tell Dr. Buddy everything! Like... my tummy hurts, I have a fever, my head is throbbing... anything!"
                rows={4}
                style={{ ...inputStyle, resize: "vertical", lineHeight: "1.6" }}
              />
              <p style={{ margin: "8px 0 0", fontSize: "0.8rem", color: theme.primary, opacity: 0.8 }}>
                💡 The more you tell me, the better I can help!
              </p>
            </div>

            {/* File Upload */}
            <div style={cardStyle}>
              <p style={{ margin: "0 0 12px", fontWeight: "800", color: theme.text, fontSize: "1rem" }}>🔬 Upload Lab Report (Optional)</p>
              <div className="upload-zone"
                onClick={() => fileRef.current.click()}
                style={{
                  border: `2px dashed ${theme.primary}`,
                  borderRadius: "16px",
                  padding: "24px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: theme.bubble,
                }}>
                <input ref={fileRef} type="file" accept="image/*,.pdf,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
                {uploadedFile ? (
                  <div style={{ animation: "slideIn 0.3s ease" }}>
                    {filePreview && <img src={filePreview} alt="Lab report" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "12px", marginBottom: "8px" }} />}
                    <p style={{ margin: 0, fontWeight: "700", color: theme.primary }}>✅ {uploadedFile.name}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: theme.text, opacity: 0.7 }}>
                      {isImage ? "📷 I can read the image!" : "📄 File uploaded!"}
                    </p>
                    <button onClick={(e) => { e.stopPropagation(); setUploadedFile(null); setFilePreview(null); setFileBase64(null); }}
                      style={{ marginTop: "8px", background: "none", border: `1px solid ${theme.primary}`, borderRadius: "10px", padding: "4px 12px", cursor: "pointer", color: theme.primary, fontFamily: "inherit", fontSize: "0.8rem" }}>
                      Remove ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: "2.5rem", marginBottom: "8px" }}>📋</div>
                    <p style={{ margin: 0, fontWeight: "700", color: theme.text }}>Tap to upload lab report</p>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: theme.text, opacity: 0.6 }}>Images (JPG, PNG) · PDF · TXT</p>
                  </>
                )}
              </div>
              {isImage && uploadedFile && (
                <div style={{ marginTop: "10px", padding: "10px 14px", borderRadius: "12px", background: theme.bubble, border: `1px solid ${theme.accent}` }}>
                  <p style={{ margin: 0, fontSize: "0.85rem", color: theme.primary, fontWeight: "700" }}>
                    🤖 AI Vision ON! I'll read all the numbers and results from your lab report image automatically!
                  </p>
                </div>
              )}
            </div>

            {error && (
              <div style={{ ...cardStyle, background: "rgba(255,100,100,0.15)", border: "2px solid #FF6B6B", animation: "slideIn 0.3s ease" }}>
                <p style={{ margin: 0, color: "#D32F2F", fontWeight: "700" }}>{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <button className="big-btn" style={btnStyle} onClick={runDiagnosis} disabled={loading}>
                {loading ? (
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                    <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚕️</span>
                    Checking...
                  </span>
                ) : {name.trim() ? `🩺 Check ${name.trim()}'s Health!` : "🩺 Check My Health!"}}
              </button>
              <p style={{ margin: "10px 0 0", fontSize: "0.75rem", color: theme.text, opacity: 0.6 }}>
                ⚠️ This is for fun & learning only. Always see a real doctor!
              </p>
            </div>
          </>
        ) : (
          /* Results */
          <div style={{ animation: "slideIn 0.5s ease" }}>
            <div style={{ ...cardStyle, border: `3px solid ${theme.primary}` }}>
              <div style={{ textAlign: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "3rem", animation: "bounce 1.5s ease-in-out infinite" }}>🎉</div>
                <h2 style={{ margin: "8px 0 4px", color: theme.text, fontWeight: "900", fontSize: "1.4rem" }}>
                  {name.trim() ? `${name.trim()}'s Health Report ${theme.emoji}` : `Dr. ${mascot.name}'s Report ${theme.emoji}`}
                </h2>
                {name && <p style={{ margin: 0, color: theme.primary, fontWeight: "700" }}>For: {name} {age ? `(Age ${age})` : ""}</p>}
              </div>
              <div style={{
                background: theme.bubble,
                borderRadius: "16px",
                padding: "20px",
                whiteSpace: "pre-wrap",
                lineHeight: "1.8",
                color: theme.text,
                fontSize: "0.95rem",
                fontWeight: "600",
              }}>
                {result}
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ ...cardStyle, background: "rgba(255,200,0,0.15)", border: "2px solid #FFB300" }}>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#7B4F00", fontWeight: "700", textAlign: "center" }}>
                ⚠️ Remember: Dr. {mascot.name} is an AI helper for learning only!<br />
                Always visit a real doctor for proper medical advice! 🏥
              </p>
            </div>

            <div style={{ textAlign: "center" }}>
              <button className="big-btn" style={{ ...btnStyle, fontSize: "1rem", padding: "14px 32px" }} onClick={reset}>
                🔄 Check Again!
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: "center", margin: "20px 0 8px", fontSize: "0.75rem", color: theme.text, opacity: 0.5, fontWeight: "600" }}>
          MediKids {theme.emoji} · Powered by Claude AI · Made with ❤️ for kids
        </p>
      </div>
    </div>
  );
}
