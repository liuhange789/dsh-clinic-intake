import test from 'node:test'
import assert from 'node:assert/strict'
import { extractAnswers, formatLabeledAnswers, parseLabeledAnswers } from '../src/core/extract.js'
import { buildSummary } from '../src/core/summary.js'

/** 五种常见主诉：结构化字段应稳定命中。 */
const CASES = [
  {
    name: '头痛',
    input: {
      chief: '右边太阳穴一跳一跳地疼，从前天开始',
      duration: '3 天',
      medications: '布洛芬，每天三次，每次一片',
      allergies: '没有',
      history: '高血压 5 年',
      extra: '这两天晚上几乎没睡着',
    },
    expect: { location: '太阳穴', character: '跳痛', duration: '3天', category: '疼痛' },
  },
  {
    name: '腹痛',
    input: {
      chief: '肚脐周围一阵一阵绞痛',
      duration: '一天',
      medications: '没有在吃药',
      allergies: '无',
      history: '没有',
      extra: '',
    },
    expect: { location: '腹部', character: '绞痛', duration: '一天', category: '消化' },
  },
  {
    name: '咳嗽',
    input: {
      chief: '干咳，嗓子痒',
      duration: '两个星期',
      medications: '无',
      allergies: '无',
      history: '无',
      extra: '晚上咳得更厉害',
    },
    expect: { location: '咽喉', character: '干咳', duration: '两个星期', category: '呼吸' },
  },
  {
    name: '皮疹',
    input: {
      chief: '胳膊上起了红色疹子，很痒',
      duration: '两天',
      medications: '没有',
      allergies: '海鲜过敏',
      history: '无',
      extra: '',
    },
    expect: { location: '皮肤', character: '瘙痒', duration: '两天', category: '皮肤' },
  },
  {
    name: '失眠',
    input: {
      chief: '最近一周睡不着，入睡困难',
      duration: '一周',
      medications: '没有',
      allergies: '无',
      history: '无',
      extra: '白天没精神',
    },
    expect: { location: '睡眠', character: '', duration: '一周', category: '睡眠与情绪' },
  },
]

for (const item of CASES) {
  test(`结构化：${item.name}`, () => {
    const value = extractAnswers(item.input)
    assert.equal(value.chief_complaint.location, item.expect.location)
    assert.equal(value.chief_complaint.character, item.expect.character)
    assert.equal(value.chief_complaint.duration, item.expect.duration)
    assert.equal(value.reason_category, item.expect.category)
  })
}

test('用药：药名与频次拆开，没有就为空', () => {
  const value = extractAnswers({ chief: '头痛', medications: '布洛芬，每天三次，每次一片；对乙酰氨基酚 按需' })
  assert.equal(value.medications.length, 2)
  assert.equal(value.medications[0].name, '布洛芬')
  assert.match(value.medications[0].frequency, /每天三次/)
  assert.equal(value.medications[1].name, '对乙酰氨基酚')

  const none = extractAnswers({ chief: '头痛', medications: '没有在吃药' })
  assert.deepEqual(none.medications, [])
})

test('过敏：“没有药物过敏，但吃海鲜会起疹子”不丢后半句', () => {
  const value = extractAnswers({ chief: '皮肤痒', allergies: '没有药物过敏，但吃海鲜会起疹子' })
  assert.equal(value.allergies.length, 1)
  assert.match(value.allergies[0], /海鲜/)
})

test('既往与补充：条目拆分并截断', () => {
  const value = extractAnswers({ history: '高血压 5 年、2 型糖尿病；做过胆囊手术', extra: '最近压力大' })
  assert.equal(value.past_history.length, 3)
  assert.equal(value.free_text, '最近压力大')
})

test('标签文本可以逐字段解析，返回同款结构', () => {
  const text = '主诉：左边太阳穴胀痛\n病程：半年\n用药：氨氯地平，每天一次\n过敏：无\n既往：高血压\n补充：最近头晕'
  const answers = parseLabeledAnswers(text)
  const value = extractAnswers(answers)
  assert.equal(value.chief_complaint.location, '太阳穴')
  assert.equal(value.chief_complaint.character, '胀痛')
  assert.equal(value.chief_complaint.duration, '半年')
  assert.equal(value.medications[0].name, '氨氯地平')
  assert.deepEqual(value.allergies, [])
  assert.equal(value.past_history[0], '高血压')
  assert.equal(value.free_text, '最近头晕')
})

