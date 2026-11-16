/**
 * 就诊摘要生成：把结构化字段压成一张医生能在 5 秒内读完的卡片。
 *
 * 只做信息整理与措辞压缩，不添加任何诊断、分诊结论或用药建议。
 * 默认上限 300 字（按 Unicode 字符计，不是 UTF-16 码元）。
 *
 * @module dsh-clinic-intake/core/summary
 */

/** 摘要硬性字数上限。 */
export const SUMMARY_MAX_CHARS = 300

/** 摘要末尾的固定声明。 */
const NOTE = '注：以上为患者自述整理，不含诊断与用药建议。'

/**
 * 按 Unicode 字符计数。
 * @param {string} text - 文本。
 * @returns {number} 字符数。
 */
export function countChars(text) {
  return Array.from(String(text ?? '')).length
}

/**
 * 按字符数截断，超出时补省略号。
 * @param {string} text - 文本。
 * @param {number} limit - 上限字符数。
 * @returns {string} 截断结果。
 */
function clip(text, limit) {
  const chars = Array.from(String(text ?? ''))
  if (chars.length <= limit) return chars.join('')
  if (limit <= 1) return '…'
  return `${chars.slice(0, limit - 1).join('')}…`
}

/**
 * 渲染主诉行。
 * @param {{ location: string, character: string, duration: string, raw: string }} complaint - 主诉字段。
 * @param {number} rawLimit - 原始主诉的最大保留字符数。
 * @returns {string} 主诉行文本。
 */
function renderChief(complaint, rawLimit) {
  const location = complaint?.location || ''
  const character = complaint?.character || ''
  const duration = complaint?.duration || ''
  const shape = [location, character].filter(Boolean).join('·')
  if (shape) {
    return duration ? `主诉：${shape}，持续${duration}` : `主诉：${shape}`
  }
  const raw = String(complaint?.raw ?? '').trim()
  if (raw) {
    const body = clip(raw, rawLimit)
    return duration ? `主诉：${body}，持续${duration}` : `主诉：${body}`
  }
  return '主诉：未填写'
}

/**
 * 列表字段渲染。
 * @param {string} label - 行标签。
 * @param {string[]} items - 条目。
 * @returns {string} 一行文本。
 */
function renderList(label, items) {
  const values = (items ?? []).filter(Boolean)
  if (values.length === 0) return `${label}：未提供`
  return `${label}：${values.join('；')}`
}

/**
 * 生成就诊摘要。
 * @param {object} structured - {@link extractAnswers} 的输出。
 * @param {{ maxChars?: number }} [options] - 可选上限（默认 300，硬上限 300）。
 * @returns {{ text: string, chars: number, trimmed: boolean }} 摘要文本、字符数与是否发生过压缩。
 */
export function buildSummary(structured, options = {}) {
  const maxChars = Math.min(Number(options.maxChars) || SUMMARY_MAX_CHARS, SUMMARY_MAX_CHARS)
  const complaint = structured?.chief_complaint ?? {}
  const medications = structured?.medications ?? []
  const allergies = structured?.allergies ?? []
  const history = structured?.past_history ?? []
  const category = structured?.reason_category || '其他'

  const medicationLine = medications.length
    ? `用药：${medications.map(item => (item.frequency ? `${item.name}（${item.frequency}）` : item.name)).join('；')}`
    : '用药：未提供'

  let freeText = String(structured?.free_text ?? '').trim()
  let rawLimit = 60
  let includedHistory = history.slice()
  let withExtra = true
  let trimmed = false

  const render = () => {
    const lines = ['【就诊摘要】', renderChief(complaint, rawLimit)]
    if (category !== '其他') lines.push(`分类：${category}`)
    lines.push(medicationLine)
    lines.push(renderList('过敏', allergies))
    lines.push(renderList('既往', includedHistory))
    if (withExtra && freeText) lines.push(`补充：${freeText}`)
    lines.push(NOTE)
    return lines.join('\n')
  }

  let text = render()
  // 逐级压缩：补充说明 → 既往条目 → 原始主诉 → 硬截断。
  while (countChars(text) > maxChars && freeText.length > 0) {
    freeText = clip(freeText, Math.max(0, Math.floor(Array.from(freeText).length * 0.7)))
    if (Array.from(freeText).length <= 1) freeText = ''
    trimmed = true
    text = render()
  }
  if (countChars(text) > maxChars && withExtra) {
    withExtra = false
    trimmed = true
    text = render()
  }
  while (countChars(text) > maxChars && includedHistory.length > 0) {
    includedHistory = includedHistory.slice(0, -1)
    trimmed = true
    text = render()
  }
  while (countChars(text) > maxChars && rawLimit > 8) {
    rawLimit = Math.floor(rawLimit / 2)
    trimmed = true
    text = render()
  }
  if (countChars(text) > maxChars) {
    trimmed = true
    text = clip(text, maxChars)
  }

  return { text, chars: countChars(text), trimmed }
}
