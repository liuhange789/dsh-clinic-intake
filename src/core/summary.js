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
 * 列表字段渲染；条目过多时只保留前 N 条并以“等”收尾。
 * @param {string} label - 行标签。
 * @param {string[]} items - 条目。
 * @param {number} count - 最多保留的条目数（至少 1）。
 * @param {(item: string) => string} format - 单条渲染。
 * @returns {string} 一行文本。
 */
function renderEntries(label, items, count, format) {
  const values = (items ?? []).filter(Boolean)
  if (values.length === 0) return `${label}：未提供`
  const kept = values.slice(0, Math.max(1, count)).map(format)
  const suffix = values.length > kept.length ? '等' : ''
  return `${label}：${kept.join('；')}${suffix}`
}

/**
 * 用药条目渲染。
 * @param {{ name: string, frequency: string }} item - 单条用药。
 * @returns {string} “药名（频次）”。
 */
function formatMedication(item) {
  const name = clip(item?.name ?? '', 24)
  const frequency = String(item?.frequency ?? '').trim()
  return frequency ? `${name}（${frequency}）` : name
}

/**
 * 生成就诊摘要。
 * 压缩顺序：补充说明 → 用药条目 → 既往条目 → 过敏条目 → 原始主诉 → 兜底截断；
 * 无论怎么压缩，“过敏”行与结尾固定声明都保留。
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

  let extra = String(structured?.free_text ?? '').trim()
  let rawLimit = 60
  let medCount = medications.length
  let historyCount = history.length
  let allergyCount = allergies.length
  let trimmed = false

  const allergyLine = () => renderEntries('过敏', allergies, allergyCount, item => clip(item, 34))
  const headLines = () => {
    const lines = ['【就诊摘要】', renderChief(complaint, rawLimit)]
    if (category !== '其他') lines.push(`分类：${category}`)
    lines.push(renderEntries('用药', medications, medCount, formatMedication))
    lines.push(renderEntries('既往', history, historyCount, item => clip(item, 34)))
    if (extra) lines.push(`补充：${extra}`)
    return lines
  }
  const render = () => [...headLines(), allergyLine(), NOTE].join('\n')

  let text = render()

  while (countChars(text) > maxChars && extra.length > 0) {
    const length = Array.from(extra).length
    extra = length <= 1 ? '' : clip(extra, Math.max(0, Math.floor(length * 0.7)))
    trimmed = true
    text = render()
  }
  // 优先截断用药 / 既往条目：保留前 N 味，其余用“等”收尾。
  while (countChars(text) > maxChars && medCount > 1) {
    medCount = Math.max(1, Math.floor(medCount / 2))
    trimmed = true
    text = render()
  }
  while (countChars(text) > maxChars && historyCount > 1) {
    historyCount = Math.max(1, Math.floor(historyCount / 2))
    trimmed = true
    text = render()
  }
  while (countChars(text) > maxChars && allergyCount > 1) {
    allergyCount = Math.max(1, Math.floor(allergyCount / 2))
    trimmed = true
    text = render()
  }
  while (countChars(text) > maxChars && rawLimit > 8) {
    rawLimit = Math.floor(rawLimit / 2)
    trimmed = true
    text = render()
  }
  if (countChars(text) > maxChars) {
    // 兜底：只截断头部，过敏行与固定声明原样保留。
    trimmed = true
    const tail = [allergyLine(), NOTE].join('\n')
    const budget = maxChars - countChars(tail) - 1
    text = `${clip(headLines().join('\n'), Math.max(1, budget))}\n${tail}`
  }

  return { text, chars: countChars(text), trimmed }
}

