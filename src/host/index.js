/**
 * Host 侧入口：两个工具
 * - clinic_intake_extract：患者自述 → 结构化就诊摘要（规则提取，不调用任何外部服务）；
 * - clinic_intake_page：生成患者端离线填写页（单文件 HTML，可直接双击打开）。
 *
 * 不写数据库、不记录身份信息、不生成诊断或用药建议。
 */

import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  ANSWER_FIELDS,
  extractAnswers,
  formatLabeledAnswers,
  parseLabeledAnswers,
} from '../core/extract.js'
import { buildIntakePage } from '../core/page.js'
import { buildSummary } from '../core/summary.js'

export const name = 'clinic-intake'
export const inject = ['tools']

const EXTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    summary_chars: { type: 'number' },
    chief_complaint: {
      type: 'object',
      additionalProperties: false,
      properties: {
        location: { type: 'string' },
        character: { type: 'string' },
        duration: { type: 'string' },
        raw: { type: 'string' },
      },
    },
    medications: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          frequency: { type: 'string' },
        },
      },
    },
    allergies: { type: 'array', items: { type: 'string' } },
    past_history: { type: 'array', items: { type: 'string' } },
    free_text: { type: 'string' },
    reason_category: { type: 'string' },
    missing_fields: { type: 'array', items: { type: 'string' } },
    phi_redactions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          field: { type: 'string' },
          kind: { type: 'string' },
        },
      },
    },
    labeled_text: { type: 'string' },
  },
}

const PAGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    file_path: { type: 'string' },
    questions: { type: 'number' },
    message: { type: 'string' },
  },
}

/**
 * 合并“标签文本”与逐字段回答：显式字段优先，标签文本兜底。
 * @param {object} args - 工具入参。
 * @returns {object} 六段回答。
 */
function resolveAnswers(args) {
  const parsed = typeof args.text === 'string' && args.text.trim() ? parseLabeledAnswers(args.text) : {}
  const answers = {}
  for (const field of ANSWER_FIELDS) {
    const direct = typeof args[field] === 'string' ? args[field] : ''
    answers[field] = direct.trim() ? direct : parsed[field] ?? ''
  }
  return answers
}

function renderExtract(args, value) {
  const lines = [value.summary, '']
  lines.push(`分类标签：${value.reason_category}`)
  lines.push(`主诉字段：部位=${value.chief_complaint.location || '未识别'}；性质=${value.chief_complaint.character || '未识别'}；病程=${value.chief_complaint.duration || '未提供'}`)
  lines.push(`用药条目：${value.medications.length === 0 ? '未提供' : value.medications.map(item => `${item.name}${item.frequency ? `（${item.frequency}）` : ''}`).join('；')}`)
  lines.push(`过敏条目：${value.allergies.length === 0 ? '未提供' : value.allergies.join('；')}`)
  lines.push(`既往条目：${value.past_history.length === 0 ? '未提供' : value.past_history.join('；')}`)
  if (value.missing_fields.length) lines.push(`未填写：${value.missing_fields.join('、')}`)
  if (value.phi_redactions.length) {
    const kinds = Array.from(new Set(value.phi_redactions.map(item => item.kind))).join('、')
    lines.push(`已隐去身份类内容：${kinds}（原文未保留）`)
  }
  lines.push(`摘要字数：${value.summary_chars}/300`)
  lines.push('可直接复制上面的摘要粘贴到电子病历系统；本插件不提供诊断或用药建议。')
  return [{ type: 'text', text: lines.join('\n') }]
}

function renderPage(args, value) {
  return [{ type: 'text', text: value.message }]
}

/** 目标已存在时追加 (1)、(2)……，避免静默覆盖同目录下已有的填写页。 */
function uniqueTarget(target) {
  if (!existsSync(target)) return target
  const dir = path.dirname(target)
  const ext = path.extname(target)
  const base = path.basename(target, ext)
  for (let i = 1; i < 1000; i += 1) {
    const candidate = path.join(dir, `${base}(${i})${ext}`)
    if (!existsSync(candidate)) return candidate
  }
  throw new Error(`同名文件过多，无法为 ${target} 生成新的文件名。`)
}

