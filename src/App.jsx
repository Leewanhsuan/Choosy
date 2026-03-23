import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── helpers ───────────────────────────────────────────────────────────────────
function Badge({ children, color = "gray" }) {
  const map = {
    gray:   { bg: "var(--color-background-tertiary)", fg: "var(--color-text-secondary)" },
    blue:   { bg: "#e8edff", fg: "#5170ff" },
    green:  { bg: "#eaf3de", fg: "#3b6d11" },
    amber:  { bg: "#faeeda", fg: "#854f0b" },
    red:    { bg: "#fcebeb", fg: "#a32d2d" },
    teal:   { bg: "#e8edff", fg: "#5170ff" },
    purple: { bg: "#e8edff", fg: "#5170ff" },
  };
  const { bg, fg } = map[color] || map.gray;
  return <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 500,
    display: "inline-block", background: bg, color: fg, whiteSpace: "nowrap" }}>{children}</span>;
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: "9px 16px", border: "none", background: "none",
      borderBottom: active ? "2px solid #5170ff" : "2px solid transparent",
      color: active ? "#5170ff" : "var(--color-text-secondary)",
      fontWeight: active ? 500 : 400, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}
    </button>
  );
}

function Spinner() {
  return <span style={{ display: "inline-block", width: 13, height: 13,
    border: "2px solid #ccc", borderTop: "2px solid #5170ff",
    borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />;
}

function Input({ value, onChange, placeholder, onEnter, style = {} }) {
  return <input value={value} onChange={e => onChange(e.target.value)}
    onKeyDown={e => e.key === "Enter" && onEnter?.()}
    placeholder={placeholder}
    style={{ padding: "9px 13px", borderRadius: 9, border: "1px solid var(--color-border-secondary)",
      fontSize: 13, background: "var(--color-background-primary)", color: "var(--color-text-primary)",
      outline: "none", minWidth: 0, boxSizing: "border-box", ...style }} />;
}

function PrimaryBtn({ onClick, disabled, loading, children, color = "#5170ff" }) {
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{ padding: "9px 20px", borderRadius: 9,
      border: "none", background: disabled ? "var(--color-border-secondary)" : color,
      color: "#fff", fontWeight: 500, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
      display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
      {loading && <Spinner />}{children}
    </button>
  );
}

// Fix broken markdown from AI responses:
// 1. Tables: merge rows that have too few columns back into the previous row
// 2. Lists: merge empty bullet lines (- \n text) into single list items
// 3. Lists: merge orphaned continuation lines into the previous bullet
function fixMarkdown(text) {
  const lines = text.split("\n");
  const out = [];
  let colCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Table fixes ──
    // Detect separator row like |---|---|---|
    if (/^\|[\s\-:]+(\|[\s\-:]+)+\|?\s*$/.test(trimmed)) {
      colCount = (trimmed.match(/\|/g) || []).length - 1;
      out.push(line);
      continue;
    }

    if (colCount > 0 && trimmed.startsWith("|")) {
      const pipes = (trimmed.match(/\|/g) || []).length;
      if (pipes >= colCount) {
        out.push(line);
      } else {
        // Broken row — merge into previous table row
        if (out.length > 0 && out[out.length - 1].trim().startsWith("|")) {
          const fragment = trimmed.replace(/^\|/, "").replace(/\|$/, "").trim();
          if (fragment) {
            const prev = out[out.length - 1];
            const lastPipe = prev.lastIndexOf("|");
            if (lastPipe > 0) {
              out[out.length - 1] = prev.slice(0, lastPipe).trimEnd() + " " + fragment + " " + prev.slice(lastPipe);
            }
          }
        } else {
          out.push(line);
        }
      }
      continue;
    }

    // Reset table context when leaving table
    if (colCount > 0 && trimmed !== "" && !trimmed.startsWith("|")) {
      colCount = 0;
    }

    // ── List fixes ──
    // Case 1: empty bullet "- " or "* " with content on the NEXT line
    if (/^[-*]\s*$/.test(trimmed) && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      // Skip blank lines after empty bullet
      if (next === "") { i++; continue; }
      // Merge next non-empty line into this bullet
      if (!next.startsWith("-") && !next.startsWith("*") && !next.startsWith("#") && !next.startsWith("|")) {
        out.push("- " + next);
        i++; // skip next line since we merged it
        continue;
      }
    }

    // Case 2: line after a bullet that's a plain continuation (not a new bullet/heading/table)
    // e.g. previous: "- " (empty), this line is orphaned text
    if (out.length > 0 && trimmed !== "" && !trimmed.startsWith("-") && !trimmed.startsWith("*") &&
        !trimmed.startsWith("#") && !trimmed.startsWith("|") && !trimmed.startsWith(">")) {
      const prevTrimmed = out[out.length - 1].trim();
      // If previous line was an empty bullet we already handled, check if it's "- "
      if (/^[-*]\s*$/.test(prevTrimmed)) {
        out[out.length - 1] = "- " + trimmed;
        continue;
      }
    }

    out.push(line);
  }
  return out.join("\n");
}

// Result renderer — renders AI markdown output with proper tables, headings, etc.
function ResultBlock({ text, loading, emptyMsg = "結果將顯示於此" }) {
  if (loading) return (
    <div style={{ padding: 20, color: "var(--color-text-secondary)", fontSize: 13,
      display: "flex", alignItems: "center", gap: 8 }}><Spinner /> 分析中，請稍候…</div>
  );
  if (!text) return (
    <div style={{ padding: "24px 0", color: "var(--color-text-tertiary)", fontSize: 13,
      textAlign: "center" }}>{emptyMsg}</div>
  );
  const fixed = fixMarkdown(text);
  return (
    <div className="result-markdown" style={{ fontSize: 14, lineHeight: 1.7, color: "var(--color-text-primary)" }}>
      <Markdown remarkPlugins={[remarkGfm]}>{fixed}</Markdown>
    </div>
  );
}

// ── Theme hook ────────────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "light");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);
  const toggle = () => setTheme(t => t === "light" ? "dark" : "light");
  return { theme, toggle };
}

