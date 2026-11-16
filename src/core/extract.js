/**
 * 诊前信息结构化核心：规则 + 关键词提取。
 *
 * 纯函数，零依赖：不读写文件、不发网络请求、不参与任何诊断判断。
 * 输入是患者自述的六段问答，输出是可交给医生快速浏览的结构化字段。
 *
 * @module dsh-clinic-intake/core/extract
 */

/** 六段问答的字段名（与 Client 界面、HTML 页面保持一致）。 */
export const ANSWER_FIELDS = Object.freeze([
  'chief',
  'duration',
  'medications',
  'allergies',
  'history',
  'extra',
])

/** 表示“没有 / 无”的表述；命中即视为空列表，而不是一条记录。 */
const NONE_MARKERS = Object.freeze([
  '无',
  '没有',
  '没',
  '否',
  '否认',
  '未服用',
  '未用药',
  '不清楚',
  '不记得',
  '暂无',
  '都没有',
  '未填写',
  '未作答',
  '未提供',
  'none',
  'no',
  'n/a',
  '-',
])

/** 页面回灌时的占位符：既不是“没有”，也不能算作有效回答。 */
const PLACEHOLDER_MARKERS = Object.freeze(['未填写', '未作答', '未提供', '未填'])

/** 否定式的整体例外：这些是名词短语，不是“没有”。 */
const NONE_EXCEPTIONS = /^无(?:痛|创|糖|菌)/

/** 会被误判成姓名的常见非姓名短语。 */
const NAME_STOPWORDS = Object.freeze(new Set([
  '高血压',
  '糖尿病',
  '贫血',
  '过敏',
  '患者',
  '病人',
  '医生',
  '男性',
  '女性',
  '老人',
  '孩子',
  '孕妇',
  '头痛',
  '头晕',
  '发烧',
  '感冒',
  '本人',
]))

