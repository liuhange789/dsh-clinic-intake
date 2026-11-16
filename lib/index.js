// src/host/index.js
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { defineTool } from "@deepseek-ai/dsh-tools";

// src/core/extract.js
var ANSWER_FIELDS = Object.freeze([
  "chief",
  "duration",
  "medications",
  "allergies",
  "history",
  "extra"
]);
var NONE_MARKERS = Object.freeze([
  "\u65E0",
  "\u6CA1\u6709",
  "\u6CA1",
  "\u5426",
  "\u5426\u8BA4",
  "\u672A\u670D\u7528",
  "\u672A\u7528\u836F",
  "\u4E0D\u6E05\u695A",
  "\u4E0D\u8BB0\u5F97",
  "\u6682\u65E0",
  "\u90FD\u6CA1\u6709",
  "\u672A\u586B\u5199",
  "\u672A\u4F5C\u7B54",
  "\u672A\u63D0\u4F9B",
  "none",
  "no",
  "n/a",
  "-"
]);
var PLACEHOLDER_MARKERS = Object.freeze(["\u672A\u586B\u5199", "\u672A\u4F5C\u7B54", "\u672A\u63D0\u4F9B", "\u672A\u586B"]);
var NONE_EXCEPTIONS = /^无(?:痛|创|糖|菌)/;
var NAME_STOPWORDS = Object.freeze(/* @__PURE__ */ new Set([
  "\u9AD8\u8840\u538B",
  "\u7CD6\u5C3F\u75C5",
  "\u8D2B\u8840",
  "\u8FC7\u654F",
  "\u60A3\u8005",
  "\u75C5\u4EBA",
  "\u533B\u751F",
  "\u7537\u6027",
  "\u5973\u6027",
  "\u8001\u4EBA",
  "\u5B69\u5B50",
  "\u5B55\u5987",
  "\u5934\u75DB",
  "\u5934\u6655",
  "\u53D1\u70E7",
  "\u611F\u5192",
  "\u672C\u4EBA"
]));
var PHI_RULES = Object.freeze([
  {
    // 手机号：允许空格 / 连字符分组，也允许 +86 前缀。
    kind: "phone",
    pattern: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d(?:[-\s]?\d){8}(?!\d)/g
  },
  { kind: "id-card", pattern: /(?<!\d)\d{17}[\dXx](?!\d)/g },
  { kind: "email", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  {
    // “姓名：/我叫/我是”后接 2-4 个汉字；常见非姓名短语（高血压等）不擦。
    kind: "name-label",
    pattern: /(?:我叫|我是|患者姓名|姓名|名字)\s*[:：]?\s*([\u4e00-\u9fa5]{2,4})(?![\u4e00-\u9fa5])/g,
    keep: (name2) => !NAME_STOPWORDS.has(name2)
  }
]);
var LOCATIONS = Object.freeze([
  { name: "\u592A\u9633\u7A74", pattern: /太阳穴|颞部|鬓角/ },
  { name: "\u540E\u6795\u90E8", pattern: /后脑|后枕|枕部|脖子后面/ },
  { name: "\u5934\u90E8", pattern: /头|脑袋|脑门|头顶|偏头痛/ },
  { name: "\u54BD\u5589", pattern: /咽喉|喉咙|嗓子|咽部/ },
  { name: "\u80F8\u90E8", pattern: /胸口|胸部|心口|胸前/ },
  { name: "\u4E0A\u8179\u90E8", pattern: /上腹|胃部|胃|心窝|中上腹/ },
  { name: "\u4E0B\u8179\u90E8", pattern: /下腹|小腹|肚脐下/ },
  { name: "\u8179\u90E8", pattern: /腹|肚子|肚脐|脐周/ },
  { name: "\u8170\u90E8", pattern: /腰|腰部|腰背/ },
  { name: "\u80CC\u90E8", pattern: /后背|背部|脊背|肩胛/ },
  { name: "\u9888\u90E8", pattern: /脖子|颈部|颈椎/ },
  { name: "\u80A9\u90E8", pattern: /肩膀|肩部|肩关节/ },
  { name: "\u5173\u8282", pattern: /关节|膝盖|膝关节|手腕|脚踝|手指/ },
  { name: "\u76AE\u80A4", pattern: /皮肤|皮疹|疹子|身上起|红斑|湿疹|瘙痒/ },
  { name: "\u773C\u90E8", pattern: /眼睛|眼部|眼睑|眼球/ },
  { name: "\u8033\u90E8", pattern: /耳朵|耳部|耳道/ },
  { name: "\u7259\u9F7F", pattern: /牙|牙齿|牙龈/ },
  { name: "\u4E0B\u80A2", pattern: /腿|小腿|大腿|脚/ },
  { name: "\u7761\u7720", pattern: /失眠|睡不着|睡不好|入睡困难|早醒/ }
]);
var CHARACTERS = Object.freeze([
  { name: "\u7EDE\u75DB", pattern: /绞痛|拧着疼|揪着疼/ },
  { name: "\u523A\u75DB", pattern: /刺痛|针扎|扎着疼/ },
  { name: "\u8DF3\u75DB", pattern: /跳痛|一跳一跳|搏动性/ },
  { name: "\u5200\u5272\u6837\u75DB", pattern: /刀割|撕裂|撕扯/ },
  { name: "\u70E7\u707C\u611F", pattern: /烧灼|烧心|灼热|火辣/ },
  { name: "\u80C0\u75DB", pattern: /胀痛|发胀|胀得/ },
  { name: "\u95F7\u75DB", pattern: /闷痛|发闷|闷得/ },
  { name: "\u538B\u8FEB\u611F", pattern: /压迫|压着|压榨|紧箍/ },
  { name: "\u9690\u75DB", pattern: /隐痛|隐隐|轻微疼/ },
  { name: "\u949D\u75DB", pattern: /钝痛/ },
  { name: "\u5E72\u54B3", pattern: /干咳|没有痰|无痰/ },
  { name: "\u54B3\u75F0", pattern: /咳痰|有痰|痰多/ },
  { name: "\u7619\u75D2", pattern: /痒|瘙痒|发痒/ },
  { name: "\u5934\u6655", pattern: /头晕|眩晕|晕乎|发晕/ },
  { name: "\u4E4F\u529B", pattern: /乏力|没劲|没力气|疲乏/ }
]);
var DURATION_PATTERNS = Object.freeze([
  /(?<!第)(\d{1,3}(?:\.\d)?|[一二三四五六七八九十两百半几]+)\s*(?:个)?\s*(小时|天|日|周|星期|礼拜|月|年)(?:左右|多|余)?/,
  /(半天|一天|两天|好几天|好几个月|大半年|半年|一年多|多年|很久|反复发作)/,
  /(?:从|自)\s*[^，。；,;]{2,12}\s*(?:开始|起)/
]);
var ORDINAL_DAY_PATTERN = /第\s*([0-9]{1,3}|[一二三四五六七八九十两]{1,3})\s*天/g;
var FREQUENCY_PATTERN = /(?:每日|每天|一天|一日|每晚|睡前|按需|必要时|每次)\s*[^，。；、,;]{0,10}|(?:\d+|[一二两三四五六七八九十半])\s*次\s*(?:\/[每]?\s*(?:日|天)|日|天)|(?:bid|tid|qd|qid|q\d+h)/gi;
var DOSE_PATTERN = /(?:[0-9]+(?:\.[0-9]+)?\s*(?:mg|g|ml|μg|ug|iu|片|粒|袋|支|丸|喷|滴|贴|包)|(?:一|两|二|三|四|半|[1-4])\s*(?:片|粒|袋|支|丸|喷|滴|贴|包))/gi;
var CATEGORY_RULES = Object.freeze([
  { name: "\u7761\u7720\u4E0E\u60C5\u7EEA", pattern: /失眠|睡不着|睡不好|入睡|早醒|焦虑|心情|情绪|压力/ },
  { name: "\u76AE\u80A4", pattern: /皮肤|皮疹|疹子|湿疹|红斑|瘙痒|起包/ },
  { name: "\u547C\u5438", pattern: /咳|咳嗽|痰|喘|鼻塞|流鼻涕|气短|呼吸/ },
  { name: "\u6D88\u5316", pattern: /腹|胃|肚|恶心|呕吐|拉肚子|腹泻|便秘|反酸|烧心/ },
  { name: "\u75BC\u75DB", pattern: /痛|疼|酸|麻|胀|抽筋/ }
]);
function normalizeValue(text) {
  return String(text ?? "").trim().toLowerCase().replace(/[。！!，,；;：:\s]/g, "");
}
function scrubPhi(text) {
  let result = String(text ?? "");
  const hits = [];
  for (const rule of PHI_RULES) {
    rule.pattern.lastIndex = 0;
    let matched = false;
    result = result.replace(rule.pattern, (match, ...rest) => {
      const captured = typeof rest[0] === "string" ? rest[0] : "";
      if (rule.keep && !rule.keep(captured)) return match;
      matched = true;
      return "[\u5DF2\u9690\u53BB]";
    });
    if (matched) hits.push({ kind: rule.kind });
  }
  return { text: result.trim(), hits };
}
function isNone(text) {
  const value = normalizeValue(text);
  if (!value) return true;
  if (value.length > 8) return false;
  if (NONE_EXCEPTIONS.test(value)) return false;
  return NONE_MARKERS.some((marker) => value === marker || value.startsWith(marker));
}
function isPlaceholder(text) {
  const value = normalizeValue(text);
  return !value || PLACEHOLDER_MARKERS.some((marker) => value === marker);
}
function splitItems(text) {
  return String(text ?? "").split(/[、，,；;。\n/]|和|及/).map((item) => item.trim()).filter((item) => item.length > 0);
}
function detectComplaintShape(text) {
  const source = String(text ?? "");
  const location = LOCATIONS.find((item) => item.pattern.test(source))?.name ?? "";
  const character = CHARACTERS.find((item) => item.pattern.test(source))?.name ?? "";
  return { location, character };
}
function toNumber(text) {
  const raw = String(text ?? "").trim();
  if (/^[0-9]+$/.test(raw)) return Number(raw);
  const digits = { \u4E00: 1, \u4E8C: 2, \u4E24: 2, \u4E09: 3, \u56DB: 4, \u4E94: 5, \u516D: 6, \u4E03: 7, \u516B: 8, \u4E5D: 9 };
  if (raw === "\u5341") return 10;
  const tenIndex = raw.indexOf("\u5341");
  if (tenIndex >= 0) {
    const tens = tenIndex === 0 ? 1 : digits[raw[tenIndex - 1]] ?? 0;
    const ones = tenIndex === raw.length - 1 ? 0 : digits[raw[tenIndex + 1]] ?? 0;
    return tens * 10 + ones;
  }
  return digits[raw] ?? 0;
}
function detectDuration(explicitDuration, chief) {
  const direct = String(explicitDuration ?? "").trim().replace(/\s+/g, "");
  if (direct && !isNone(direct)) return direct;
  const source = String(chief ?? "");
  const withoutOrdinal = source.replace(ORDINAL_DAY_PATTERN, " ");
  for (const pattern of DURATION_PATTERNS) {
    const match = withoutOrdinal.match(pattern);
    if (match) return match[0].replace(/\s+/g, "");
  }
  ORDINAL_DAY_PATTERN.lastIndex = 0;
  const ordinal = ORDINAL_DAY_PATTERN.exec(source);
  if (ordinal) {
    const days = toNumber(ordinal[1]);
    if (days > 0) return `${days}\u5929`;
  }
  return "";
}
function splitMedicationEntries(text) {
  return String(text ?? "").split(/[；;。\n]/).map((entry) => entry.trim()).filter(Boolean);
}
function cleanMedicationName(text) {
  return String(text ?? "").replace(/[（(][^)）]*[)）]/g, " ").replace(DOSE_PATTERN, " ").replace(/\s+/g, " ").trim().replace(/^(?:正在|在|吃了|服用|用了|口服|打过|外用|顿服)\s*/, "").trim().replace(/[，,；;、。：:\s]+$/g, "").replace(/^[，,；;、。：:\s]+/g, "").trim();
}
function extractMedications(text) {
  if (isNone(String(text ?? ""))) return [];
  const medications = [];
  for (const entry of splitMedicationEntries(text)) {
    const frequencyParts = [];
    const namePart = entry.replace(FREQUENCY_PATTERN, (match) => {
      const value = match.trim();
      if (value) frequencyParts.push(value);
      return "\uFF0C";
    });
    const frequency = frequencyParts.join("\uFF0C").trim().slice(0, 20);
    for (const segment of namePart.split(/[，,；;。、]|和|及|与|＆|&|＋|\+/)) {
      const name2 = cleanMedicationName(segment);
      if (!name2 || isNone(name2)) continue;
      const item = { name: name2.slice(0, 30), frequency };
      if (medications.some((existing) => existing.name === item.name && existing.frequency === item.frequency)) continue;
      medications.push(item);
    }
  }
  return medications;
}
function extractList(text) {
  if (isNone(String(text ?? ""))) return [];
  return splitItems(text).map((item) => item.replace(/^(对|有|曾经|以前)\s*/, "").trim()).map((item) => item.replace(/^(但|但是|不过|可是|然而)\s*/, "").trim()).filter((item) => item && !isNone(item)).map((item) => item.slice(0, 40));
}
function earliestCategory(text) {
  const source = String(text ?? "");
  let best = null;
  for (const rule of CATEGORY_RULES) {
    const index = source.search(rule.pattern);
    if (index < 0) continue;
    if (!best || index < best.index) best = { name: rule.name, index };
  }
  return best;
}
function classifyReason(chief, rest) {
  const primary = String(chief ?? "");
  const clauses = primary.split(/[，,、；;。]/).map((clause) => clause.trim()).filter(Boolean);
  const main = clauses[0] ?? "";
  const others = clauses.slice(1).join("\uFF0C");
  return earliestCategory(main)?.name ?? earliestCategory(others)?.name ?? earliestCategory(rest)?.name ?? "\u5176\u4ED6";
}
function extractAnswers(input = {}) {
  const raw = {};
  const redactions = [];
  for (const field of ANSWER_FIELDS) {
    const value = typeof input[field] === "string" ? input[field] : "";
    const scrubbed = scrubPhi(value);
    raw[field] = scrubbed.text;
    for (const hit of scrubbed.hits) redactions.push({ field, kind: hit.kind });
  }
  const shape = detectComplaintShape(raw.chief);
  const duration = detectDuration(raw.duration, raw.chief);
  const medications = extractMedications(raw.medications);
  const allergies = extractList(raw.allergies);
  const pastHistory = extractList(raw.history);
  const freeText = raw.extra.slice(0, 240);
  const haystack = `${raw.duration} ${raw.medications} ${raw.allergies} ${raw.history} ${raw.extra}`;
  const missing = [];
  if (isPlaceholder(raw.chief)) missing.push("chief");
  if (!duration) missing.push("duration");
  if (isPlaceholder(raw.medications)) missing.push("medications");
  if (isPlaceholder(raw.allergies)) missing.push("allergies");
  if (isPlaceholder(raw.history)) missing.push("history");
  return {
    chief_complaint: {
      location: shape.location,
      character: shape.character,
      duration,
      raw: raw.chief.slice(0, 120)
    },
    medications,
    allergies,
    past_history: pastHistory,
    free_text: freeText,
    reason_category: classifyReason(`${raw.chief} ${duration}`, haystack),
    missing_fields: missing,
    phi_redactions: redactions
  };
}
var LABEL_MAP = Object.freeze([
  { field: "chief", pattern: /^(?:主诉|今天主要哪里不舒服|哪里不舒服|怎么了)[:：]?\s*/ },
  { field: "duration", pattern: /^(?:病程|持续|多久|这种情况多久了)[:：]?\s*/ },
  { field: "medications", pattern: /^(?:用药|用药史|在吃什么药|吃什么药)[:：]?\s*/ },
  { field: "allergies", pattern: /^(?:过敏|过敏史|有没有过敏)[:：]?\s*/ },
  { field: "history", pattern: /^(?:既往|既往史|以前得过什么病|既往病史)[:：]?\s*/ },
  { field: "extra", pattern: /^(?:补充|还有什么想告诉医生)[:：]?\s*/ }
]);
function parseLabeledAnswers(text) {
  const answers = {};
  for (const field of ANSWER_FIELDS) answers[field] = [];
  const lines = String(text ?? "").split(/\r?\n/);
  let current = null;
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*·]\s*/, "");
    if (!trimmed) continue;
    const label = LABEL_MAP.find((entry) => entry.pattern.test(trimmed));
    if (label) {
      current = label.field;
      answers[current].push(trimmed.replace(label.pattern, "").trim());
      continue;
    }
    if (current) answers[current].push(trimmed);
  }
  const joined = {};
  for (const field of ANSWER_FIELDS) joined[field] = answers[field].join("\uFF0C").trim();
  return joined;
}
function formatLabeledAnswers(input = {}) {
  const labels = {
    chief: "\u4E3B\u8BC9",
    duration: "\u75C5\u7A0B",
    medications: "\u7528\u836F",
    allergies: "\u8FC7\u654F",
    history: "\u65E2\u5F80",
    extra: "\u8865\u5145"
  };
  return ANSWER_FIELDS.map((field) => {
    const value = scrubPhi(String(input[field] ?? "")).text;
    return `${labels[field]}\uFF1A${value || "\u672A\u586B\u5199"}`;
  }).join("\n");
}