// ── API Key hook ──────────────────────────────────────────────────────────────
const ENV_KEY = import.meta.env.DEV ? (import.meta.env.VITE_ANTHROPIC_KEY || "") : "";

function useApiKey() {
  const [key, setKey] = useState(() => ENV_KEY || localStorage.getItem("anthropic_key") || "");
  const save = (k) => { localStorage.setItem("anthropic_key", k.trim()); setKey(k.trim()); };
  return { key, save, fromEnv: !!ENV_KEY };
}

// ── Cache ─────────────────────────────────────────────────────────────────────
const CACHE_PREFIX = "claude_cache:";
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

function getCached(prompt) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + prompt);
    if (!raw) return null;
    const { result, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(CACHE_PREFIX + prompt); return null; }
    return result;
  } catch { return null; }
}

function setCache(prompt, result) {
  try { localStorage.setItem(CACHE_PREFIX + prompt, JSON.stringify({ result, ts: Date.now() })); }
  catch { /* quota exceeded — ignore */ }
}

// ── API ───────────────────────────────────────────────────────────────────────
async function searchClaude(prompt, apiKey) {
  if (!apiKey) throw new Error("NO_KEY");
  const cached = getCached(prompt);
  if (cached) return cached;

  const apiUrl = import.meta.env.DEV ? "/api/anthropic/v1/messages" : "https://api.anthropic.com/v1/messages";
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      ...(import.meta.env.DEV ? {} : { "anthropic-dangerous-direct-browser-access": "true" }),
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const result = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "";
  setCache(prompt, result);
  return result;
}

// ── API Key Modal ─────────────────────────────────────────────────────────────
function KeyModal({ onClose, apiKey, onSave }) {
  const [val, setVal] = useState(apiKey);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--color-background-primary)", borderRadius: 14,
        padding: 24, width: 360, boxShadow: "0 8px 32px rgba(0,0,0,.15)" }}>
        <div style={{ fontWeight: 500, fontSize: 15, marginBottom: 6 }}>⚙️ Anthropic API Key</div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 14px", lineHeight: 1.6 }}>
          Key 只存在你的瀏覽器 localStorage，不會傳送到任何伺服器。
          前往 <a href="https://console.anthropic.com" target="_blank" rel="noreferrer"
            style={{ color: "#5170ff" }}>console.anthropic.com</a> 取得。
        </p>
        <input value={val} onChange={e => setVal(e.target.value)}
          placeholder="sk-ant-..."
          type="password"
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9,
            border: "1px solid var(--color-border-secondary)", fontSize: 13,
            background: "var(--color-background-secondary)", color: "var(--color-text-primary)",
            marginBottom: 12, fontFamily: "var(--font-mono)" }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 16px", borderRadius: 8,
            border: "1px solid var(--color-border-secondary)", background: "none",
            color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>取消</button>
          <button onClick={() => { onSave(val); onClose(); }} style={{ padding: "7px 16px",
            borderRadius: 8, border: "none", background: "#5170ff", color: "#fff",
            fontSize: 13, fontWeight: 500, cursor: "pointer" }}>儲存</button>
        </div>
      </div>
    </div>
  );
}