/** 身份信息清洗规则：只记录“擦掉了哪一类”，绝不保留原文。 */
const PHI_RULES = Object.freeze([
  {
    // 手机号：允许空格 / 连字符分组，也允许 +86 前缀。
    kind: 'phone',
    pattern: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d(?:[-\s]?\d){8}(?!\d)/g,
  },
  { kind: 'id-card', pattern: /(?<!\d)\d{17}[\dXx](?!\d)/g },
  { kind: 'email', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  {
    // “姓名：/我叫/我是”后接 2-4 个汉字；常见非姓名短语（高血压等）不擦。
    kind: 'name-label',
    pattern: /(?:我叫|我是|患者姓名|姓名|名字)\s*[:：]?\s*([\u4e00-\u9fa5]{2,4})(?![\u4e00-\u9fa5])/g,
    keep: name => !NAME_STOPWORDS.has(name),
  },
])

/** 部位表；命中顺序即优先级（越具体的部位排在越前面）。 */
const LOCATIONS = Object.freeze([
  { name: '太阳穴', pattern: /太阳穴|颞部|鬓角/ },
  { name: '后枕部', pattern: /后脑|后枕|枕部|脖子后面/ },
  { name: '头部', pattern: /头|脑袋|脑门|头顶|偏头痛/ },
  { name: '咽喉', pattern: /咽喉|喉咙|嗓子|咽部/ },
  { name: '胸部', pattern: /胸口|胸部|心口|胸前/ },
  { name: '上腹部', pattern: /上腹|胃部|胃|心窝|中上腹/ },
  { name: '下腹部', pattern: /下腹|小腹|肚脐下/ },
  { name: '腹部', pattern: /腹|肚子|肚脐|脐周/ },
  { name: '腰部', pattern: /腰|腰部|腰背/ },
  { name: '背部', pattern: /后背|背部|脊背|肩胛/ },
  { name: '颈部', pattern: /脖子|颈部|颈椎/ },
  { name: '肩部', pattern: /肩膀|肩部|肩关节/ },
  { name: '关节', pattern: /关节|膝盖|膝关节|手腕|脚踝|手指/ },
  { name: '皮肤', pattern: /皮肤|皮疹|疹子|身上起|红斑|湿疹|瘙痒/ },
  { name: '眼部', pattern: /眼睛|眼部|眼睑|眼球/ },
  { name: '耳部', pattern: /耳朵|耳部|耳道/ },
  { name: '牙齿', pattern: /牙|牙齿|牙龈/ },
  { name: '下肢', pattern: /腿|小腿|大腿|脚/ },
  { name: '睡眠', pattern: /失眠|睡不着|睡不好|入睡困难|早醒/ },
])

/** 性质 / 感觉表；命中顺序即优先级。 */
const CHARACTERS = Object.freeze([
  { name: '绞痛', pattern: /绞痛|拧着疼|揪着疼/ },
  { name: '刺痛', pattern: /刺痛|针扎|扎着疼/ },
  { name: '跳痛', pattern: /跳痛|一跳一跳|搏动性/ },
  { name: '刀割样痛', pattern: /刀割|撕裂|撕扯/ },
  { name: '烧灼感', pattern: /烧灼|烧心|灼热|火辣/ },
  { name: '胀痛', pattern: /胀痛|发胀|胀得/ },
  { name: '闷痛', pattern: /闷痛|发闷|闷得/ },
  { name: '压迫感', pattern: /压迫|压着|压榨|紧箍/ },
  { name: '隐痛', pattern: /隐痛|隐隐|轻微疼/ },
  { name: '钝痛', pattern: /钝痛/ },
  { name: '干咳', pattern: /干咳|没有痰|无痰/ },
  { name: '咳痰', pattern: /咳痰|有痰|痰多/ },
  { name: '瘙痒', pattern: /痒|瘙痒|发痒/ },
  { name: '头晕', pattern: /头晕|眩晕|晕乎|发晕/ },
  { name: '乏力', pattern: /乏力|没劲|没力气|疲乏/ },
])

/** 病程时长：数字 + 单位，或“半年 / 多年 / 反复”这类口语表述。 */
const DURATION_PATTERNS = Object.freeze([
  /(?<!第)(\d{1,3}(?:\.\d)?|[一二三四五六七八九十两百半几]+)\s*(?:个)?\s*(小时|天|日|周|星期|礼拜|月|年)(?:左右|多|余)?/,
  /(半天|一天|两天|好几天|好几个月|大半年|半年|一年多|多年|很久|反复发作)/,
  /(?:从|自)\s*[^，。；,;]{2,12}\s*(?:开始|起)/,
])

/** “第二天 / 第 3 天”这类序数日期表述，单独规范成“N 天”。 */
const ORDINAL_DAY_PATTERN = /第\s*([0-9]{1,3}|[一二三四五六七八九十两]{1,3})\s*天/g

/** 频次 / 剂量表述，用于把“布洛芬每天三次”拆成 name + frequency。 */
const FREQUENCY_PATTERN = /(?:每日|每天|一天|一日|每晚|睡前|按需|必要时|每次)\s*[^，。；、,;]{0,10}|(?:\d+|[一二两三四五六七八九十半])\s*次\s*(?:\/[每]?\s*(?:日|天)|日|天)|(?:bid|tid|qd|qid|q\d+h)/gi

/** 剂量单位：从药名里剥离（0.3g / 100mg / 一片 / 2 粒）。 */
const DOSE_PATTERN = /(?:[0-9]+(?:\.[0-9]+)?\s*(?:mg|g|ml|μg|ug|iu|片|粒|袋|支|丸|喷|滴|贴|包)|(?:一|两|二|三|四|半|[1-4])\s*(?:片|粒|袋|支|丸|喷|滴|贴|包))/gi

/** 就诊原因分类：按部位 + 关键词映射，只用于排序和标签，不是诊断。 */
const CATEGORY_RULES = Object.freeze([
  { name: '睡眠与情绪', pattern: /失眠|睡不着|睡不好|入睡|早醒|焦虑|心情|情绪|压力/ },
  { name: '皮肤', pattern: /皮肤|皮疹|疹子|湿疹|红斑|瘙痒|起包/ },
  { name: '呼吸', pattern: /咳|咳嗽|痰|喘|鼻塞|流鼻涕|气短|呼吸/ },
  { name: '消化', pattern: /腹|胃|肚|恶心|呕吐|拉肚子|腹泻|便秘|反酸|烧心/ },
  { name: '疼痛', pattern: /痛|疼|酸|麻|胀|抽筋/ },
])

/**
 * 去掉空白与句读，便于比较“没有 / 无”这类整句否定。
 * @param {string} text - 原始文本。
 * @returns {string} 归一化文本。
 */
function normalizeValue(text) {
  return String(text ?? '').trim().toLowerCase().replace(/[。！!，,；;：:\s]/g, '')
}

/**
 * 清洗身份信息：手机号 / 身份证 / 邮箱 / 姓名表述。
 * @param {string} text - 原始文本。
 * @returns {{ text: string, hits: Array<{ kind: string }> }} 清洗后的文本与命中类别（不含原文）。
 */
export function scrubPhi(text) {
  let result = String(text ?? '')
  const hits = []
  for (const rule of PHI_RULES) {
    rule.pattern.lastIndex = 0
    let matched = false
    result = result.replace(rule.pattern, (match, ...rest) => {
      const captured = typeof rest[0] === 'string' ? rest[0] : ''
      if (rule.keep && !rule.keep(captured)) return match
      matched = true
      return '[已隐去]'
    })
    if (matched) hits.push({ kind: rule.kind })
  }
  return { text: result.trim(), hits }
}

/**
 * 判断一段文本是否表达“没有”。
 * @param {string} text - 待判断文本。
 * @returns {boolean} 是否属于“无 / 否认 / 不清楚”。
 */
function isNone(text) {
  const value = normalizeValue(text)
  if (!value) return true
  if (value.length > 8) return false
  // “无痛胃镜 / 无痛分娩”是名词短语，不是“没有”。
  if (NONE_EXCEPTIONS.test(value)) return false
  return NONE_MARKERS.some(marker => value === marker || value.startsWith(marker))
}

/**
 * 判断一段文本是否只是页面回灌的占位符（未填写 / 未作答）。
 * @param {string} text - 待判断文本。
 * @returns {boolean} 是否属于占位符。
 */
function isPlaceholder(text) {
  const value = normalizeValue(text)
  return !value || PLACEHOLDER_MARKERS.some(marker => value === marker)
}

/**
 * 按常见分隔符切分条目。
 * @param {string} text - 原始文本。
 * @returns {string[]} 去空后的条目。
 */
function splitItems(text) {
  return String(text ?? '')
    .split(/[、，,；;。\n/]|和|及/)
    .map(item => item.trim())
    .filter(item => item.length > 0)
}

/**
 * 从主诉中识别部位与性质。
 * @param {string} text - 主诉文本。
 * @returns {{ location: string, character: string }} 识别结果，未命中则为空串。
 */
function detectComplaintShape(text) {
  const source = String(text ?? '')
  const location = LOCATIONS.find(item => item.pattern.test(source))?.name ?? ''
  const character = CHARACTERS.find(item => item.pattern.test(source))?.name ?? ''
  return { location, character }
}

/**
 * 把“一 / 十二 / 三十”这类中文数字转成阿拉伯数字。
 * @param {string} text - 数字文本。
 * @returns {number} 数值；无法解析时为 0。
 */
function toNumber(text) {
  const raw = String(text ?? '').trim()
  if (/^[0-9]+$/.test(raw)) return Number(raw)
  const digits = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
  if (raw === '十') return 10
  const tenIndex = raw.indexOf('十')
  if (tenIndex >= 0) {
    const tens = tenIndex === 0 ? 1 : digits[raw[tenIndex - 1]] ?? 0
    const ones = tenIndex === raw.length - 1 ? 0 : digits[raw[tenIndex + 1]] ?? 0
    return tens * 10 + ones
  }
  return digits[raw] ?? 0
}

/**
 * 把“今天第二天 / 第二天 / 第3天”规范成“2 天”这类病程描述。
 * @param {string} text - 患者原话。
 * @returns {string} 规范化病程，未识别则为空串。
 */
function normalizeOrdinalDay(text) {
  const match = String(text ?? '').match(/第\s*([0-9]{1,3}|[一二三四五六七八九十两]{1,3})\s*天/)
  if (!match) return ''
  const days = toNumber(match[1])
  return days > 0 ? `${days}天` : ''
}

/**
 * 识别病程。
 * @param {string} explicitDuration - “这种情况多久了”的回答。
 * @param {string} chief - 主诉文本（可能自带时长）。
 * @returns {string} 病程描述，未识别则为空串。
 */
function detectDuration(explicitDuration, chief) {
  const direct = String(explicitDuration ?? '').trim().replace(/\s+/g, '')
  if (direct && !isNone(direct)) return normalizeOrdinalDay(direct) || direct
  const source = String(chief ?? '')
  const withoutOrdinal = source.replace(ORDINAL_DAY_PATTERN, ' ')
  for (const pattern of DURATION_PATTERNS) {
    const match = withoutOrdinal.match(pattern)
    if (match) return match[0].replace(/\s+/g, '')
  }
  // “今天第二天”这类表述：规范成“2 天”，而不是误抽成“二天”。
  ORDINAL_DAY_PATTERN.lastIndex = 0
  const ordinal = ORDINAL_DAY_PATTERN.exec(source)
  if (ordinal) {
    const days = toNumber(ordinal[1])
    if (days > 0) return `${days}天`
  }
  return ''
}

/**
 * 按用药条目切分：强分隔符（分号 / 句号 / 换行）之间算一组。
 * @param {string} text - 用药史回答。
 * @returns {string[]} 每组用药描述。
 */
function splitMedicationEntries(text) {
  return String(text ?? '')
    .split(/[；;。\n]/)
    .map(entry => entry.trim())
    .filter(Boolean)
}

/**
 * 清理单个药名：去括号注释、去剂量与频次残片、去动词前缀。
 * @param {string} text - 药名候选。
 * @returns {string} 清洗后的药名。
 */
function cleanMedicationName(text) {
  return String(text ?? '')
    .replace(/[（(][^)）]*[)）]/g, ' ')
    .replace(DOSE_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(?:正在|在|吃了|服用|用了|口服|打过|外用|顿服)\s*/, '')
    .trim()
    .replace(/[，,；;、。：:\s]+$/g, '')
    .replace(/^[，,；;、。：:\s]+/g, '')
    .trim()
}

