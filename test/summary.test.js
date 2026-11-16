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
