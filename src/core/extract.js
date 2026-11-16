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
  'none',
  'no',
  'n/a',
  '-',
])

/** 身份信息清洗规则：只记录“擦掉了哪一类”，绝不保留原文。 */
const PHI_RULES = Object.freeze([
  { kind: 'phone', pattern: /(?<!\d)(?:\+?86[-\s]?)?1[3-9]\d{9}(?!\d)/g },
  { kind: 'id-card', pattern: /(?<!\d)\d{17}[\dXx](?!\d)/g },
  { kind: 'email', pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g },
  { kind: 'name-label', pattern: /(?:患者姓名|姓名|名字)\s*[:：]\s*[^\s，。；,;]{1,8}/g },
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
  /(\d{1,3}(?:\.\d)?|[一二三四五六七八九十两百半几]+)\s*(?:个)?\s*(小时|天|日|周|星期|礼拜|月|年)(?:左右|多|余)?/,
  /(半天|一天|两天|好几天|好几个月|大半年|半年|一年多|多年|很久|反复发作)/,
  /(从|自)\s*[^，。；,;]{2,12}\s*(开始|起)/,
])

/** 频次 / 剂量表述，用于把“布洛芬每天三次”拆成 name + frequency。 */
const FREQUENCY_PATTERN = /((?:每日|每天|一日|每晚|睡前|按需|必要时)[^，。；、,;]{0,10}|(?:\d+|[一二两三四半])\s*次\s*[\/每]?\s*(?:日|天)|bid|tid|qd|qid|必要时)/i

/** 就诊原因分类：按部位 + 关键词映射，只用于排序和标签，不是诊断。 */
const CATEGORY_RULES = Object.freeze([
  { name: '睡眠与情绪', pattern: /失眠|睡不着|睡不好|入睡|早醒|焦虑|心情|情绪|压力/ },
  { name: '皮肤', pattern: /皮肤|皮疹|疹子|湿疹|红斑|瘙痒|起包/ },
  { name: '呼吸', pattern: /咳|咳嗽|痰|喘|鼻塞|流鼻涕|气短|呼吸/ },
  { name: '消化', pattern: /腹|胃|肚|恶心|呕吐|拉肚子|腹泻|便秘|反酸|烧心/ },
  { name: '疼痛', pattern: /痛|疼|酸|麻|胀|抽筋/ },
])

/**
 * 清洗身份信息：手机号 / 身份证 / 邮箱 / “姓名: xxx”。
 * @param {string} text - 原始文本。
 * @returns {{ text: string, hits: Array<{ kind: string }> }} 清洗后的文本与命中类别（不含原文）。
 */
export function scrubPhi(text) {
  let result = String(text ?? '')
  const hits = []
  for (const rule of PHI_RULES) {
    rule.pattern.lastIndex = 0
    if (rule.pattern.test(result)) {
      rule.pattern.lastIndex = 0
      result = result.replace(rule.pattern, '[已隐去]')
      hits.push({ kind: rule.kind })
    }
  }
  return { text: result.trim(), hits }
}

/**
 * 判断一段文本是否表达“没有”。
 * @param {string} text - 待判断文本。
 * @returns {boolean} 是否属于“无 / 否认 / 不清楚”。
 */
function isNone(text) {
  const value = text.trim().toLowerCase().replace(/[。！!，,；;\s]/g, '')
  if (!value) return true
  if (value.length > 6) return false
  return NONE_MARKERS.some(marker => value === marker || value.startsWith(marker))
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
 * 识别病程。
 * @param {string} explicitDuration - “这种情况多久了”的回答。
 * @param {string} chief - 主诉文本（可能自带时长）。
 * @returns {string} 病程描述，未识别则为空串。
 */
function detectDuration(explicitDuration, chief) {
  const direct = String(explicitDuration ?? '').trim().replace(/\s+/g, '')
  if (direct && !isNone(direct)) return direct
  const source = String(chief ?? '')
  for (const pattern of DURATION_PATTERNS) {
    const match = source.match(pattern)
    if (match) return match[0].replace(/\s+/g, '')
  }
  return ''
}

/**
 * 按用药条目切分：先按强分隔符分组，组内的“每天/每次/按需”等片段归入同一味药。
 * @param {string} text - 用药史回答。
 * @returns {string[]} 每味药的完整描述。
 */
function splitMedicationEntries(text) {
  const groups = String(text ?? '').split(/[；;。\n、]/)
  const entries = []
  for (const group of groups) {
    const parts = group.split(/[，,]/).map(part => part.trim()).filter(Boolean)
    let current = ''
    for (const part of parts) {
      const isDosePart = /^(每天|每日|一日|每次|每晚|睡前|按需|必要时|口服)/.test(part) || /次\s*[\/每]?/.test(part)
      if (isDosePart) {
        current = current ? `${current}，${part}` : part
      } else {
        if (current) entries.push(current)
        current = part
      }
    }
    if (current) entries.push(current)
  }
  return entries
}

/**
 * 提取用药条目。
 * @param {string} text - 用药史回答。
 * @returns {Array<{ name: string, frequency: string }>} 用药清单。
 */
function extractMedications(text) {
  if (isNone(String(text ?? ''))) return []
  const medications = []
  for (const entry of splitMedicationEntries(text)) {
    const parts = entry.split(/[，,]/).map(part => part.trim()).filter(Boolean)
    let name = parts[0] ?? ''
    let frequencyParts = parts.slice(1)
    if (parts.length === 1) {
      const matched = entry.match(FREQUENCY_PATTERN)
      if (matched) {
        name = entry.replace(matched[0], ' ')
        frequencyParts = [matched[0]]
      }
    }
    name = name
      .replace(/[（(][^)）]*[)）]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(正在|在|吃了|服用|用了|口服|打过)\s*/, '')
      .trim()
      .replace(/[，,；;、。：:\s]+$/g, '')
      .replace(/^[，,；;、。：:\s]+/g, '')
      .trim()
    const frequency = frequencyParts.join('，').trim().slice(0, 20)
    if (!name || isNone(name)) continue
    medications.push({ name: name.slice(0, 30), frequency })
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
    .filter(item => item && !isNone(item))
    .map(item => item.slice(0, 40))
}

/**
 * 就诊原因分类（标签，不是诊断）。主诉优先，主诉无法归类时才看其余字段。
 * @param {string} chief - 主诉与病程文本。
 * @param {string} rest - 其余回答文本。
 * @returns {string} 分类名。
 */
function classifyReason(chief, rest) {
  const primary = String(chief ?? '')
  const secondary = String(rest ?? '')
  return CATEGORY_RULES.find(rule => rule.pattern.test(primary))?.name
    ?? CATEGORY_RULES.find(rule => rule.pattern.test(secondary))?.name
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
  if (!raw.chief) missing.push('chief')
  if (!duration) missing.push('duration')
  if (!raw.medications) missing.push('medications')
  if (!raw.allergies) missing.push('allergies')
  if (!raw.history) missing.push('history')

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
    .map(field => `${labels[field]}：${String(input[field] ?? '').trim() || '未填写'}`)
    .join('\n')
}