/**
 * 提取用药条目：先抽频次、再剥剂量，最后按“和 / 及 / 顿号”拆成多味药并共享频次。
 * @param {string} text - 用药史回答。
 * @returns {Array<{ name: string, frequency: string }>} 用药清单。
 */
function extractMedications(text) {
  if (isNone(String(text ?? ''))) return []
  const medications = []
  for (const entry of splitMedicationEntries(text)) {
    const frequencyParts = []
    const namePart = entry.replace(FREQUENCY_PATTERN, match => {
      const value = match.trim()
      if (value) frequencyParts.push(value)
      return '，'
    })
    const frequency = frequencyParts.join('，').trim().slice(0, 20)
    for (const segment of namePart.split(/[，,；;。、]|和|及|与|＆|&|＋|\+/)) {
      const name = cleanMedicationName(segment)
      if (!name || isNone(name)) continue
      const item = { name: name.slice(0, 30), frequency }
      if (medications.some(existing => existing.name === item.name && existing.frequency === item.frequency)) continue
      medications.push(item)
    }
  }
  return medications
}

/**
 * 提取过敏 / 既往条目。
 * @param {string} text - 对应回答。
 * @returns {string[]} 条目列表。
 */
function extractList(text) {
  if (isNone(String(text ?? ''))) return []
  return splitItems(text)
    .map(item => item.replace(/^(对|有|曾经|以前)\s*/, '').trim())
    .map(item => item.replace(/^(但|但是|不过|可是|然而)\s*/, '').trim())
    .filter(item => item && !isNone(item))
    .map(item => item.slice(0, 40))
}

