window.__ModuleLoader__.load({
	id: "@liuhange/dsh-clinic-intake",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  ClinicIntakeAction: () => ClinicIntakeAction,
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);

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

// src/core/questions.js
var QUESTIONS = Object.freeze([
  {
    id: "chief",
    label: "\u4ECA\u5929\u4E3B\u8981\u54EA\u91CC\u4E0D\u8212\u670D\uFF1F",
    hint: "\u8BF4\u8BF4\u6700\u96BE\u53D7\u7684\u90E8\u4F4D\u548C\u611F\u89C9\uFF0C\u6BD4\u5982\u201C\u53F3\u8FB9\u592A\u9633\u7A74\u4E00\u8DF3\u4E00\u8DF3\u5730\u75BC\u201D\u3002",
    placeholder: "\u4F8B\u5982\uFF1A\u53F3\u8FB9\u592A\u9633\u7A74\u4E00\u8DF3\u4E00\u8DF3\u5730\u75BC"
  },
  {
    id: "duration",
    label: "\u8FD9\u79CD\u60C5\u51B5\u591A\u4E45\u4E86\uFF1F",
    hint: "\u5927\u6982\u65F6\u95F4\u5C31\u884C\uFF0C\u6BD4\u5982 3 \u5929\u3001\u4E24\u4E2A\u661F\u671F\u3001\u534A\u5E74\u3002",
    placeholder: "\u4F8B\u5982\uFF1A3 \u5929"
  },
  {
    id: "medications",
    label: "\u6709\u6CA1\u6709\u5728\u5403\u4EC0\u4E48\u836F\uFF1F",
    hint: "\u836F\u540D\u548C\u5403\u6CD5\uFF0C\u6CA1\u6709\u5C31\u5199\u201C\u6CA1\u6709\u201D\u3002",
    placeholder: "\u4F8B\u5982\uFF1A\u5E03\u6D1B\u82AC\uFF0C\u6BCF\u5929\u4E09\u6B21\uFF0C\u6BCF\u6B21\u4E00\u7247"
  },
  {
    id: "allergies",
    label: "\u6709\u6CA1\u6709\u836F\u7269\u6216\u98DF\u7269\u8FC7\u654F\uFF1F",
    hint: "\u5BF9\u4EC0\u4E48\u8FC7\u654F\u3001\u8FC7\u654F\u65F6\u4EC0\u4E48\u8868\u73B0\uFF0C\u6CA1\u6709\u5C31\u5199\u201C\u6CA1\u6709\u201D\u3002",
    placeholder: "\u4F8B\u5982\uFF1A\u9752\u9709\u7D20\u8FC7\u654F\uFF0C\u8D77\u76AE\u75B9"
  },
  {
    id: "history",
    label: "\u4EE5\u524D\u6709\u6CA1\u6709\u5F97\u8FC7\u4EC0\u4E48\u75C5\uFF1F",
    hint: "\u6162\u6027\u75C5\u3001\u505A\u8FC7\u7684\u624B\u672F\u3001\u957F\u671F\u5403\u7684\u836F\u90FD\u53EF\u4EE5\u8BF4\uFF0C\u6CA1\u6709\u5C31\u5199\u201C\u6CA1\u6709\u201D\u3002",
    placeholder: "\u4F8B\u5982\uFF1A\u9AD8\u8840\u538B 5 \u5E74"
  },
  {
    id: "extra",
    label: "\u8FD8\u6709\u4EC0\u4E48\u60F3\u544A\u8BC9\u533B\u751F\u7684\uFF1F",
    hint: "\u7761\u7720\u3001\u996E\u98DF\u3001\u5927\u5C0F\u4FBF\u3001\u60C5\u7EEA\uFF0C\u6216\u8005\u5176\u4ED6\u62C5\u5FC3\u7684\u4E8B\uFF0C\u53EF\u4EE5\u7559\u7A7A\u3002",
    placeholder: "\u4F8B\u5982\uFF1A\u8FD9\u4E24\u5929\u665A\u4E0A\u51E0\u4E4E\u6CA1\u7761\u7740"
  }
]);
var DISCLAIMER = "\u672C\u63D2\u4EF6\u53EA\u6574\u7406\u60A3\u8005\u81EA\u8FF0\uFF0C\u4E0D\u63D0\u4F9B\u8BCA\u65AD\u3001\u5206\u8BCA\u7ED3\u8BBA\u6216\u7528\u836F\u5EFA\u8BAE\uFF0C\u4E5F\u4E0D\u662F\u533B\u7597\u5668\u68B0\u3002";

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

// src/client/index.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var name = "clinic-intake-client";
var inject = ["slots"];
var EMPTY_ANSWERS = ["", "", "", "", "", ""];
var ACTION_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "3px 8px",
  minHeight: "28px",
  background: "transparent",
  border: "1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35))",
  borderRadius: "8px",
  color: "inherit",
  font: "inherit",
  fontSize: "12px",
  lineHeight: "18px",
  cursor: "pointer",
  whiteSpace: "nowrap"
};
var OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: "rgba(15, 23, 42, 0.42)"
};
var CARD_STYLE = {
  width: "min(560px, 100%)",
  maxHeight: "min(78vh, 720px)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "18px 20px",
  borderRadius: "14px",
  background: "var(--dsw-alias-bg-layer-1, #fff)",
  color: "var(--dsw-alias-label-primary, #1b1f24)",
  boxShadow: "0 20px 48px rgba(15, 23, 42, 0.28)",
  fontSize: "13px",
  lineHeight: "1.6",
  overflow: "auto"
};
var TEXTAREA_STYLE = {
  width: "100%",
  minHeight: "96px",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid var(--dsw-alias-border-l2, #d8dce3)",
  background: "transparent",
  color: "inherit",
  font: "inherit",
  resize: "vertical"
};
var SECONDARY_BUTTON = {
  font: "inherit",
  padding: "8px 14px",
  borderRadius: "9px",
  border: "1px solid var(--dsw-alias-border-l2, #d3d8df)",
  background: "transparent",
  color: "inherit",
  cursor: "pointer"
};
var PRIMARY_BUTTON = {
  ...SECONDARY_BUTTON,
  border: "1px solid #2563eb",
  background: "#2563eb",
  color: "#fff"
};
var RESULT_TEXT_STYLE = {
  whiteSpace: "pre-wrap",
  font: "inherit",
  background: "var(--dsw-alias-fill-l1, #f8fafc)",
  border: "1px solid var(--dsw-alias-border-l1, #e3e6eb)",
  borderRadius: "10px",
  padding: "12px",
  margin: 0
};
async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
function IntakeDialog({ onClose }) {
  const [step, setStep] = import_react.default.useState(0);
  const [answers, setAnswers] = import_react.default.useState(EMPTY_ANSWERS);
  const [result, setResult] = import_react.default.useState(null);
  const [copied, setCopied] = import_react.default.useState("");
  const question = QUESTIONS[step];
  const setAnswer = (value) => {
    setAnswers((current) => {
      const next = current.slice();
      next[step] = value;
      return next;
    });
  };
  const finish = () => {
    const structured = extractAnswers({
      chief: answers[0],
      duration: answers[1],
      medications: answers[2],
      allergies: answers[3],
      history: answers[4],
      extra: answers[5]
    });
    const summary = buildSummary(structured);
    setResult({ structured, summary });
  };
  const restart = () => {
    setAnswers(EMPTY_ANSWERS);
    setStep(0);
    setResult(null);
    setCopied("");
  };
  const copy = async () => {
    if (!result) return;
    const ok = await copyText(result.summary.text);
    setCopied(ok ? "\u5DF2\u590D\u5236\uFF0C\u53EF\u76F4\u63A5\u7C98\u8D34\u5230\u7535\u5B50\u75C5\u5386" : "\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u9009\u62E9\u6458\u8981\u6587\u672C");
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: OVERLAY_STYLE, role: "dialog", "aria-modal": "true", "aria-label": "\u5019\u8BCA\u4FE1\u606F\u91C7\u96C6", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: CARD_STYLE, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "16px", fontWeight: 600 }, children: "\u5019\u8BCA\u4FE1\u606F\u91C7\u96C6" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { opacity: 0.72, fontSize: "12px" }, children: "\u8BF7\u60A3\u8005\u56DE\u7B54\uFF0C\u586B\u5B8C\u751F\u6210\u7ED3\u6784\u5316\u6458\u8981\u7ED9\u533B\u751F\u770B\uFF1B\u4E0D\u91C7\u96C6\u59D3\u540D\u3001\u8BC1\u4EF6\u53F7\u3001\u7535\u8BDD\u3002" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: SECONDARY_BUTTON, onClick: onClose, "aria-label": "\u5173\u95ED", children: "\u5173\u95ED" })
    ] }),
    result === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { opacity: 0.65, fontSize: "12px" }, children: [
        "\u7B2C ",
        step + 1,
        " / ",
        QUESTIONS.length,
        " \u95EE"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { fontSize: "16px", fontWeight: 600 }, children: question.label }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { opacity: 0.72, fontSize: "12px" }, children: question.hint }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "textarea",
        {
          style: TEXTAREA_STYLE,
          value: answers[step],
          placeholder: question.placeholder,
          onChange: (event) => setAnswer(event.target.value),
          autoFocus: true
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: "8px", justifyContent: "space-between" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            style: SECONDARY_BUTTON,
            onClick: () => setStep((current) => Math.max(0, current - 1)),
            disabled: step === 0,
            children: "\u4E0A\u4E00\u9898"
          }
        ),
        step < QUESTIONS.length - 1 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            style: PRIMARY_BUTTON,
            onClick: () => setStep((current) => current + 1),
            children: "\u4E0B\u4E00\u9898"
          }
        ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: PRIMARY_BUTTON, onClick: finish, children: "\u751F\u6210\u6458\u8981" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { opacity: 0.6, fontSize: "12px" }, children: DISCLAIMER })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { fontSize: "16px", fontWeight: 600 }, children: [
        "\u5C31\u8BCA\u6458\u8981\uFF08",
        result.summary.chars,
        "/300 \u5B57\uFF09"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { style: RESULT_TEXT_STYLE, children: result.summary.text }),
      result.structured.missing_fields.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { opacity: 0.72, fontSize: "12px" }, children: [
        "\u672A\u586B\u5199\uFF1A",
        result.structured.missing_fields.map((field) => ({
          chief: "\u4E3B\u8BC9",
          duration: "\u75C5\u7A0B",
          medications: "\u7528\u836F\u53F2",
          allergies: "\u8FC7\u654F\u53F2",
          history: "\u65E2\u5F80\u53F2"
        })[field] || field).join("\u3001")
      ] }) : null,
      result.structured.phi_redactions.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { opacity: 0.72, fontSize: "12px" }, children: [
        "\u5DF2\u9690\u53BB\u8EAB\u4EFD\u7C7B\u5185\u5BB9\uFF08",
        Array.from(new Set(result.structured.phi_redactions.map((item) => item.kind))).join("\u3001"),
        "\uFF09\uFF0C\u6458\u8981\u4E2D\u4E0D\u4FDD\u7559\u539F\u6587\u3002"
      ] }) : null,
      result.summary.trimmed ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { opacity: 0.72, fontSize: "12px" }, children: "\u4E3A\u63A7\u5236\u5728 300 \u5B57\u5185\uFF0C\u8865\u5145\u8BF4\u660E\u6216\u65E2\u5F80\u6761\u76EE\u5DF2\u622A\u77ED\u3002" }) : null,
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: PRIMARY_BUTTON, onClick: copy, children: "\u590D\u5236\u6458\u8981" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", style: SECONDARY_BUTTON, onClick: restart, children: "\u91CD\u65B0\u91C7\u96C6" }),
        copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { color: "#16a34a", fontSize: "12px" }, children: copied }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { opacity: 0.6, fontSize: "12px" }, children: DISCLAIMER })
    ] })
  ] }) });
}
function ClinicIntakeAction() {
  const [open, setOpen] = import_react.default.useState(false);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        style: ACTION_STYLE,
        onClick: () => setOpen(true),
        title: "\u9010\u6761\u91C7\u96C6\u4E3B\u8BC9\u3001\u75C5\u7A0B\u3001\u7528\u836F\u3001\u8FC7\u654F\u3001\u65E2\u5F80\u4E0E\u8865\u5145\uFF0C\u751F\u6210 300 \u5B57\u5185\u5C31\u8BCA\u6458\u8981",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: "\u{1FA7A}" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "\u5019\u8BCA\u91C7\u96C6" })
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(IntakeDialog, { onClose: () => setOpen(false) }) : null
  ] });
}
function apply(ctx) {
  ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
    name: "conversation.session.header.actions",
    id: "clinic-intake",
    order: 40
  }, ClinicIntakeAction));
}
		return module.exports;
	},
});
