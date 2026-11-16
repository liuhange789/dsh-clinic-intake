/**
 * Browser half of dsh-clinic-intake.
 *
 * Contributes one real slot of the web shell — `conversation.session.header.actions`
 * — a「候诊采集」button that opens a six-question intake wizard. Extraction runs
 * locally from the same rule core the host tools use; no request leaves the page.
 *
 * @module dsh-clinic-intake/client
 */

import React from 'react'
import { extractAnswers } from '../core/extract.js'
import { DISCLAIMER, QUESTIONS } from '../core/questions.js'
import { buildSummary } from '../core/summary.js'

/** Client plugin name shown in diagnostics. */
export const name = 'clinic-intake-client'

/** Only the slot registry is required; the web profile provides it. */
export const inject = ['slots']

const EMPTY_ANSWERS = ['', '', '', '', '', '']

const ACTION_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 8px',
  minHeight: '28px',
  background: 'transparent',
  border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35))',
  borderRadius: '8px',
  color: 'inherit',
  font: 'inherit',
  fontSize: '12px',
  lineHeight: '18px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const OVERLAY_STYLE = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  background: 'rgba(15, 23, 42, 0.42)',
}

const CARD_STYLE = {
  width: 'min(560px, 100%)',
  maxHeight: 'min(78vh, 720px)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '18px 20px',
  borderRadius: '14px',
  background: 'var(--dsw-alias-bg-layer-1, #fff)',
  color: 'var(--dsw-alias-label-primary, #1b1f24)',
  boxShadow: '0 20px 48px rgba(15, 23, 42, 0.28)',
  fontSize: '13px',
  lineHeight: '1.6',
  overflow: 'auto',
}

const TEXTAREA_STYLE = {
  width: '100%',
  minHeight: '96px',
  padding: '10px',
  borderRadius: '10px',
  border: '1px solid var(--dsw-alias-border-l2, #d8dce3)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  resize: 'vertical',
}

const SECONDARY_BUTTON = {
  font: 'inherit',
  padding: '8px 14px',
  borderRadius: '9px',
  border: '1px solid var(--dsw-alias-border-l2, #d3d8df)',
  background: 'transparent',
  color: 'inherit',
  cursor: 'pointer',
}

const PRIMARY_BUTTON = {
  ...SECONDARY_BUTTON,
  border: '1px solid #2563eb',
  background: '#2563eb',
  color: '#fff',
}

const RESULT_TEXT_STYLE = {
  whiteSpace: 'pre-wrap',
  font: 'inherit',
  background: 'var(--dsw-alias-fill-l1, #f8fafc)',
  border: '1px solid var(--dsw-alias-border-l1, #e3e6eb)',
  borderRadius: '10px',
  padding: '12px',
  margin: 0,
}

/**
 * Copy text to the clipboard, falling back to a temporary textarea.
 * @param {string} text - text to copy.
 * @returns {Promise<boolean>} whether the copy path succeeded.
 */
async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/**
 * Intake wizard dialog.
 * @returns {React.ReactElement} dialog markup.
 */
