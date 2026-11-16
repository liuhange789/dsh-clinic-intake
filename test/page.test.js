/**
 * 候诊填写页的落盘行为：默认文件名、目录语义与「不覆盖同名文件」。
 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import * as plugin from '../src/host/index.js'

/**
 * @param {string} dir - 输出目录。
 * @returns {Promise<object>} 捕获的 clinic_intake_page 工具。
 */
function captureTool() {
  const tools = {}
  plugin.apply({ tools: { register(tool) { tools[tool.name] = tool } }, effect() {}, on() {}, logger: console, fiber: { state: 0 }, inject() {} }, {})
  return tools.clinic_intake_page
}

test('候诊页写入指定目录并在第二次生成时追加序号', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'clinic-page-'))
  try {
    const tool = captureTool()
    const first = await tool.execute({ output_path: dir }, {})
    assert.equal(first.questions, 6)
    assert.ok(first.file_path.endsWith('clinic-intake-form.html'))
    const html = await readFile(first.file_path, 'utf8')
    assert.ok(html.includes('主诉'), '页面包含六个问题')

    const second = await tool.execute({ output_path: dir }, {})
    assert.notEqual(second.file_path, first.file_path)
    assert.ok(second.file_path.endsWith('clinic-intake-form(1).html'), second.file_path)
    assert.equal(await readFile(first.file_path, 'utf8'), html, '第一次生成的文件未被覆盖')
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test('以 .html 结尾的 output_path 被视为完整文件路径', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'clinic-page-file-'))
  try {
    const tool = captureTool()
    const result = await tool.execute({ output_path: path.join(dir, 'custom.html'), clinic_name: '测试门诊' }, {})
    assert.ok(result.file_path.endsWith('custom.html'))
    assert.ok((await readFile(result.file_path, 'utf8')).includes('测试门诊'))
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