/**
 * 在文本里找最早命中的分类；并列时按词表顺序。
 * @param {string} text - 待匹配文本。
 * @returns {{ name: string, index: number } | null} 最早命中的分类。
 */
function earliestCategory(text) {
  const source = String(text ?? '')
  let best = null
  for (const rule of CATEGORY_RULES) {
    const index = source.search(rule.pattern)
    if (index < 0) continue
    if (!best || index < best.index) best = { name: rule.name, index }
  }
  return best
}

/**
 * 就诊原因分类（标签，不是诊断）。主诉主症优先，补充说明与其余字段不得抢占。
 * @param {string} chief - 主诉与病程文本。
 * @param {string} rest - 其余回答文本。
 * @returns {string} 分类名。
 */
function classifyReason(chief, rest) {
  const primary = String(chief ?? '')
  const clauses = primary.split(/[，,、；;。]/).map(clause => clause.trim()).filter(Boolean)
  const main = clauses[0] ?? ''
  const others = clauses.slice(1).join('，')
  return earliestCategory(main)?.name
    ?? earliestCategory(others)?.name
    ?? earliestCategory(rest)?.name
    ?? '其他'
}

/**
 * 结构化一次诊前问答。
 * @param {object} input - 六段回答；缺省字段按空串处理。
 * @returns {object} 结构化结果：主诉、用药、过敏、既往、补充、分类、缺失字段、清洗记录。
 */
