var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
import_dotenv.default.config();
var rateLimitMap = /* @__PURE__ */ new Map();
function apiRateLimiter(req, res, next) {
  const clientIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "unknown-ip";
  const now = Date.now();
  const WINDOW_MS = 60 * 1e3;
  const MAX_REQUESTS = 30;
  const record = rateLimitMap.get(clientIp);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(clientIp, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    return next();
  }
  if (record.count >= MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((record.resetTime - now) / 1e3);
    res.setHeader("Retry-After", retryAfterSec);
    return res.status(429).json({
      error: `AI\u89E3\u6790\u306E\u5229\u7528\u4E0A\u9650\uFF081\u5206\u9593\u306B30\u56DE\uFF09\u306B\u9054\u3057\u307E\u3057\u305F\u3002${retryAfterSec}\u79D2\u5F8C\u306B\u518D\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002`,
      retryAfterSeconds: retryAfterSec
    });
  }
  record.count += 1;
  return next();
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
  app.use(import_express.default.json());
  app.post("/api/spots/parse-share-url", apiRateLimiter, async (req, res) => {
    const { rawInput, title, text, url } = req.body;
    const inputContent = [rawInput, url, text, title].filter((s) => s && typeof s === "string" && s.trim().length > 0).join("\n").trim();
    if (!inputContent) {
      return res.status(400).json({
        error: "URL\u307E\u305F\u306F\u30C6\u30AD\u30B9\u30C8\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044"
      });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    const urlMatch = inputContent.match(/https?:\/\/[^\s]+/i);
    const extractedUrl = urlMatch ? urlMatch[0] : "";
    const isGoogleMaps = extractedUrl.includes("google.com/maps") || extractedUrl.includes("maps.app.goo.gl");
    const isTabelog = extractedUrl.includes("tabelog.com");
    const isInstagram = extractedUrl.includes("instagram.com");
    if (!apiKey) {
      let fallbackName = title || "\u6C17\u306B\u306A\u308B\u304A\u5E97";
      let fallbackArea = "\u6771\u4EAC";
      if (inputContent) {
        const firstLine = inputContent.split("\n")[0].replace(/https?:\/\/[^\s]+/g, "").trim();
        if (firstLine.length > 0 && firstLine.length < 30) {
          fallbackName = firstLine;
        }
      }
      return res.json({
        spot: {
          name: fallbackName,
          area: fallbackArea,
          genres: ["\u30AB\u30D5\u30A7\u30FB\u55AB\u8336"],
          scenes: ["\u53CB\u9054\u30FB\u540C\u50DA\u3068"],
          priceRange: "\xA51,000\u301C\xA52,000",
          recommender: "\u5171\u6709\u30EA\u30F3\u30AF",
          comment: `\u5171\u6709\u30EA\u30F3\u30AF\u304B\u3089\u8FFD\u52A0: ${inputContent.slice(0, 100)}`,
          mapUrl: isGoogleMaps ? extractedUrl : void 0,
          tabelogUrl: isTabelog ? extractedUrl : void 0,
          highlightDish: ""
        },
        sourceUrl: extractedUrl,
        isAiParsed: false,
        message: "\u57FA\u672C\u60C5\u5831\u306E\u307F\u62BD\u51FA\u3057\u307E\u3057\u305F\u3002\u5FC5\u8981\u306B\u5FDC\u3058\u3066\u88DC\u6B63\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      });
    }
    try {
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `\u3042\u306A\u305F\u306F\u65E5\u672C\u306E\u30B0\u30EB\u30E1\u60C5\u5831\u30FB\u98F2\u98DF\u5E97\u30C7\u30FC\u30BF\u62BD\u51FA\u306E\u30B9\u30DA\u30B7\u30E3\u30EA\u30B9\u30C8\u3067\u3059\u3002
\u30E6\u30FC\u30B6\u30FC\u304B\u3089\u5171\u6709\u3055\u308C\u305F\u4EE5\u4E0B\u306EURL\u307E\u305F\u306F\u30C6\u30AD\u30B9\u30C8\u3092\u89E3\u6790\u3057\u3001Google\u691C\u7D22\u30C4\u30FC\u30EB\u3092\u7528\u3044\u3066\u5E97\u8217\u306E\u6B63\u78BA\u306A\u60C5\u5831\u3092\u691C\u7D22\u30FB\u88DC\u5B8C\u3057\u3066\u3001\u98F2\u98DF\u5E97\u767B\u9332\u7528\u306EJSON\u30C7\u30FC\u30BF\u3092\u751F\u6210\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u30E6\u30FC\u30B6\u30FC\u304B\u3089\u306E\u5171\u6709\u30C6\u30AD\u30B9\u30C8 / URL\u3011
"""
${inputContent}
"""

\u3010\u6307\u793A\u3011
1. URL\u3084\u30C6\u30AD\u30B9\u30C8\u304B\u3089\u5BFE\u8C61\u306E\u5E97\u8217\uFF08\u30EC\u30B9\u30C8\u30E9\u30F3\u3001\u30AB\u30D5\u30A7\u3001\u5C45\u9152\u5C4B\u3001\u30E9\u30FC\u30E1\u30F3\u5C4B\u3001\u30B9\u30A4\u30FC\u30C4\u5E97\u306A\u3069\uFF09\u3092\u7279\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002
2. \u98DF\u3079\u30ED\u30B0\u3001Google\u30DE\u30C3\u30D7\u3001Instagram\u3001\u516C\u5F0F\u30DA\u30FC\u30B8\u7B49\u306E\u60C5\u5831\u304B\u3089\u4EE5\u4E0B\u3092\u7279\u5B9A\u30FB\u5206\u985E\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A
   - \u6B63\u5F0F\u5E97\u8217\u540D (name): \u4F8B "CHAVATY \u8868\u53C2\u9053", "\u633D\u8089\u3068\u7C73 \u6E0B\u8C37"
   - \u30A8\u30EA\u30A2\u30FB\u6700\u5BC4\u308A\u99C5 (area): \u4F8B "\u8868\u53C2\u9053", "\u6E0B\u8C37", "\u65B0\u5BBF", "\u9280\u5EA7", "\u6A2A\u6D5C" \u306A\u3069\u4EE3\u8868\u7684\u306A\u30A8\u30EA\u30A2\u30FB\u99C5\u540D\uFF082\u301C6\u6587\u5B57\u7A0B\u5EA6\uFF09
   - \u30B8\u30E3\u30F3\u30EB (genres): ["\u30AB\u30D5\u30A7\u30FB\u55AB\u8336", "\u30A4\u30BF\u30EA\u30A2\u30F3\u30FB\u30D1\u30B9\u30BF", "\u548C\u98DF\u30FB\u5B9A\u98DF", "\u713C\u8089\u30FB\u8089\u6599\u7406", "\u5BFF\u53F8\u30FB\u6D77\u9BAE", "\u30E9\u30FC\u30E1\u30F3\u30FB\u9EBA\u985E", "\u5C45\u9152\u5C4B\u30FB\u30D0\u30EB", "\u4E2D\u83EF\u30FB\u30A2\u30B8\u30A2", "\u30B9\u30A4\u30FC\u30C4\u30FB\u30D1\u30F3", "\u30D5\u30EC\u30F3\u30C1\u30FB\u30D3\u30B9\u30C8\u30ED", "\u30AB\u30EC\u30FC", "\u6D0B\u98DF"] \u306E\u4E2D\u304B\u30891\u301C3\u500B
   - \u30B7\u30FC\u30F3 (scenes): ["\u30C7\u30FC\u30C8\u30FB\u8A18\u5FF5\u65E5", "\u5973\u5B50\u4F1A\u30FB\u30AB\u30D5\u30A7\u5DE1\u308A", "\u53CB\u9054\u30FB\u540C\u50DA\u3068", "\u4E00\u4EBA\u3067\u3086\u3063\u305F\u308A", "\u3054\u8912\u7F8E\u30FB\u8D05\u6CA2", "\u30B5\u30AF\u30C3\u3068\u3054\u306F\u3093", "\u5BB4\u4F1A\u30FB\u98F2\u307F\u4F1A"] \u306E\u4E2D\u304B\u30891\u301C3\u500B
   - \u4FA1\u683C\u5E2F (priceRange): "\u301C\xA51,000", "\xA51,000\u301C\xA52,000", "\xA52,000\u301C\xA54,000", "\xA54,000\u301C\xA58,000", "\xA58,000\u301C\xA515,000", "\xA515,000\u301C" \u306E\u4E2D\u304B\u3089\u6700\u3082\u8FD1\u30441\u3064
   - \u304A\u3059\u3059\u3081\u30E1\u30CB\u30E5\u30FC\u30FB\u540D\u7269 (highlightDish): \u4EE3\u8868\u7684\u306A\u770B\u677F\u30E1\u30CB\u30E5\u30FC\uFF08\u4F8B: "\u672C\u65E5\u306E\u30B9\u30B3\u30FC\u30F3\u30BB\u30C3\u30C8", "\u70AD\u706B\u713C\u304D\u30CF\u30F3\u30D0\u30FC\u30B0"\uFF09
   - \u30B3\u30E1\u30F3\u30C8\u30FB\u9B45\u529B (comment): \u5171\u6709\u30C6\u30AD\u30B9\u30C8\u5185\u306E\u30E1\u30E2\u3084\u3001\u5E97\u8217\u306E\u7279\u5FB4\uFF08\u4F8B: "SNS\u3067\u8A71\u984C\u306E\u7D76\u54C1\u30B9\u30B3\u30FC\u30F3\u3068\u30C6\u30A3\u30FC\u30E9\u30C6\u304C\u4EBA\u6C17\u306E\u304A\u5E97"\uFF09
   - Google\u30DE\u30C3\u30D7URL (mapUrl): \u6B63\u78BA\u306AGoogle\u30DE\u30C3\u30D7URL
   - \u98DF\u3079\u30ED\u30B0URL (tabelogUrl): \u6B63\u78BA\u306A\u98DF\u3079\u30ED\u30B0URL

3. \u5FC5\u305A\u4EE5\u4E0B\u306EJSON\u5F62\u5F0F\u306E\u307F\u3092\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\uFF08\u30DE\u30FC\u30AF\u30C0\u30A6\u30F3\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u3084\u7D14\u7C8B\u306AJSON\uFF09:
{
  "name": "\u5E97\u8217\u540D",
  "area": "\u30A8\u30EA\u30A2\u540D",
  "genres": ["\u30B8\u30E3\u30F3\u30EB1", "\u30B8\u30E3\u30F3\u30EB2"],
  "scenes": ["\u30B7\u30FC\u30F31", "\u30B7\u30FC\u30F32"],
  "priceRange": "\xA51,000\u301C\xA52,000",
  "highlightDish": "\u540D\u7269\u30E1\u30CB\u30E5\u30FC",
  "comment": "\u5E97\u8217\u306E\u7279\u5FB4\u3084\u304A\u3059\u3059\u3081\u30DD\u30A4\u30F3\u30C8",
  "mapUrl": "https://...",
  "tabelogUrl": "https://..."
}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const responseText = response.text || "";
      let parsedSpot = {};
      try {
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "");
        }
        parsedSpot = JSON.parse(cleanJson);
      } catch (e) {
        console.warn("JSON parsing failed from Gemini share parse response:", e);
      }
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const webLinks = [];
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          webLinks.push({
            uri: chunk.web.uri,
            title: chunk.web.title || ""
          });
        }
      }
      const tabelogGrounding = webLinks.find((l) => l.uri.includes("tabelog.com"));
      const mapsGrounding = webLinks.find(
        (l) => l.uri.includes("google.com/maps") || l.uri.includes("maps.app.goo.gl")
      );
      const finalMapUrl = parsedSpot.mapUrl && parsedSpot.mapUrl.startsWith("http") ? parsedSpot.mapUrl : isGoogleMaps ? extractedUrl : mapsGrounding?.uri || void 0;
      const finalTabelogUrl = parsedSpot.tabelogUrl && parsedSpot.tabelogUrl.startsWith("http") ? parsedSpot.tabelogUrl : isTabelog ? extractedUrl : tabelogGrounding?.uri || void 0;
      const spot = {
        name: parsedSpot.name || title || "\u5E97\u540D\u672A\u8A2D\u5B9A",
        area: parsedSpot.area || "\u90FD\u5185",
        genres: Array.isArray(parsedSpot.genres) && parsedSpot.genres.length > 0 ? parsedSpot.genres : ["\u30AB\u30D5\u30A7\u30FB\u55AB\u8336"],
        scenes: Array.isArray(parsedSpot.scenes) && parsedSpot.scenes.length > 0 ? parsedSpot.scenes : ["\u53CB\u9054\u30FB\u540C\u50DA\u3068"],
        priceRange: parsedSpot.priceRange || "\xA51,000\u301C\xA52,000",
        recommender: "\u5171\u6709\u30EA\u30F3\u30AF",
        comment: parsedSpot.comment || `\u5171\u6709\u30EA\u30F3\u30AF\u3088\u308A\u30A4\u30F3\u30DD\u30FC\u30C8: ${inputContent.slice(0, 80)}`,
        mapUrl: finalMapUrl,
        tabelogUrl: finalTabelogUrl,
        highlightDish: parsedSpot.highlightDish || ""
      };
      return res.json({
        spot,
        sourceUrl: extractedUrl,
        isAiParsed: true,
        groundingSourcesCount: webLinks.length
      });
    } catch (err) {
      console.error("Error during AI share parse:", err);
      return res.status(500).json({
        error: "AI\u306B\u3088\u308BURL\u89E3\u6790\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        fallback: {
          name: title || "\u6C17\u306B\u306A\u308B\u304A\u5E97",
          area: "\u6771\u4EAC",
          mapUrl: isGoogleMaps ? extractedUrl : void 0,
          tabelogUrl: isTabelog ? extractedUrl : void 0,
          comment: `\u5171\u6709\u60C5\u5831: ${inputContent.slice(0, 100)}`
        }
      });
    }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/spots/check-status", async (req, res) => {
    const { name, area, mapUrl, tabelogUrl } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "\u5E97\u540D\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044" });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        operatingStatus: "open",
        statusCheckNote: "API\u30AD\u30FC\u672A\u8A2D\u5B9A\u306E\u305F\u3081\u81EA\u52D5\u30C1\u30A7\u30C3\u30AF\u3092\u30B9\u30AD\u30C3\u30D7\u3057\u307E\u3057\u305F",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
    try {
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `\u3042\u306A\u305F\u306F\u65E5\u672C\u306E\u98F2\u98DF\u5E97\u60C5\u5831\u30FB\u55B6\u696D\u30B9\u30C6\u30FC\u30BF\u30B9\u8ABF\u67FB\u306E\u30A2\u30B7\u30B9\u30BF\u30F3\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u5E97\u8217\u306B\u3064\u3044\u3066Google\u691C\u7D22\u3092\u7528\u3044\u3066\u6700\u65B0\u306E\u55B6\u696D\u72B6\u6CC1\uFF08\u55B6\u696D\u4E2D\u3001\u9589\u5E97\u3001\u4F11\u696D\u3001\u79FB\u8EE2\uFF09\u3092\u8ABF\u67FB\u3057\u3001JSON\u3067\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u5E97\u8217\u540D: "${name}"
\u30A8\u30EA\u30A2: "${area || "\u6771\u4EAC\u90FD"}"
\u53C2\u8003URL: ${mapUrl || ""} ${tabelogUrl || ""}

\u3010\u8ABF\u67FB\u57FA\u6E96\u3011
- \u98DF\u3079\u30ED\u30B0\u3084Google\u30DE\u30C3\u30D7\u3001\u516C\u5F0FSNS\u7B49\u3067\u300C\u9589\u5E97\u300D\u300C\u63B2\u8F09\u4FDD\u7559\u300D\u300C\u9589\u696D\u300D\u300C\u79FB\u8EE2\u300D\u3068\u8A18\u8F09\u3055\u308C\u3066\u3044\u306A\u3044\u304B\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002
- \u79FB\u8EE2\u3057\u3066\u3044\u308B\u5834\u5408\u306F\u79FB\u8EE2\u5148\u3084\u5E74\u6708\u3092\u30E1\u30E2\u306B\u542B\u3081\u3066\u304F\u3060\u3055\u3044\u3002
- \u5224\u5B9A\u7D50\u679C\u306E operatingStatus \u306F\u4EE5\u4E0B\u304B\u30891\u3064\u9078\u629E:
  - "open" (\u901A\u5E38\u55B6\u696D\u4E2D\u30FB\u55B6\u696D\u3057\u3066\u3044\u308B\u53EF\u80FD\u6027\u304C\u9AD8\u3044)
  - "permanently_closed" (\u9589\u5E97\u30FB\u9589\u696D)
  - "temporarily_closed" (\u4E00\u6642\u4F11\u696D\u30FB\u6539\u88C5\u4E2D)
  - "moved" (\u5225\u5834\u6240\u3078\u79FB\u8EE2)
  - "unknown" (\u60C5\u5831\u4E0D\u8DB3\u3067\u5224\u5B9A\u4E0D\u80FD)

\u3010JSON\u51FA\u529B\u30D5\u30A9\u30FC\u30DE\u30C3\u30C8\u3011
{
  "operatingStatus": "open" | "permanently_closed" | "temporarily_closed" | "moved" | "unknown",
  "statusCheckNote": "\u5224\u5B9A\u306E\u7406\u7531\u3084\u6700\u65B0\u30E1\u30E2\uFF08\u4F8B: 2024\u5E74\u73FE\u5728\u3082\u901A\u5E38\u55B6\u696D\u4E2D / 2023\u5E74\u672B\u306B\u9589\u5E97\u6E08 / \u3007\u3007\u3078\u79FB\u8EE2\u306A\u3069\u300130\u6587\u5B57\u7A0B\u5EA6\uFF09",
  "confidence": "high" | "medium" | "low"
}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const responseText = response.text || "";
      let parsedResult = {};
      try {
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "");
        }
        parsedResult = JSON.parse(cleanJson);
      } catch (e) {
        console.warn("Failed to parse JSON for store status check:", e);
        parsedResult = {
          operatingStatus: "unknown",
          statusCheckNote: "\u60C5\u5831\u53D6\u5F97\u7D50\u679C\u306E\u89E3\u6790\u306B\u5931\u6557\u3057\u307E\u3057\u305F"
        };
      }
      return res.json({
        operatingStatus: parsedResult.operatingStatus || "open",
        statusCheckNote: parsedResult.statusCheckNote || "\u6700\u65B0\u306E\u55B6\u696D\u72B6\u6CC1\u3092\u78BA\u8A8D\u3057\u307E\u3057\u305F",
        confidence: parsedResult.confidence || "medium",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("Error in store status check:", err);
      return res.status(500).json({
        error: "\u5E97\u8217\u55B6\u696D\u72B6\u614B\u306E\u78BA\u8A8D\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F",
        operatingStatus: "unknown",
        statusCheckNote: "\u901A\u4FE1\u30A8\u30E9\u30FC\u306E\u305F\u3081\u5224\u5B9A\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
        checkedAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  });
  app.post("/api/spots/search-links", async (req, res) => {
    const { name, area } = req.body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        error: "\u5E97\u540D\uFF08\u5E97\u8217\u540D\uFF09\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044"
      });
    }
    const shopName = name.trim();
    const shopArea = (area || "").trim();
    const fallbackQuery = `${shopName} ${shopArea}`.trim();
    const fallbackGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      fallbackQuery
    )}`;
    const fallbackTabelogUrl = `https://tabelog.com/rstLst/?vs=1&sa=&sk=${encodeURIComponent(
      fallbackQuery
    )}`;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const candidates = [
        {
          id: "fallback-1",
          title: `${shopName}\uFF08${shopArea || "\u6307\u5B9A\u30A8\u30EA\u30A2"}\uFF09`,
          googleMapsUrl: fallbackGoogleMapsUrl,
          tabelogUrl: fallbackTabelogUrl,
          description: `\u300C${fallbackQuery}\u300D\u3067Google\u30DE\u30C3\u30D7\u304A\u3088\u3073\u98DF\u3079\u30ED\u30B0\u3092\u691C\u7D22\u3059\u308B\u30EA\u30F3\u30AF\u3067\u3059\u3002`,
          sourceType: "fallback_search",
          confidence: "medium"
        }
      ];
      return res.json({
        candidates,
        isAiGrounded: false,
        message: "\u76F4\u63A5\u691C\u7D22\u7528\u306E\u30EA\u30F3\u30AF\u3092\u751F\u6210\u3057\u307E\u3057\u305F"
      });
    }
    try {
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `\u3042\u306A\u305F\u306F\u65E5\u672C\u306E\u30B0\u30EB\u30E1\u60C5\u5831\u30FB\u5E97\u8217\u691C\u7D22\u306E\u30B9\u30DA\u30B7\u30E3\u30EA\u30B9\u30C8\u3067\u3059\u3002
\u4EE5\u4E0B\u306E\u98F2\u98DF\u5E97\u306B\u3064\u3044\u3066\u3001WEB\u4E0A\u306E\u6700\u65B0\u60C5\u5831\u3092Google\u691C\u7D22\u30C4\u30FC\u30EB\u3092\u7528\u3044\u3066\u691C\u7D22\u3057\u3001\u6B63\u78BA\u306A\u300CGoogle\u30DE\u30C3\u30D7\u306EURL\u300D\u3068\u300C\u98DF\u3079\u30ED\u30B0(tabelog.com)\u306E\u5E97\u8217URL\u300D\u3092\u7279\u5B9A\u3057\u3066\u5019\u88DC\u3092\u63D0\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u3010\u691C\u7D22\u5BFE\u8C61\u5E97\u8217\u3011
- \u5E97\u8217\u540D: "${shopName}"
- \u30A8\u30EA\u30A2\u30FB\u6700\u5BC4\u99C5: "${shopArea || "\u5168\u56FD"}"

\u3010\u6307\u793A\u3011
1. \u3053\u306E\u5E97\u8217\u306E\u5B9F\u5728\u3059\u308B\u516C\u5F0F\u60C5\u5831\u3001Google\u30DE\u30C3\u30D7\u4E0A\u306E\u30DA\u30FC\u30B8URL\u3001\u304A\u3088\u3073\u98DF\u3079\u30ED\u30B0(tabelog.com)\u4E0A\u306E\u5E97\u8217\u8A73\u7D30URL\u3092\u63A2\u3057\u3066\u304F\u3060\u3055\u3044\u3002
2. \u98DF\u3079\u30ED\u30B0URL\u306F "https://tabelog.com/..." \u5F62\u5F0F\u306E\u500B\u5225\u5E97\u8217\u30DA\u30FC\u30B8URL\uFF08\u307E\u305F\u306F\u691C\u7D22\u7D50\u679C\u30DA\u30FC\u30B8URL\uFF09\u3092\u512A\u5148\u3057\u3066\u304F\u3060\u3055\u3044\u3002
3. Google\u30DE\u30C3\u30D7URL\u306F "https://www.google.com/maps/..." \u307E\u305F\u306F "https://maps.app.goo.gl/..." \u307E\u305F\u306F "https://maps.google.com/?q=..." \u3092\u63D0\u4F9B\u3057\u3066\u304F\u3060\u3055\u3044\u3002
4. \u5019\u88DC\u304C\u8907\u6570\u3042\u308B\u5834\u5408\u3084\u30C1\u30A7\u30FC\u30F3\u30FB\u8907\u6570\u5E97\u8217\u304C\u30D2\u30C3\u30C8\u3057\u305F\u5834\u5408\u306F\u3001\u6700\u3082\u5408\u81F4\u3059\u308B1\u301C2\u4EF6\u3092\u63D0\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002
5. \u51FA\u529B\u306F\u4EE5\u4E0B\u306EJSON\u5F62\u5F0F\u306E\u307F\u3067\u56DE\u7B54\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30B3\u30FC\u30C9\u30D6\u30ED\u30C3\u30AF\u306E\u30D0\u30C3\u30AF\u30AF\u30A9\u30FC\u30C8\u3082\u542B\u3081\u305A\u7D14\u7C8B\u306AJSON\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u3092\u51FA\u529B\u3059\u308B\u304B\u3001json\u30D6\u30ED\u30C3\u30AF\u3067\u51FA\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002

{
  "candidates": [
    {
      "title": "\u6B63\u5F0F\u306A\u5E97\u8217\u540D\uFF08\u4F8B: BISTRO MARCHE \u8868\u53C2\u9053\u5E97\uFF09",
      "address": "\u4F4F\u6240\u307E\u305F\u306F\u99C5\u5F92\u6B69\u60C5\u5831\uFF08\u4F8B: \u6771\u4EAC\u90FD\u6E2F\u533A\u5317\u9752\u5C713-5-1\uFF09",
      "googleMapsUrl": "Google\u30DE\u30C3\u30D7\u306EURL",
      "tabelogUrl": "\u98DF\u3079\u30ED\u30B0\u306E\u5E97\u8217\u30DA\u30FC\u30B8URL",
      "description": "\u5E97\u8217\u306E\u6982\u8981\u30FB\u7279\u5FB4\uFF08\u4F8B: \u8868\u53C2\u9053\u99C5A3\u51FA\u53E3\u5F92\u6B692\u5206\u3001\u958B\u653E\u7684\u306A\u30C6\u30E9\u30B9\u5E2D\u304C\u3042\u308B\u4EBA\u6C17\u30D3\u30B9\u30C8\u30ED\uFF09",
      "confidence": "high"
    }
  ]
}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.7-flash",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      const responseText = response.text || "";
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const webLinks = [];
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri) {
          webLinks.push({
            uri: chunk.web.uri,
            title: chunk.web.title || ""
          });
        }
      }
      const tabelogGrounding = webLinks.find(
        (l) => l.uri.includes("tabelog.com")
      );
      const mapsGrounding = webLinks.find(
        (l) => l.uri.includes("google.com/maps") || l.uri.includes("maps.app.goo.gl")
      );
      let parsedCandidates = [];
      try {
        let cleanJson = responseText.trim();
        if (cleanJson.startsWith("```json")) {
          cleanJson = cleanJson.replace(/^```json\s*/, "").replace(/```\s*$/, "");
        } else if (cleanJson.startsWith("```")) {
          cleanJson = cleanJson.replace(/^```\s*/, "").replace(/```\s*$/, "");
        }
        const data = JSON.parse(cleanJson);
        if (Array.isArray(data.candidates) && data.candidates.length > 0) {
          parsedCandidates = data.candidates.map((c, index) => {
            const gMap = c.googleMapsUrl && c.googleMapsUrl.startsWith("http") ? c.googleMapsUrl : mapsGrounding?.uri || fallbackGoogleMapsUrl;
            const tLog = c.tabelogUrl && c.tabelogUrl.startsWith("http") ? c.tabelogUrl : tabelogGrounding?.uri || fallbackTabelogUrl;
            return {
              id: `candidate-${index + 1}`,
              title: c.title || `${shopName} (${shopArea})`,
              address: c.address || void 0,
              googleMapsUrl: gMap,
              tabelogUrl: tLog,
              description: c.description || void 0,
              sourceType: "ai_grounded",
              confidence: c.confidence || "high"
            };
          });
        }
      } catch (parseError) {
        console.warn("JSON parse warning from Gemini response:", parseError);
      }
      if (parsedCandidates.length === 0) {
        const bestMapsUrl = mapsGrounding?.uri || fallbackGoogleMapsUrl;
        const bestTabelogUrl = tabelogGrounding?.uri || fallbackTabelogUrl;
        parsedCandidates = [
          {
            id: "candidate-ai-1",
            title: `${shopName}${shopArea ? ` (${shopArea})` : ""}`,
            googleMapsUrl: bestMapsUrl,
            tabelogUrl: bestTabelogUrl,
            description: responseText ? responseText.slice(0, 140).replace(/[{}[\]"]/g, "").trim() : `AI\u304C\u691C\u7D22\u3057\u305F\u300C${fallbackQuery}\u300D\u306E\u5E97\u8217\u30EA\u30F3\u30AF\u60C5\u5831\u3067\u3059\u3002`,
            sourceType: "ai_generated",
            confidence: "medium"
          }
        ];
      }
      return res.json({
        candidates: parsedCandidates,
        isAiGrounded: true,
        groundingSourcesCount: webLinks.length
      });
    } catch (err) {
      console.error("Error during AI link search:", err);
      const fallbackCandidates = [
        {
          id: "fallback-error",
          title: `${shopName}\uFF08${shopArea || "\u30A8\u30EA\u30A2\u691C\u7D22"}\uFF09`,
          googleMapsUrl: fallbackGoogleMapsUrl,
          tabelogUrl: fallbackTabelogUrl,
          description: `\u691C\u7D22\u30AF\u30A8\u30EA\u300C${fallbackQuery}\u300D\u3067\u4F5C\u6210\u3057\u305FGoogle\u30DE\u30C3\u30D7\u30FB\u98DF\u3079\u30ED\u30B0\u306E\u691C\u7D22\u30EA\u30F3\u30AF\u3067\u3059\u3002`,
          sourceType: "fallback_search",
          confidence: "medium"
        }
      ];
      return res.json({
        candidates: fallbackCandidates,
        isAiGrounded: false,
        warning: "AI\u691C\u7D22\u304C\u4E00\u6642\u7684\u306B\u5229\u7528\u3067\u304D\u306A\u3044\u305F\u3081\u3001\u76F4\u63A5\u691C\u7D22\u30EA\u30F3\u30AF\u3092\u751F\u6210\u3057\u307E\u3057\u305F\u3002"
      });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