// src/core/page.js
function buildIntakePage(options = {}) {
  const title = String(options.title || "\u5C31\u8BCA\u524D\u4FE1\u606F\u586B\u5199");
  const clinicName = String(options.clinicName || "");
  const header = clinicName ? `${clinicName} \xB7 ${title}` : title;
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 20px;
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f6f7f9; color: #1b1f24;
    font-size: 16px; line-height: 1.6;
  }
  .wrap { max-width: 560px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #646b76; font-size: 13px; margin-bottom: 18px; }
  .card {
    background: #fff; border: 1px solid #e3e6eb; border-radius: 14px;
    padding: 20px; box-shadow: 0 1px 2px rgba(16,24,40,.04);
  }
  .step { color: #646b76; font-size: 13px; margin-bottom: 8px; }
  .q { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
  .hint { color: #646b76; font-size: 13px; margin-bottom: 12px; }
  textarea {
    width: 100%; min-height: 120px; padding: 12px;
    border: 1px solid #d8dce3; border-radius: 10px;
    font: inherit; resize: vertical; background: #fff; color: inherit;
  }
  textarea:focus { outline: 2px solid #3b82f6; outline-offset: 1px; border-color: transparent; }
  .row { display: flex; gap: 10px; margin-top: 16px; }
  button {
    font: inherit; padding: 10px 18px; border-radius: 10px; cursor: pointer;
    border: 1px solid #d3d8df; background: #fff; color: inherit;
  }
  button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .out {
    white-space: pre-wrap; font-family: inherit;
    background: #f8fafc; border: 1px solid #e3e6eb; border-radius: 10px;
    padding: 12px; min-height: 160px;
  }
  .note { color: #8a919c; font-size: 12px; margin-top: 14px; }
  .toast { color: #16a34a; font-size: 13px; margin-left: 8px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(header)}</h1>
  <div class="sub">\u7EA6 1 \u5206\u949F\u3002\u8BF7\u53EA\u586B\u5199\u75C7\u72B6\u4FE1\u606F\uFF0C\u4E0D\u8981\u586B\u5199\u59D3\u540D\u3001\u8EAB\u4EFD\u8BC1\u53F7\u6216\u7535\u8BDD\u53F7\u7801\u3002</div>
  <div class="card" id="card"></div>
  <div class="note">\u672C\u9875\u9762\u4E0D\u8054\u7F51\u3001\u4E0D\u4FDD\u5B58\u5185\u5BB9\uFF0C\u5237\u65B0\u5373\u6E05\u7A7A\u3002\u6574\u7406\u7ED3\u679C\u4EC5\u4F9B\u533B\u751F\u5FEB\u901F\u4E86\u89E3\u60C5\u51B5\uFF0C\u4E0D\u542B\u8BCA\u65AD\u6216\u7528\u836F\u5EFA\u8BAE\u3002</div>
</div>
<script>
(function () {
  var QUESTIONS = [
    { label: '\u4ECA\u5929\u4E3B\u8981\u54EA\u91CC\u4E0D\u8212\u670D\uFF1F', hint: '\u8BF4\u8BF4\u6700\u96BE\u53D7\u7684\u90E8\u4F4D\u548C\u611F\u89C9\uFF0C\u6BD4\u5982\u201C\u53F3\u8FB9\u592A\u9633\u7A74\u4E00\u8DF3\u4E00\u8DF3\u5730\u75BC\u201D\u3002', placeholder: '\u4F8B\u5982\uFF1A\u53F3\u8FB9\u592A\u9633\u7A74\u4E00\u8DF3\u4E00\u8DF3\u5730\u75BC', tag: '\u4E3B\u8BC9' },
    { label: '\u8FD9\u79CD\u60C5\u51B5\u591A\u4E45\u4E86\uFF1F', hint: '\u5927\u6982\u65F6\u95F4\u5C31\u884C\uFF0C\u6BD4\u5982 3 \u5929\u3001\u4E24\u4E2A\u661F\u671F\u3001\u534A\u5E74\u3002', placeholder: '\u4F8B\u5982\uFF1A3 \u5929', tag: '\u75C5\u7A0B' },
    { label: '\u6709\u6CA1\u6709\u5728\u5403\u4EC0\u4E48\u836F\uFF1F', hint: '\u836F\u540D\u548C\u5403\u6CD5\uFF0C\u6CA1\u6709\u5C31\u5199\u201C\u6CA1\u6709\u201D\u3002', placeholder: '\u4F8B\u5982\uFF1A\u5E03\u6D1B\u82AC\uFF0C\u6BCF\u5929\u4E09\u6B21\uFF0C\u6BCF\u6B21\u4E00\u7247', tag: '\u7528\u836F' },
    { label: '\u6709\u6CA1\u6709\u836F\u7269\u6216\u98DF\u7269\u8FC7\u654F\uFF1F', hint: '\u5BF9\u4EC0\u4E48\u8FC7\u654F\u3001\u8FC7\u654F\u65F6\u4EC0\u4E48\u8868\u73B0\uFF0C\u6CA1\u6709\u5C31\u5199\u201C\u6CA1\u6709\u201D\u3002', placeholder: '\u4F8B\u5982\uFF1A\u9752\u9709\u7D20\u8FC7\u654F\uFF0C\u8D77\u76AE\u75B9', tag: '\u8FC7\u654F' },
    { label: '\u4EE5\u524D\u6709\u6CA1\u6709\u5F97\u8FC7\u4EC0\u4E48\u75C5\uFF1F', hint: '\u6162\u6027\u75C5\u3001\u505A\u8FC7\u7684\u624B\u672F\u90FD\u53EF\u4EE5\u8BF4\uFF0C\u6CA1\u6709\u5C31\u5199\u201C\u6CA1\u6709\u201D\u3002', placeholder: '\u4F8B\u5982\uFF1A\u9AD8\u8840\u538B 5 \u5E74', tag: '\u65E2\u5F80' },
    { label: '\u8FD8\u6709\u4EC0\u4E48\u60F3\u544A\u8BC9\u533B\u751F\u7684\uFF1F', hint: '\u7761\u7720\u3001\u996E\u98DF\u3001\u60C5\u7EEA\uFF0C\u6216\u8005\u5176\u4ED6\u62C5\u5FC3\u7684\u4E8B\uFF0C\u53EF\u4EE5\u7559\u7A7A\u3002', placeholder: '\u4F8B\u5982\uFF1A\u8FD9\u4E24\u5929\u665A\u4E0A\u51E0\u4E4E\u6CA1\u7761\u7740', tag: '\u8865\u5145' }
  ];
  var answers = ['', '', '', '', '', ''];
  var index = 0;
  var card = document.getElementById('card');

  function render() {
    var q = QUESTIONS[index];
    var html = '';
    html += '<div class="step">\u7B2C ' + (index + 1) + ' / ' + QUESTIONS.length + ' \u95EE</div>';
    html += '<div class="q">' + q.label + '</div>';
    html += '<div class="hint">' + q.hint + '</div>';
    html += '<textarea id="answer" placeholder="' + q.placeholder + '"></textarea>';
    html += '<div class="row">';
    html += '<button id="prev"' + (index === 0 ? ' disabled' : '') + '>\u4E0A\u4E00\u9898</button>';
    html += '<button class="primary" id="next">' + (index === QUESTIONS.length - 1 ? '\u751F\u6210\u7ED3\u679C' : '\u4E0B\u4E00\u9898') + '</button>';
    html += '</div>';
    card.innerHTML = html;
    var area = document.getElementById('answer');
    area.value = answers[index];
    area.focus();
    document.getElementById('prev').onclick = function () { save(); if (index > 0) { index -= 1; render(); } };
    document.getElementById('next').onclick = function () { save(); if (index < QUESTIONS.length - 1) { index += 1; render(); } else { showResult(); } };
    area.oninput = function () { answers[index] = area.value; };
  }

  function save() {
    var area = document.getElementById('answer');
    if (area) answers[index] = area.value;
  }

  function showResult() {
    var text = answers.map(function (value, i) {
      var v = value.replace(/\\s+/g, ' ').trim();
      return QUESTIONS[i].tag + '\uFF1A' + (v || '\u672A\u586B\u5199');
    }).join('\\n');
    var html = '';
    html += '<div class="q">\u586B\u597D\u4E86\uFF0C\u8BF7\u628A\u8FD9\u6BB5\u5185\u5BB9\u4EA4\u7ED9\u533B\u751F</div>';
    html += '<div class="hint">\u53EF\u4EE5\u70B9\u201C\u590D\u5236\u201D\uFF0C\u4E5F\u53EF\u4EE5\u8BF7\u533B\u751F\u76F4\u63A5\u8BFB\u3002</div>';
    html += '<div class="out" id="out"></div>';
    html += '<div class="row">';
    html += '<button id="back">\u8FD4\u56DE\u4FEE\u6539</button>';
    html += '<button class="primary" id="copy">\u590D\u5236</button><span class="toast" id="toast"></span>';
    html += '</div>';
    card.innerHTML = html;
    var out = document.getElementById('out');
    out.textContent = text;
    document.getElementById('back').onclick = function () { index = QUESTIONS.length - 1; render(); };
    document.getElementById('copy').onclick = function () {
      var done = function () { document.getElementById('toast').textContent = '\u5DF2\u590D\u5236'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { selectOut(); });
      } else {
        selectOut();
      }
    };
    function selectOut() {
      var range = document.createRange();
      range.selectNodeContents(out);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.getElementById('toast').textContent = '\u5DF2\u9009\u4E2D\uFF0C\u8BF7\u957F\u6309\u6216\u6309\u952E\u590D\u5236';
    }
  }

  render();
})();
</script>
</body>
</html>
`;
}
function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/core/summary.js
var SUMMARY_MAX_CHARS = 300;
var NOTE = "\u6CE8\uFF1A\u4EE5\u4E0A\u4E3A\u60A3\u8005\u81EA\u8FF0\u6574\u7406\uFF0C\u4E0D\u542B\u8BCA\u65AD\u4E0E\u7528\u836F\u5EFA\u8BAE\u3002";
function countChars(text) {
  return Array.from(String(text ?? "")).length;
}
function clip(text, limit) {
  const chars = Array.from(String(text ?? ""));
  if (chars.length <= limit) return chars.join("");
  if (limit <= 1) return "\u2026";
  return `${chars.slice(0, limit - 1).join("")}\u2026`;
}
function renderChief(complaint, rawLimit) {
  const location = complaint?.location || "";
  const character = complaint?.character || "";
  const duration = complaint?.duration || "";
  const shape = [location, character].filter(Boolean).join("\xB7");
  if (shape) {
    return duration ? `\u4E3B\u8BC9\uFF1A${shape}\uFF0C\u6301\u7EED${duration}` : `\u4E3B\u8BC9\uFF1A${shape}`;
  }
  const raw = String(complaint?.raw ?? "").trim();
  if (raw) {
    const body = clip(raw, rawLimit);
    return duration ? `\u4E3B\u8BC9\uFF1A${body}\uFF0C\u6301\u7EED${duration}` : `\u4E3B\u8BC9\uFF1A${body}`;
  }
  return "\u4E3B\u8BC9\uFF1A\u672A\u586B\u5199";
}
function renderEntries(label, items, count, format) {
  const values = (items ?? []).filter(Boolean);
  if (values.length === 0) return `${label}\uFF1A\u672A\u63D0\u4F9B`;
  const kept = values.slice(0, Math.max(1, count)).map(format);
  const suffix = values.length > kept.length ? "\u7B49" : "";
  return `${label}\uFF1A${kept.join("\uFF1B")}${suffix}`;
}
function formatMedication(item) {
  const name2 = clip(item?.name ?? "", 24);
  const frequency = String(item?.frequency ?? "").trim();
  return frequency ? `${name2}\uFF08${frequency}\uFF09` : name2;
}
function buildSummary(structured, options = {}) {
  const maxChars = Math.min(Number(options.maxChars) || SUMMARY_MAX_CHARS, SUMMARY_MAX_CHARS);
  const complaint = structured?.chief_complaint ?? {};
  const medications = structured?.medications ?? [];
  const allergies = structured?.allergies ?? [];
  const history = structured?.past_history ?? [];
  const category = structured?.reason_category || "\u5176\u4ED6";
  let extra = String(structured?.free_text ?? "").trim();
  let rawLimit = 60;
  let medCount = medications.length;
  let historyCount = history.length;
  let allergyCount = allergies.length;
  let trimmed = false;
  const allergyLine = () => renderEntries("\u8FC7\u654F", allergies, allergyCount, (item) => clip(item, 34));
  const headLines = () => {
    const lines = ["\u3010\u5C31\u8BCA\u6458\u8981\u3011", renderChief(complaint, rawLimit)];
    if (category !== "\u5176\u4ED6") lines.push(`\u5206\u7C7B\uFF1A${category}`);
    lines.push(renderEntries("\u7528\u836F", medications, medCount, formatMedication));
    lines.push(renderEntries("\u65E2\u5F80", history, historyCount, (item) => clip(item, 34)));
    if (extra) lines.push(`\u8865\u5145\uFF1A${extra}`);
    return lines;
  };
  const render = () => [...headLines(), allergyLine(), NOTE].join("\n");
  let text = render();
  while (countChars(text) > maxChars && extra.length > 0) {
    const length = Array.from(extra).length;
    extra = length <= 1 ? "" : clip(extra, Math.max(0, Math.floor(length * 0.7)));
    trimmed = true;
    text = render();
  }
  while (countChars(text) > maxChars && medCount > 1) {
    medCount = Math.max(1, Math.floor(medCount / 2));
    trimmed = true;
    text = render();
  }
  while (countChars(text) > maxChars && historyCount > 1) {
    historyCount = Math.max(1, Math.floor(historyCount / 2));
    trimmed = true;
    text = render();
  }
  while (countChars(text) > maxChars && allergyCount > 1) {
    allergyCount = Math.max(1, Math.floor(allergyCount / 2));
    trimmed = true;
    text = render();
  }
  while (countChars(text) > maxChars && rawLimit > 8) {
    rawLimit = Math.floor(rawLimit / 2);
    trimmed = true;
    text = render();
  }
  if (countChars(text) > maxChars) {
    trimmed = true;
    const tail = [allergyLine(), NOTE].join("\n");
    const budget = maxChars - countChars(tail) - 1;
    text = `${clip(headLines().join("\n"), Math.max(1, budget))}
${tail}`;
  }
  return { text, chars: countChars(text), trimmed };
}

// src/host/index.js
var name = "clinic-intake";
var inject = ["tools"];
var EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    summary_chars: { type: "number" },
    chief_complaint: {
      type: "object",
      additionalProperties: false,
      properties: {
        location: { type: "string" },
        character: { type: "string" },
        duration: { type: "string" },
        raw: { type: "string" }
      }
    },
    medications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          frequency: { type: "string" }
        }
      }
    },
    allergies: { type: "array", items: { type: "string" } },
    past_history: { type: "array", items: { type: "string" } },
    free_text: { type: "string" },
    reason_category: { type: "string" },
    missing_fields: { type: "array", items: { type: "string" } },
    phi_redactions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          field: { type: "string" },
          kind: { type: "string" }
        }
      }
    },
    labeled_text: { type: "string" }
  }
};
var PAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    file_path: { type: "string" },
    questions: { type: "number" },
    message: { type: "string" }
  }
};
function resolveAnswers(args) {
  const parsed = typeof args.text === "string" && args.text.trim() ? parseLabeledAnswers(args.text) : {};
  const answers = {};
  for (const field of ANSWER_FIELDS) {
    const direct = typeof args[field] === "string" ? args[field] : "";
    answers[field] = direct.trim() ? direct : parsed[field] ?? "";
  }
  return answers;
}
function renderExtract(args, value) {
  const lines = [value.summary, ""];
  lines.push(`\u5206\u7C7B\u6807\u7B7E\uFF1A${value.reason_category}`);
  lines.push(`\u4E3B\u8BC9\u5B57\u6BB5\uFF1A\u90E8\u4F4D=${value.chief_complaint.location || "\u672A\u8BC6\u522B"}\uFF1B\u6027\u8D28=${value.chief_complaint.character || "\u672A\u8BC6\u522B"}\uFF1B\u75C5\u7A0B=${value.chief_complaint.duration || "\u672A\u63D0\u4F9B"}`);
  lines.push(`\u7528\u836F\u6761\u76EE\uFF1A${value.medications.length === 0 ? "\u672A\u63D0\u4F9B" : value.medications.map((item) => `${item.name}${item.frequency ? `\uFF08${item.frequency}\uFF09` : ""}`).join("\uFF1B")}`);
  lines.push(`\u8FC7\u654F\u6761\u76EE\uFF1A${value.allergies.length === 0 ? "\u672A\u63D0\u4F9B" : value.allergies.join("\uFF1B")}`);
  lines.push(`\u65E2\u5F80\u6761\u76EE\uFF1A${value.past_history.length === 0 ? "\u672A\u63D0\u4F9B" : value.past_history.join("\uFF1B")}`);
  if (value.missing_fields.length) lines.push(`\u672A\u586B\u5199\uFF1A${value.missing_fields.join("\u3001")}`);
  if (value.phi_redactions.length) {
    const kinds = Array.from(new Set(value.phi_redactions.map((item) => item.kind))).join("\u3001");
    lines.push(`\u5DF2\u9690\u53BB\u8EAB\u4EFD\u7C7B\u5185\u5BB9\uFF1A${kinds}\uFF08\u539F\u6587\u672A\u4FDD\u7559\uFF09`);
  }
  lines.push(`\u6458\u8981\u5B57\u6570\uFF1A${value.summary_chars}/300`);
  lines.push("\u53EF\u76F4\u63A5\u590D\u5236\u4E0A\u9762\u7684\u6458\u8981\u7C98\u8D34\u5230\u7535\u5B50\u75C5\u5386\u7CFB\u7EDF\uFF1B\u672C\u63D2\u4EF6\u4E0D\u63D0\u4F9B\u8BCA\u65AD\u6216\u7528\u836F\u5EFA\u8BAE\u3002");
  return [{ type: "text", text: lines.join("\n") }];
}
function renderPage(args, value) {
  return [{ type: "text", text: value.message }];
}
function apply(ctx) {
  ctx.tools.register(
    defineTool({
      name: "clinic_intake_extract",
      description: `Turn a patient's pre-visit answers into a structured intake summary for the doctor: chief complaint (location / character / duration), medications with frequency, allergies, past history, free text, and a reason-category tag. Rule and keyword extraction only \u2014 it never suggests a diagnosis, triage decision, or medication, and it drops phone numbers, ID numbers, emails and explicit name labels instead of keeping them. Output summary is capped at 300 Chinese characters. Accepts either six separate fields or one labeled block such as "\u4E3B\u8BC9\uFF1A\u2026\\n\u75C5\u7A0B\uFF1A\u2026".`,
      parameters: {
        chief: {
          type: "string",
          description: "\u4E3B\u8BC9\uFF1A\u4ECA\u5929\u4E3B\u8981\u54EA\u91CC\u4E0D\u8212\u670D\uFF08\u81EA\u7531\u63CF\u8FF0\uFF0C\u4F8B\u5982\u201C\u53F3\u8FB9\u592A\u9633\u7A74\u4E00\u8DF3\u4E00\u8DF3\u5730\u75BC\u201D\uFF09\u3002"
        },
        duration: {
          type: "string",
          description: "\u75C5\u7A0B\uFF1A\u8FD9\u79CD\u60C5\u51B5\u591A\u4E45\u4E86\uFF08\u4F8B\u5982\u201C3 \u5929\u201D\u201C\u534A\u5E74\u201D\uFF09\u3002"
        },
        medications: {
          type: "string",
          description: "\u7528\u836F\u53F2\uFF1A\u6B63\u5728\u5403\u7684\u836F\u4E0E\u5403\u6CD5\uFF0C\u6CA1\u6709\u5C31\u5199\u201C\u6CA1\u6709\u201D\u3002"
        },
        allergies: {
          type: "string",
          description: "\u8FC7\u654F\u53F2\uFF1A\u836F\u7269\u6216\u98DF\u7269\u8FC7\u654F\uFF0C\u6CA1\u6709\u5C31\u5199\u201C\u6CA1\u6709\u201D\u3002"
        },
        history: {
          type: "string",
          description: "\u65E2\u5F80\u53F2\uFF1A\u4EE5\u524D\u5F97\u8FC7\u7684\u75C5\u3001\u505A\u8FC7\u7684\u624B\u672F\uFF0C\u6CA1\u6709\u5C31\u5199\u201C\u6CA1\u6709\u201D\u3002"
        },
        extra: {
          type: "string",
          description: "\u8865\u5145\uFF1A\u5176\u4ED6\u60F3\u544A\u8BC9\u533B\u751F\u7684\u60C5\u51B5\uFF0C\u53EF\u7559\u7A7A\u3002"
        },
        text: {
          type: "string",
          description: "\u53EF\u9009\u3002\u60A3\u8005\u7AEF\u9875\u9762\u6216\u804A\u5929\u91CC\u7C98\u8D34\u51FA\u6765\u7684\u201C\u4E3B\u8BC9\uFF1A/\u75C5\u7A0B\uFF1A/\u7528\u836F\uFF1A/\u8FC7\u654F\uFF1A/\u65E2\u5F80\uFF1A/\u8865\u5145\uFF1A\u201D\u591A\u884C\u6587\u672C\uFF1B\u4E0E\u4E0A\u9762\u7684\u9010\u5B57\u6BB5\u53C2\u6570\u540C\u65F6\u51FA\u73B0\u65F6\uFF0C\u9010\u5B57\u6BB5\u53C2\u6570\u4F18\u5148\u3002"
        }
      },
      output: {
        schema: EXTRACT_SCHEMA,
        render: renderExtract
      },
      execute(args) {
        const answers = resolveAnswers(args);
        if (!ANSWER_FIELDS.some((field) => String(answers[field] ?? "").trim())) {
          throw new Error("\u6CA1\u6709\u6536\u5230\u4EFB\u4F55\u56DE\u7B54\uFF1A\u8BF7\u81F3\u5C11\u63D0\u4F9B chief\uFF08\u4E3B\u8BC9\uFF09\uFF0C\u6216\u63D0\u4F9B text \u6807\u7B7E\u6587\u672C\u3002");
        }
        const structured = extractAnswers(answers);
        const summary = buildSummary(structured);
        return {
          ...structured,
          summary: summary.text,
          summary_chars: summary.chars,
          labeled_text: formatLabeledAnswers(answers)
        };
      }
    })
  );
  ctx.tools.register(
    defineTool({
      name: "clinic_intake_page",
      description: "Write a self-contained, offline patient intake page (single HTML file) that asks the six pre-visit questions and prints a labeled answer block to hand to the doctor. The page makes no network requests, stores nothing (no localStorage or cookies), and tells patients not to enter names, ID numbers or phone numbers. Use it when a clinic wants patients to fill in answers on a tablet or kiosk before seeing the doctor.",
      parameters: {
        output_path: {
          type: "string",
          description: "\u53EF\u9009\u3002HTML \u8F93\u51FA\u8DEF\u5F84\uFF1B\u4EE5 .html \u7ED3\u5C3E\u89C6\u4E3A\u5B8C\u6574\u6587\u4EF6\uFF0C\u5426\u5219\u89C6\u4E3A\u76EE\u5F55\uFF1B\u7559\u7A7A\u5219\u5199\u5230\u5F53\u524D\u5DE5\u4F5C\u76EE\u5F55\u4E0B\u7684 clinic-intake-form.html\u3002"
        },
        clinic_name: {
          type: "string",
          description: "\u53EF\u9009\u3002\u673A\u6784\u540D\uFF0C\u663E\u793A\u5728\u9875\u9762\u6807\u9898\u4E0A\uFF08\u4F8B\u5982\u201C\u57CE\u897F\u793E\u533A\u536B\u751F\u670D\u52A1\u4E2D\u5FC3\u201D\uFF09\u3002"
        }
      },
      output: {
        schema: PAGE_SCHEMA,
        render: renderPage
      },
      async execute(args) {
        const target = (() => {
          const requested = typeof args.output_path === "string" ? args.output_path.trim() : "";
          if (requested) {
            return requested.toLowerCase().endsWith(".html") ? path.resolve(requested) : path.resolve(requested, "clinic-intake-form.html");
          }
          return path.resolve(process.cwd(), "clinic-intake-form.html");
        })();
        const html = buildIntakePage({ clinicName: args.clinic_name });
        try {
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, html, "utf8");
        } catch (error) {
          throw new Error(`\u5199\u5165\u586B\u5199\u9875\u5931\u8D25\uFF1A${error instanceof Error ? error.message : String(error)}\uFF08\u76EE\u6807\u8DEF\u5F84\uFF1A${target}\uFF09`);
        }
        return {
          file_path: target.replace(/\\/g, "/"),
          questions: 6,
          message: [
            `\u5DF2\u751F\u6210\u60A3\u8005\u7AEF\u586B\u5199\u9875\uFF1A${target.replace(/\\/g, "/")}`,
            "\u7528\u6CD5\uFF1A\u5728\u5019\u8BCA\u533A\u7684\u5E73\u677F\u6216\u524D\u53F0\u7535\u8111\u4E0A\u53CC\u51FB\u6253\u5F00\uFF08file:// \u5373\u53EF\uFF0C\u65E0\u9700\u670D\u52A1\u5668\uFF09\uFF0C\u60A3\u8005\u586B\u5B8C\u540E\u70B9\u201C\u590D\u5236\u201D\uFF0C\u628A\u6587\u672C\u4EA4\u7ED9\u533B\u751F\u3002",
            "\u9875\u9762\u4E0D\u8054\u7F51\u3001\u4E0D\u5199\u672C\u5730\u5B58\u50A8\uFF1B\u5237\u65B0\u6216\u5173\u95ED\u5373\u6E05\u7A7A\u3002\u533B\u751F\u62FF\u5230\u6587\u672C\u540E\u53EF\u7528 clinic_intake_extract \u6574\u7406\u6210\u6458\u8981\u3002",
            "\u672C\u63D2\u4EF6\u4E0D\u63D0\u4F9B\u8BCA\u65AD\u6216\u7528\u836F\u5EFA\u8BAE\u3002"
          ].join("\n")
        };
      }
    })
  );
}
export {
  apply,
  inject,
  name
};
