import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { extractAnswers, scrubPhi } from '../src/core/extract.js'
import { buildSummary } from '../src/core/summary.js'

const ANSWERS = {
  chief: '头痛，我的电话是 13812345678',
  duration: '3 天',
  medications: '布洛芬，每天三次',
  allergies: '青霉素过敏',
  history: '身份证 11010119900307561X，邮箱 someone@example.com',
  extra: '姓名：张小明，有问题可以联系我',
}

test('身份信息被隐去，原文不保留', () => {
  const value = extractAnswers(ANSWERS)
  const text = JSON.stringify(value)
  assert.equal(/1[3-9]\d{9}/.test(text), false, '手机号不应出现在输出中')
  assert.equal(/11010119900307561X/.test(text), false, '身份证号不应出现在输出中')
  assert.equal(/someone@example\.com/.test(text), false, '邮箱不应出现在输出中')
  assert.equal(text.includes('张小明'), false, '姓名标签不应出现在输出中')
  assert.ok(value.phi_redactions.length >= 4)
  const kinds = value.phi_redactions.map(item => item.kind)
  assert.ok(kinds.includes('phone'))
  assert.ok(kinds.includes('id-card'))
  assert.ok(kinds.includes('email'))
  assert.ok(kinds.includes('name-label'))
})

test('摘要中同样不含身份信息', () => {
  const summary = buildSummary(extractAnswers(ANSWERS))
  assert.equal(/1[3-9]\d{9}/.test(summary.text), false)
  assert.equal(summary.text.includes('张小明'), false)
})

test('scrubPhi 单独可用，且不改变正常内容', () => {
  assert.equal(scrubPhi('青霉素过敏').hits.length, 0)
  const scrubbed = scrubPhi('电话 13900001111，请回电')
  assert.equal(scrubbed.text.includes('13900001111'), false)
  assert.equal(scrubbed.hits[0].kind, 'phone')
})

test('核心模块无文件与网络依赖（默认内存处理）', async () => {
  for (const file of ['extract.js', 'summary.js', 'page.js', 'questions.js']) {
    const source = await readFile(new URL(`../src/core/${file}`, import.meta.url), 'utf8')
    assert.equal(/from\s+['"]node:/.test(source), false, `${file} 不应导入 node 内置模块`)
    assert.equal(/\bfetch\(|XMLHttpRequest|localStorage[.[]|document\.cookie/.test(source), false, `${file} 不应联网或写本地存储`)
  }
})