export function apply(ctx) {
  ctx.tools.register(
    defineTool({
      name: 'clinic_intake_extract',
      description:
        'Turn a patient\'s pre-visit answers into a structured intake summary for the doctor: chief complaint (location / character / duration), medications with frequency, allergies, past history, free text, and a reason-category tag. Rule and keyword extraction only — it never suggests a diagnosis, triage decision, or medication, and it drops phone numbers, ID numbers, emails and explicit name labels instead of keeping them. Output summary is capped at 300 Chinese characters. Accepts either six separate fields or one labeled block such as "主诉：…\\n病程：…".',
      parameters: {
        chief: {
          type: 'string',
          description: '主诉：今天主要哪里不舒服（自由描述，例如“右边太阳穴一跳一跳地疼”）。',
        },
        duration: {
          type: 'string',
          description: '病程：这种情况多久了（例如“3 天”“半年”）。',
        },
        medications: {
          type: 'string',
          description: '用药史：正在吃的药与吃法，没有就写“没有”。',
        },
        allergies: {
          type: 'string',
          description: '过敏史：药物或食物过敏，没有就写“没有”。',
        },
        history: {
          type: 'string',
          description: '既往史：以前得过的病、做过的手术，没有就写“没有”。',
        },
        extra: {
          type: 'string',
          description: '补充：其他想告诉医生的情况，可留空。',
        },
        text: {
          type: 'string',
          description:
            '可选。患者端页面或聊天里粘贴出来的“主诉：/病程：/用药：/过敏：/既往：/补充：”多行文本；与上面的逐字段参数同时出现时，逐字段参数优先。',
        },
      },
      output: {
        schema: EXTRACT_SCHEMA,
        render: renderExtract,
      },
      execute(args) {
        const answers = resolveAnswers(args)
        if (!ANSWER_FIELDS.some(field => String(answers[field] ?? '').trim())) {
          throw new Error('没有收到任何回答：请至少提供 chief（主诉），或提供 text 标签文本。')
        }
        const structured = extractAnswers(answers)
        const summary = buildSummary(structured)
        return {
          ...structured,
          summary: summary.text,
          summary_chars: summary.chars,
          labeled_text: formatLabeledAnswers(answers),
        }
      },
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'clinic_intake_page',
      description:
        'Write a self-contained, offline patient intake page (single HTML file) that asks the six pre-visit questions and prints a labeled answer block to hand to the doctor. The page makes no network requests, stores nothing (no localStorage or cookies), and tells patients not to enter names, ID numbers or phone numbers. Use it when a clinic wants patients to fill in answers on a tablet or kiosk before seeing the doctor.',
      parameters: {
        output_path: {
          type: 'string',
          description: '可选。HTML 输出路径；以 .html 结尾视为完整文件，否则视为目录；留空则写到当前工作目录下的 clinic-intake-form.html。',
        },
        clinic_name: {
          type: 'string',
          description: '可选。机构名，显示在页面标题上（例如“城西社区卫生服务中心”）。',
        },
      },
      output: {
        schema: PAGE_SCHEMA,
        render: renderPage,
      },
      async execute(args) {
        const requestedTarget = (() => {
          const requested = typeof args.output_path === 'string' ? args.output_path.trim() : ''
          if (requested) {
            return requested.toLowerCase().endsWith('.html')
              ? path.resolve(requested)
              : path.resolve(requested, 'clinic-intake-form.html')
          }
          return path.resolve(process.cwd(), 'clinic-intake-form.html')
        })()
        const target = uniqueTarget(requestedTarget)
        const html = buildIntakePage({ clinicName: args.clinic_name })
        try {
          await mkdir(path.dirname(target), { recursive: true })
          await writeFile(target, html, 'utf8')
        } catch (error) {
          throw new Error(`写入填写页失败：${error instanceof Error ? error.message : String(error)}（目标路径：${target}）`)
        }
        return {
          file_path: target.replace(/\\/g, '/'),
          questions: 6,
          message: [
            `已生成患者端填写页：${target.replace(/\\/g, '/')}`,
            '用法：在候诊区的平板或前台电脑上双击打开（file:// 即可，无需服务器），患者填完后点“复制”，把文本交给医生。',
            '页面不联网、不写本地存储；刷新或关闭即清空。医生拿到文本后可用 clinic_intake_extract 整理成摘要。',
            '本插件不提供诊断或用药建议。',
          ].join('\n'),
        }
      },
    }),
  )
}