test('标签文本格式化可以被自己解析回来', () => {
  const input = { chief: '头痛', duration: '3 天', medications: '无', allergies: '无', history: '无', extra: '' }
  const text = formatLabeledAnswers(input)
  const parsed = parseLabeledAnswers(text)
  assert.equal(parsed.chief, '头痛')
  assert.equal(parsed.duration, '3 天')
  assert.equal(parsed.history, '无')
})

test('分类以主诉为准：补充里的“睡不着”不会抢走头痛的疼痛标签', () => {
  const value = extractAnswers({
    chief: '右边太阳穴一跳一跳地疼',
    duration: '3 天',
    extra: '最近晚上睡不着',
  })
  assert.equal(value.reason_category, '疼痛')
  assert.equal(value.chief_complaint.duration, '3天')
})

test('缺失字段会列出来，摘要仍可生成', () => {
  const value = extractAnswers({ chief: '头痛' })
  assert.deepEqual(value.missing_fields.sort(), ['allergies', 'duration', 'history', 'medications'])
  const summary = buildSummary(value)
  assert.match(summary.text, /主诉/)
  assert.ok(summary.chars <= 300)
})

test('用药：并列药名按“和”拆成两条并共享频次', () => {
  const value = extractAnswers({ chief: '头痛', medications: '吃了布洛芬和头孢，每天三次' })
  assert.equal(value.medications.length, 2)
  assert.deepEqual(
    value.medications.map(item => item.name),
    ['布洛芬', '头孢'],
  )
  for (const item of value.medications) assert.match(item.frequency, /每天三次/)
})

test('用药：药名剥离剂量，频次支持“一天三次 / 每次一片”', () => {
  const value = extractAnswers({
    chief: '头痛',
    medications: '布洛芬缓释胶囊 0.3g 每天两次 每次一片；头孢 0.1g 一天三次',
  })
  assert.equal(value.medications.length, 2)
  assert.equal(value.medications[0].name, '布洛芬缓释胶囊')
  assert.equal(value.medications[0].name.includes('0.3g'), false)
  assert.equal(value.medications[0].name.includes('每天'), false)
  assert.match(value.medications[0].frequency, /每天两次/)
  assert.equal(value.medications[1].name, '头孢')
  assert.equal(value.medications[1].name.includes('0.1g'), false)
  assert.match(value.medications[1].frequency, /一天三次/)
})

test('病程：“今天第二天”规范成 2 天，不抽成“二天”', () => {
  const value = extractAnswers({ chief: '头痛伴恶心，今天第二天，昨晚睡不着' })
  assert.equal(value.chief_complaint.duration, '2天')
  assert.notEqual(value.chief_complaint.duration, '二天')
})

test('分类：主诉主症优先，补充的“睡不着”不抢占头痛标签', () => {
  const value = extractAnswers({ chief: '头痛伴恶心，昨晚睡不着' })
  assert.equal(value.reason_category, '疼痛')
})

test('既往：“无痛胃镜”是名词短语，不被当成“无”吞掉', () => {
  const value = extractAnswers({ chief: '胃不舒服', history: '无痛胃镜' })
  assert.deepEqual(value.past_history, ['无痛胃镜'])
})

test('过敏：去掉句首的“但 / 但是 / 不过”', () => {
  const value = extractAnswers({ chief: '皮肤痒', allergies: '没有药物过敏，但吃海鲜会起疹子' })
  assert.deepEqual(value.allergies, ['吃海鲜会起疹子'])
  assert.equal(value.allergies[0].startsWith('但'), false)
})

test('页面回灌“未填写”：不产生假药与假过敏，缺失字段恢复', () => {
  const pageText = ['主诉：头痛', '病程：未填写', '用药：未填写', '过敏：未填写', '既往：未填写', '补充：未填写'].join('\n')
  const value = extractAnswers(parseLabeledAnswers(pageText))
  assert.deepEqual(value.medications, [])
  assert.deepEqual(value.allergies, [])
  assert.deepEqual(value.past_history, [])
  assert.deepEqual(value.missing_fields.sort(), ['allergies', 'duration', 'history', 'medications'])
})