export function extractAnswers(input = {}) {
  const raw = {}
  const redactions = []
  for (const field of ANSWER_FIELDS) {
    const value = typeof input[field] === 'string' ? input[field] : ''
    const scrubbed = scrubPhi(value)
    raw[field] = scrubbed.text
    for (const hit of scrubbed.hits) redactions.push({ field, kind: hit.kind })
  }

  const shape = detectComplaintShape(raw.chief)
  const duration = detectDuration(raw.duration, raw.chief)
  const medications = extractMedications(raw.medications)
  const allergies = extractList(raw.allergies)
  const pastHistory = extractList(raw.history)
  const freeText = raw.extra.slice(0, 240)
  const haystack = `${raw.duration} ${raw.medications} ${raw.allergies} ${raw.history} ${raw.extra}`

  const missing = []
  if (isPlaceholder(raw.chief)) missing.push('chief')
  if (!duration) missing.push('duration')
  if (isPlaceholder(raw.medications)) missing.push('medications')
  if (isPlaceholder(raw.allergies)) missing.push('allergies')
  if (isPlaceholder(raw.history)) missing.push('history')

  return {
    chief_complaint: {
      location: shape.location,
      character: shape.character,
      duration,
      raw: raw.chief.slice(0, 120),
    },
    medications,
    allergies,
    past_history: pastHistory,
    free_text: freeText,
    reason_category: classifyReason(`${raw.chief} ${duration}`, haystack),
    missing_fields: missing,
    phi_redactions: redactions,
  }
}

/** 页面 / 粘贴块里的标签 → 字段名。 */
const LABEL_MAP = Object.freeze([
  { field: 'chief', pattern: /^(?:主诉|今天主要哪里不舒服|哪里不舒服|怎么了)[:：]?\s*/ },
  { field: 'duration', pattern: /^(?:病程|持续|多久|这种情况多久了)[:：]?\s*/ },
  { field: 'medications', pattern: /^(?:用药|用药史|在吃什么药|吃什么药)[:：]?\s*/ },
  { field: 'allergies', pattern: /^(?:过敏|过敏史|有没有过敏)[:：]?\s*/ },
  { field: 'history', pattern: /^(?:既往|既往史|以前得过什么病|既往病史)[:：]?\s*/ },
  { field: 'extra', pattern: /^(?:补充|还有什么想告诉医生)[:：]?\s*/ },
])

/**
 * 解析“标签：内容”格式的问答块（患者页面复制出来的文本）。
 * @param {string} text - 多行文本。
 * @returns {object} 六段回答；未命中的字段为空串。
 */
export function parseLabeledAnswers(text) {
  const answers = {}
  for (const field of ANSWER_FIELDS) answers[field] = []
  const lines = String(text ?? '').split(/\r?\n/)
  let current = null
  for (const line of lines) {
    const trimmed = line.trim().replace(/^[-*·]\s*/, '')
    if (!trimmed) continue
    const label = LABEL_MAP.find(entry => entry.pattern.test(trimmed))
    if (label) {
      current = label.field
      answers[current].push(trimmed.replace(label.pattern, '').trim())
      continue
    }
    if (current) answers[current].push(trimmed)
  }
  const joined = {}
  for (const field of ANSWER_FIELDS) joined[field] = answers[field].join('，').trim()
  return joined
}

/**
 * 把六段回答渲染成患者页面同款的“标签：内容”文本。
 * 渲染前再擦一遍身份信息，保证任何对外字段都不会回流出原文。
 * @param {object} input - 六段回答。
 * @returns {string} 可读文本块。
 */
export function formatLabeledAnswers(input = {}) {
  const labels = {
    chief: '主诉',
    duration: '病程',
    medications: '用药',
    allergies: '过敏',
    history: '既往',
    extra: '补充',
  }
  return ANSWER_FIELDS
    .map(field => {
      const value = scrubPhi(String(input[field] ?? '')).text
      return `${labels[field]}：${value || '未填写'}`
    })
    .join('\n')
}