function IntakeDialog({ onClose }) {
  const [step, setStep] = React.useState(0)
  const [answers, setAnswers] = React.useState(EMPTY_ANSWERS)
  const [result, setResult] = React.useState(null)
  const [copied, setCopied] = React.useState('')

  const question = QUESTIONS[step]

  const setAnswer = value => {
    setAnswers(current => {
      const next = current.slice()
      next[step] = value
      return next
    })
  }

  const finish = () => {
    const structured = extractAnswers({
      chief: answers[0],
      duration: answers[1],
      medications: answers[2],
      allergies: answers[3],
      history: answers[4],
      extra: answers[5],
    })
    const summary = buildSummary(structured)
    setResult({ structured, summary })
  }

  const restart = () => {
    setAnswers(EMPTY_ANSWERS)
    setStep(0)
    setResult(null)
    setCopied('')
  }

  const copy = async () => {
    if (!result) return
    const ok = await copyText(result.summary.text)
    setCopied(ok ? '已复制，可直接粘贴到电子病历' : '复制失败，请手动选择摘要文本')
  }

  return (
    <div style={OVERLAY_STYLE} role="dialog" aria-modal="true" aria-label="候诊信息采集">
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>候诊信息采集</div>
            <div style={{ opacity: 0.72, fontSize: '12px' }}>
              请患者回答，填完生成结构化摘要给医生看；不采集姓名、证件号、电话。
            </div>
          </div>
          <button type="button" style={SECONDARY_BUTTON} onClick={onClose} aria-label="关闭">
            关闭
          </button>
        </div>

        {result === null ? (
          <>
            <div style={{ opacity: 0.65, fontSize: '12px' }}>
              第 {step + 1} / {QUESTIONS.length} 问
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>{question.label}</div>
            <div style={{ opacity: 0.72, fontSize: '12px' }}>{question.hint}</div>
            <textarea
              style={TEXTAREA_STYLE}
              value={answers[step]}
              placeholder={question.placeholder}
              onChange={event => setAnswer(event.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
              <button
                type="button"
                style={SECONDARY_BUTTON}
                onClick={() => setStep(current => Math.max(0, current - 1))}
                disabled={step === 0}
              >
                上一题
              </button>
              {step < QUESTIONS.length - 1 ? (
                <button
                  type="button"
                  style={PRIMARY_BUTTON}
                  onClick={() => setStep(current => current + 1)}
                >
                  下一题
                </button>
              ) : (
                <button type="button" style={PRIMARY_BUTTON} onClick={finish}>
                  生成摘要
                </button>
              )}
            </div>
            <div style={{ opacity: 0.6, fontSize: '12px' }}>{DISCLAIMER}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>就诊摘要（{result.summary.chars}/300 字）</div>
            <pre style={RESULT_TEXT_STYLE}>{result.summary.text}</pre>
            {result.structured.missing_fields.length > 0 ? (
              <div style={{ opacity: 0.72, fontSize: '12px' }}>
                未填写：{result.structured.missing_fields.map(field => ({
                  chief: '主诉',
                  duration: '病程',
                  medications: '用药史',
                  allergies: '过敏史',
                  history: '既往史',
                }[field] || field)).join('、')}
              </div>
            ) : null}
            {result.structured.phi_redactions.length > 0 ? (
              <div style={{ opacity: 0.72, fontSize: '12px' }}>
                已隐去身份类内容（{Array.from(new Set(result.structured.phi_redactions.map(item => item.kind))).join('、')}），摘要中不保留原文。
              </div>
            ) : null}
            {result.summary.trimmed ? (
              <div style={{ opacity: 0.72, fontSize: '12px' }}>为控制在 300 字内，补充说明或既往条目已截短。</div>
            ) : null}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button type="button" style={PRIMARY_BUTTON} onClick={copy}>
                复制摘要
              </button>
              <button type="button" style={SECONDARY_BUTTON} onClick={restart}>
                重新采集
              </button>
              {copied ? <span style={{ color: '#16a34a', fontSize: '12px' }}>{copied}</span> : null}
            </div>
            <div style={{ opacity: 0.6, fontSize: '12px' }}>{DISCLAIMER}</div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Header action: one button that mounts the intake dialog.
 * @returns {React.ReactElement} action button (and dialog while open).
 */
export function ClinicIntakeAction() {
  const [open, setOpen] = React.useState(false)
  return (
    <>
      <button
        type="button"
        style={ACTION_STYLE}
        onClick={() => setOpen(true)}
        title="逐条采集主诉、病程、用药、过敏、既往与补充，生成 300 字内就诊摘要"
      >
        <span aria-hidden="true">🩺</span>
        <span>候诊采集</span>
      </button>
      {open ? <IntakeDialog onClose={() => setOpen(false)} /> : null}
    </>
  )
}

/**
 * Client plugin body: contribute the header action.
 * @param {*} ctx - client plugin context.
 */
export function apply(ctx) {
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions',
    id: 'clinic-intake',
    order: 40,
  }, ClinicIntakeAction))
}