// ── SPEC RECOMMENDER ──────────────────────────────────────────────────────────
const DEFAULT_TYPES = ["冷氣", "電視", "冰箱", "洗衣機", "吸塵器", "空氣清淨機", "沙發", "床架", "書桌", "衣櫃"];

function useCustomTypes() {
  const [types, setTypes] = useState(() => {
    try { return JSON.parse(localStorage.getItem("custom_types") || "null") || DEFAULT_TYPES; }
    catch { return DEFAULT_TYPES; }
  });
  const save = (t) => { setTypes(t); localStorage.setItem("custom_types", JSON.stringify(t)); };
  const add = (v) => { if (v && !types.includes(v)) save([...types, v]); };
  const remove = (v) => save(types.filter(t => t !== v));
  return { types, add, remove };
}

function SpecTab() {
  const apiKey = React.useContext(KeyCtx);
  const [spec, setSpec] = useState({ type: "", size: "", budget: "", env: "", needs: "" });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const { types, add, remove } = useCustomTypes();
  const [newType, setNewType] = useState("");

  const run = async () => {
    if (!spec.type) return;
    setLoading(true); setResult("");
    const prompt = `你是台灣家電/傢俱採購顧問。用戶想買「${spec.type}」，條件：
尺寸：${spec.size || "未指定"}；預算上限：${spec.budget ? "NT$" + spec.budget : "不限"}；
居家環境：${spec.env || "未說明"}；功能需求：${spec.needs || "無特殊"}。

請搜尋台灣市場，推薦 3 款最符合條件的具體商品，每款說明：
① 商品全名與品牌
② 台灣售價範圍（NT$）
③ 符合此需求的 2-3 個關鍵規格
④ 一句話推薦理由

最後給出「最推薦選擇」與理由。繁體中文，條列清楚。`;
    try { setResult(await searchClaude(prompt, apiKey)); }
    catch { setResult("無法取得推薦，請稍後再試。"); }
    setLoading(false);
  };

  const set = (k, v) => setSpec(s => ({ ...s, [k]: v }));

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
        填入你的需求，AI 搜尋台灣市場後推薦最適合的商品。
      </p>

      {/* Type */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 7 }}>商品類型</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 8 }}>
          {types.map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center",
              border: spec.type === t ? "1.5px solid #5170ff" : "1px solid var(--color-border-secondary)",
              background: spec.type === t ? "#e8edff" : "none",
              borderRadius: 20, overflow: "hidden" }}>
              <button onClick={() => set("type", t)} style={{ padding: "5px 10px 5px 13px",
                background: "none", border: "none", cursor: "pointer", fontSize: 13,
                color: spec.type === t ? "#5170ff" : "var(--color-text-secondary)",
                fontWeight: spec.type === t ? 500 : 400 }}>{t}</button>
              {!DEFAULT_TYPES.includes(t) && (
                <button onClick={() => { remove(t); if (spec.type === t) set("type", ""); }}
                  style={{ padding: "0 8px 0 2px", background: "none", border: "none",
                    cursor: "pointer", fontSize: 14, color: "var(--color-text-tertiary)", lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <Input value={newType} onChange={setNewType}
            onEnter={() => { add(newType); setNewType(""); }}
            placeholder="＋ 新增類型（按 Enter）"
            style={{ width: 180, borderRadius: 20, fontSize: 12, padding: "5px 13px" }} />
          <button onClick={() => { add(newType); setNewType(""); }}
            style={{ padding: "5px 13px", borderRadius: 20, border: "1px dashed var(--color-border-secondary)",
              background: "none", color: "var(--color-text-secondary)", fontSize: 12, cursor: "pointer" }}>
            新增
          </button>
        </div>
      </div>

      {/* Fields */}
      <div className="spec-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { k: "size",   label: "尺寸需求",        ph: "e.g. 55吋 / 雙人 / 150x80cm" },
          { k: "budget", label: "預算上限 (NT$)",   ph: "e.g. 30000", type: "number" },
          { k: "env",    label: "居家環境",          ph: "e.g. 15坪客廳、頂樓加蓋" },
          { k: "needs",  label: "功能需求",          ph: "e.g. 變頻、WiFi、靜音" },
        ].map(({ k, label, ph, type }) => (
          <div key={k}>
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 5 }}>{label}</div>
            <Input value={spec[k]} onChange={v => set(k, v)} placeholder={ph}
              style={{ width: "100%", boxSizing: "border-box", ...(type === "number" ? {} : {}) }} />
          </div>
        ))}
      </div>

      <PrimaryBtn onClick={run} disabled={!spec.type} loading={loading}>🎯 幫我推薦</PrimaryBtn>

      {(loading || result) && (
        <div style={{ marginTop: 16, padding: 16, borderRadius: 10,
          background: "var(--color-background-secondary)", borderLeft: "3px solid #5170ff" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
            🤖 AI 規格推薦（Web Search）
          </div>
          <ResultBlock text={result} loading={loading} />
        </div>
      )}
    </div>
  );
}

