import test from 'node:test'
import assert from 'node:assert/strict'
import { extractAnswers } from '../src/core/extract.js'
import { SUMMARY_MAX_CHARS, buildSummary, countChars } from '../src/core/summary.js'

const SAMPLE = {
  chief: '右边太阳穴一跳一跳地疼，从前天开始，低头的时候更明显',
  duration: '3 天',
  medications: '布洛芬，每天三次，每次一片；感冒灵颗粒，一天两袋',
  allergies: '青霉素过敏，起皮疹；芒果过敏，嘴肿',
  history: '高血压 5 年、2 型糖尿病 3 年；2019 年做过胆囊手术；长期吃氨氯地平',
  extra: '这两天晚上几乎没睡着，白天没精神，工作压力大，吃饭也不规律，偶尔心慌，想查一下是不是贫血，家里老人有脑梗病史'.repeat(2),
}

for (const item of [
  { name: '完整自述', input: SAMPLE },
  { name: '只有主诉', input: { chief: '头痛' } },
  { name: '超长补充', input: { ...SAMPLE, extra: '补充'.repeat(400) } },
  { name: '超长用药与既往', input: { ...SAMPLE, medications: '药'.repeat(300), history: '病'.repeat(300) } },
]) {
  test(`摘要不超过 300 字：${item.name}`, () => {
    const summary = buildSummary(extractAnswers(item.input))
    assert.ok(summary.chars <= SUMMARY_MAX_CHARS, `实际 ${summary.chars} 字`)
    assert.equal(countChars(summary.text), summary.chars)
    assert.match(summary.text, /【就诊摘要】/)
    assert.match(summary.text, /不含诊断与用药建议/)
  })
}

test('摘要包含四个结构化区块', () => {
  const summary = buildSummary(extractAnswers(SAMPLE))
  assert.match(summary.text, /主诉：/)
  assert.match(summary.text, /用药：/)
  assert.match(summary.text, /过敏：/)
  assert.match(summary.text, /既往：/)
  assert.match(summary.text, /补充：/)
})

test('没有提供的信息写成“未提供”，不编造内容', () => {
  const summary = buildSummary(extractAnswers({ chief: '头痛' }))
  assert.match(summary.text, /用药：未提供/)
  assert.match(summary.text, /过敏：未提供/)
  assert.match(summary.text, /既往：未提供/)
})

test('超长输入会被压缩并标记 trimmed', () => {
  const summary = buildSummary(extractAnswers({ ...SAMPLE, extra: '补充'.repeat(400) }))
  assert.equal(summary.trimmed, true)
  assert.ok(summary.chars <= SUMMARY_MAX_CHARS)
})

/** 12 味药，每条都带频次，用来把摘要顶到 300 字上限。 */
const MANY_MEDICATIONS = [
  '氨氯地平 5mg 每天一次',
  '二甲双胍 0.5g 每天两次',
  '阿托伐他汀 20mg 每晚一次',
  '氯吡格雷 75mg 每天一次',
  '布洛芬缓释胶囊 0.3g 每天两次',
  '头孢克肟 100mg 一天三次',
  '感冒灵颗粒 一天两袋',
  '奥美拉唑 20mg 每天一次',
  '缬沙坦 80mg 每天一次',
  '左甲状腺素钠 50μg 每天一次',
  '维生素D 一粒 每天一次',
  '碳酸钙片 一片 每天两次',
].join('；')

test('12 味药时 300 字上限不裁掉过敏行与固定声明', () => {
  const value = extractAnswers({
    chief: '右边太阳穴一跳一跳地疼，从前天开始',
    duration: '3 天',
    medications: MANY_MEDICATIONS,
    allergies: '青霉素过敏，起皮疹',
    history: '高血压 5 年、2 型糖尿病 3 年、2019 年做过胆囊手术、长期吃氨氯地平、高血脂 4 年',
    extra: '这两天晚上几乎没睡着，白天没精神，工作压力大，吃饭也不规律，偶尔心慌，想查一下是不是贫血，家里老人有脑梗病史，早上起来口干口苦，饭后有点反酸'.repeat(2),
  })
  const summary = buildSummary(value)
  assert.ok(summary.chars <= SUMMARY_MAX_CHARS, `实际 ${summary.chars} 字`)
  assert.equal(summary.trimmed, true)
  assert.match(summary.text, /过敏：青霉素过敏/)
  assert.match(summary.text, /不含诊断与用药建议/)
})

test('用药超量时按“前 N 味 + 等”压缩，仍保留过敏行与固定声明', () => {
  const medications = [
    MANY_MEDICATIONS,
    '氨溴索 30mg 每天三次',
    '蒙脱石散 一袋 每天三次',
    '布地奈德 每次一喷 每天两次',
    '孟鲁司特钠 10mg 每晚一次',
    '甲钴胺 0.5mg 每天三次',
    '复方甘草片 三片 每天三次',
    '多潘立酮 10mg 每天三次',
    '辛伐他汀 20mg 每晚一次',
  ].join('；')
  const value = extractAnswers({
    chief: '头痛伴恶心',
    medications,
    allergies: '青霉素过敏',
    history: '高血压 5 年、糖尿病 3 年',
  })
  const summary = buildSummary(value)
  const medicationLine = summary.text.split('\n').find(line => line.startsWith('用药'))
  assert.equal(value.medications.length > 12, true)
  assert.ok(summary.chars <= SUMMARY_MAX_CHARS, `实际 ${summary.chars} 字`)
  assert.match(medicationLine, /等$/)
  assert.match(summary.text, /过敏：青霉素过敏/)
  assert.match(summary.text, /不含诊断与用药建议/)
})

test('过敏行与固定声明永远保留（含兜底截断）', () => {
  const value = extractAnswers({
    chief: '皮疹',
    medications: MANY_MEDICATIONS,
    allergies: '青霉素过敏',
    history: '高血压 5 年',
  })
  const summary = buildSummary(value, { maxChars: 80 })
  assert.ok(summary.chars <= 80, `实际 ${summary.chars} 字`)
  assert.match(summary.text, /过敏：青霉素过敏/)
  assert.match(summary.text, /不含诊断与用药建议/)
})

test('患者未填过敏时，摘要仍保留“过敏：未提供”占位', () => {
  const value = extractAnswers({
    chief: '皮疹',
    medications: MANY_MEDICATIONS,
    allergies: '无',
    history: '高血压 5 年',
  })
  const summary = buildSummary(value)
  assert.ok(summary.chars <= SUMMARY_MAX_CHARS)
  assert.match(summary.text, /过敏：未提供/)
  assert.match(summary.text, /不含诊断与用药建议/)
})