// ── COMPARE TAB ───────────────────────────────────────────────────────────────
function CompareTab() {
  const apiKey = React.useContext(KeyCtx);
  const [items, setItems] = useState(["", ""]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const addItem = () => setItems(i => [...i, ""]);
  const setItem = (idx, v) => setItems(i => i.map((x, j) => j === idx ? v : x));
  const removeItem = (idx) => setItems(i => i.filter((_, j) => j !== idx));

  const run = async () => {
    const targets = items.filter(Boolean);
    if (targets.length < 2) return;
    setLoading(true); setResult("");

    const prompt = `你是台灣家電比較專家。請搜尋以下商品的詳細資訊並做完整比較：
${targets.map((t, i) => `商品 ${i + 1}：${t}`).join("\n")}

請用以下格式輸出（不要使用 markdown 表格）：

## 一、規格逐項比對

針對每個規格項目，列出每款商品的值，格式如下：

**尺寸/重量**
- 商品A：值
- 商品B：值

**主要技術**
- 商品A：值
- 商品B：值

（依此類推，至少包含：尺寸/重量、主要技術、處理器/馬達、吸力/效能、能效等級、特色功能、台灣售價範圍）

## 二、各自優點
每款 2-3 點

## 三、各自缺點或限制
每款 1-2 點

## 四、總結建議
哪種使用情境適合哪款

用繁體中文，條列清楚。`;
    try { setResult(await searchClaude(prompt, apiKey)); }
    catch { setResult("比較失敗，請稍後再試。"); }
    setLoading(false);
  };

  const ready = items.filter(Boolean).length >= 2;

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
        輸入 2–4 款想比較的商品，AI 搜尋後產出規格比對與購買建議。
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {items.map((v, i) => (
          <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", width: 48, flexShrink: 0 }}>
              商品 {i + 1}
            </div>
            <Input value={v} onChange={val => setItem(i, val)} onEnter={run}
              placeholder={i === 0 ? "e.g. Dyson V15 Detect" : i === 1 ? "e.g. Dyson V12 Detect" : "商品名稱…"}
              style={{ flex: 1 }} />
            {items.length > 2 && (
              <button onClick={() => removeItem(i)} style={{ background: "none", border: "none",
                color: "var(--color-text-tertiary)", cursor: "pointer", fontSize: 18, lineHeight: 1,
                padding: "0 4px" }}>×</button>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {items.length < 4 && (
          <button onClick={addItem} style={{ padding: "7px 14px", borderRadius: 9,
            border: "1px dashed var(--color-border-secondary)", background: "none",
            color: "var(--color-text-secondary)", fontSize: 13, cursor: "pointer" }}>
            + 加一款
          </button>
        )}
        <PrimaryBtn onClick={run} disabled={!ready} loading={loading}>⚡ 開始比對</PrimaryBtn>
      </div>

      {/* Quick examples */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 7 }}>快速範例</div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          {[
            ["Dyson V15", "Dyson V12"],
            ["LG C3 OLED 55吋", "Samsung S90C QD-OLED 55吋"],
            ["IKEA MALM 床架", "無印良品 橡木床架"],
            ["Panasonic 變頻冷氣 1噸", "日立 變頻冷氣 1噸"],
          ].map(([a, b]) => (
            <button key={a} onClick={() => { setItems([a, b]); setTimeout(run, 80); }}
              style={{ padding: "4px 11px", borderRadius: 20, fontSize: 12,
                border: "1px solid var(--color-border-secondary)", background: "none",
                color: "var(--color-text-secondary)", cursor: "pointer" }}>
              {a} vs {b}
            </button>
          ))}
        </div>
      </div>

      {(loading || result) && (
        <div style={{ padding: 16, borderRadius: 10,
          background: "var(--color-background-secondary)", borderLeft: "3px solid #5170ff" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
            ⚡ 規格比對結果（Web Search）
          </div>
          <ResultBlock text={result} loading={loading} />
        </div>
      )}
    </div>
  );
}

// ── REVIEW TAB ────────────────────────────────────────────────────────────────
function ReviewTab() {
  const apiKey = React.useContext(KeyCtx);
  const [target, setTarget] = useState("");
  const [sources, setSources] = useState(["ptt", "dcard", "mobile01"]);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const toggleSrc = (s) => setSources(ss => ss.includes(s) ? ss.filter(x => x !== s) : [...ss, s]);
  const srcLabel = { ptt: "PTT", dcard: "Dcard", mobile01: "Mobile01", youtube: "YouTube 開箱" };

  const run = async () => {
    if (!target.trim()) return;
    setLoading(true); setResult("");
    const srcStr = sources.map(s => srcLabel[s]).join("、");
    const prompt = `你是台灣消費者評測分析師。請搜尋 ${srcStr} 上關於「${target}」的真實使用者評價與討論。

請整理出：
① 整體評價摘要（幾顆星感覺、主要評價傾向）
② 使用者常提到的優點（列出 3-5 點，每點附上大概是哪類使用者在說）
③ 使用者常提到的缺點或踩雷點（列出 2-4 點）
④ 值得注意的特殊情況或使用情境限制
⑤ 論壇網友推薦的替代品或升降級選擇（如有）

用繁體中文，條列清楚，盡量引用真實評價的語氣感受。`;
    try { setResult(await searchClaude(prompt, apiKey)); }
    catch { setResult("無法取得評價，請稍後再試。"); }
    setLoading(false);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
        從台灣論壇爬取真實使用者評價，整理優缺點與踩雷提醒。
      </p>

      {/* Source selector */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginBottom: 7 }}>評價來源</div>
        <div style={{ display: "flex", gap: 8 }}>
          {Object.entries(srcLabel).map(([k, v]) => (
            <button key={k} onClick={() => toggleSrc(k)} style={{ padding: "5px 13px", borderRadius: 20,
              cursor: "pointer", fontSize: 12,
              border: sources.includes(k) ? "1.5px solid #5170ff" : "1px solid var(--color-border-secondary)",
              background: sources.includes(k) ? "#e8edff" : "none",
              color: sources.includes(k) ? "#5170ff" : "var(--color-text-secondary)",
              fontWeight: sources.includes(k) ? 500 : 400 }}>{v}</button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Input value={target} onChange={setTarget} onEnter={run}
          placeholder="輸入商品名稱（e.g. Dyson V15、LG C3 OLED）"
          style={{ flex: 1 }} />
        <PrimaryBtn onClick={run} disabled={!target.trim() || sources.length === 0}
          loading={loading} color="#5170ff">💬 查評價</PrimaryBtn>
      </div>

      {/* Quick links */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
        {["Dyson V15 Detect", "LG C3 OLED", "Ecovacs DEEBOT T30S", "Panasonic 變頻冷氣", "無印良品 沙發"].map(k => (
          <button key={k} onClick={() => { setTarget(k); setTimeout(run, 80); }} style={{ padding: "4px 11px",
            borderRadius: 20, fontSize: 12, border: "1px solid var(--color-border-secondary)",
            background: "none", color: "var(--color-text-secondary)", cursor: "pointer" }}>{k}</button>
        ))}
      </div>

      {(loading || result) && (
        <div style={{ padding: 16, borderRadius: 10,
          background: "var(--color-background-secondary)", borderLeft: "3px solid #5170ff" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
            💬 論壇評價整理（{sources.map(s => srcLabel[s]).join(" / ")}）
          </div>
          <ResultBlock text={result} loading={loading} />
        </div>
      )}
    </div>
  );
}

// ── PRICE SEARCH TAB ──────────────────────────────────────────────────────────
function PriceTab() {
  const apiKey = React.useContext(KeyCtx);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true); setResult("");
    const prompt = `你是台灣購物比價助理。請搜尋「${query}」在台灣各大電商的最新價格資訊。

請用以下格式輸出（不要使用 markdown 表格）：

## 各平台價格

針對每個平台，列出找到的價格資訊：

**PChome**
- 商品名稱：xxx
- 售價：NT$xxx
- 備註：（贈品/促銷資訊）

**momo購物**
- 商品名稱：xxx
- 售價：NT$xxx
- 備註：（贈品/促銷資訊）

（依此類推，包含：蝦皮、Yahoo購物、燦坤、全國電子等有找到的平台）

## 價格分析
- 最低價：哪個平台、多少錢
- 建議購買平台與原因
- 近期是否有促銷節慶值得等待

繁體中文，條列清楚。`;
    try { setResult(await searchClaude(prompt, apiKey)); }
    catch { setResult("搜尋失敗，請稍後再試。"); }
    setLoading(false);
  };

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "0 0 16px" }}>
        搜尋各大電商現售價格，清楚比較讓你自己決定在哪買。
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <Input value={query} onChange={setQuery} onEnter={run}
          placeholder="輸入商品（e.g. Dyson V15 Detect SV22）"
          style={{ flex: 1 }} />
        <PrimaryBtn onClick={run} disabled={!query.trim()} loading={loading} color="#5170ff">
          🔍 查價格
        </PrimaryBtn>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
        {["Dyson V15 Detect", "LG OLED55C3PSA", "Panasonic CS-較36BA2", "IKEA MALM 雙人床架", "Samsung 65吋 QN65S90C"].map(k => (
          <button key={k} onClick={() => { setQuery(k); setTimeout(run, 80); }}
            style={{ padding: "4px 11px", borderRadius: 20, fontSize: 12,
              border: "1px solid var(--color-border-secondary)", background: "none",
              color: "var(--color-text-secondary)", cursor: "pointer" }}>{k}</button>
        ))}
      </div>

      {(loading || result) && (
        <div style={{ padding: 16, borderRadius: 10,
          background: "var(--color-background-secondary)", borderLeft: "3px solid #5170ff" }}>
          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 8 }}>
            🔍 各平台價格比較（Web Search）
          </div>
          <ResultBlock text={result} loading={loading} />
        </div>
      )}
    </div>
  );
}

// ── APP ───────────────────────────────────────────────────────────────────────
// Context 讓所有子元件都能取到 apiKey
const KeyCtx = React.createContext("");


export default function App() {
  const [tab, setTab] = useState("spec");
  const { key, save } = useApiKey();
  const [showModal, setShowModal] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();

  const tabs = [
    { id: "spec",    label: "🎯 規格推薦" },
    { id: "compare", label: "⚡ 規格比對" },
    { id: "review",  label: "💬 論壇評價" },
    { id: "price",   label: "🔍 價格查詢" },
  ];

  return (
    <KeyCtx.Provider value={key}>
      <div style={{ width: "100%", maxWidth: 720, margin: "0 auto", fontFamily: "var(--font-sans)",
        color: "var(--color-text-primary)", padding: "0 16px", boxSizing: "border-box" }}>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @media(max-width:480px){
            .spec-grid{grid-template-columns:1fr !important}
            .header-row{flex-wrap:wrap;gap:6px !important}
            .header-row .header-right{width:100%;justify-content:flex-end}
          }
        `}</style>

        {showModal && <KeyModal apiKey={key} onSave={save} onClose={() => setShowModal(false)} />}

        <div style={{ padding: "18px 0 0" }}>
          <div className="header-row" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
            <img src={`${import.meta.env.BASE_URL}${theme === "dark" ? "icons_dark.png" : "icons_light.png"}`}
              alt="Choosy" style={{ width: 80, height: 80 }} />
            <Badge color="purple">AI + Web Search</Badge>
            <div className="header-right" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {key
                ? <Badge color="green">Key 已設定 ✓</Badge>
                : <Badge color="amber">未設定 Key</Badge>}
              <button onClick={toggleTheme} title="切換深淺色模式"
                style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
                  background: "none", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer" }}>
                {theme === "light" ? "🌙" : "☀️"}
              </button>
              <button onClick={() => setShowModal(true)} title="設定 API Key"
                style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid var(--color-border-secondary)",
                  background: "none", color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer" }}>
                ⚙️
              </button>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: "0 0 0" }}>
            規格推薦 · 商品比對 · 論壇評價 · 價格查詢
          </p>
        </div>

        <div style={{ display: "flex", borderBottom: "1px solid var(--color-border-tertiary)",
          overflowX: "auto", marginBottom: 20, marginTop: 14 }}>
          {tabs.map(t => <Tab key={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
        </div>

        <div style={{ width: "100%", minHeight: 300 }}>
          {tab === "spec"    && <SpecTab />}
          {tab === "compare" && <CompareTab />}
          {tab === "review"  && <ReviewTab />}
          {tab === "price"   && <PriceTab />}
        </div>
      </div>
    </KeyCtx.Provider>
  );
}
