/**
 * 患者端就诊信息填写页：一个完全离线的单文件 HTML。
 *
 * 页面不发起任何网络请求、不写 localStorage / cookie、不采集姓名与证件号；
 * 患者在候诊时填写，填完点“复制”，把文本交给医生或粘贴回 DSH 会话。
 *
 * @module dsh-clinic-intake/core/page
 */

/**
 * 生成单文件 HTML 页面。
 * @param {{ title?: string, clinicName?: string }} [options] - 可选标题与机构名。
 * @returns {string} 完整 HTML 文本。
 */
export function buildIntakePage(options = {}) {
  const title = String(options.title || '就诊前信息填写')
  const clinicName = String(options.clinicName || '')
  const header = clinicName ? `${clinicName} · ${title}` : title

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 20px;
    font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
    background: #f6f7f9; color: #1b1f24;
    font-size: 16px; line-height: 1.6;
  }
  .wrap { max-width: 560px; margin: 0 auto; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .sub { color: #646b76; font-size: 13px; margin-bottom: 18px; }
  .card {
    background: #fff; border: 1px solid #e3e6eb; border-radius: 14px;
    padding: 20px; box-shadow: 0 1px 2px rgba(16,24,40,.04);
  }
  .step { color: #646b76; font-size: 13px; margin-bottom: 8px; }
  .q { font-size: 18px; font-weight: 600; margin-bottom: 6px; }
  .hint { color: #646b76; font-size: 13px; margin-bottom: 12px; }
  textarea {
    width: 100%; min-height: 120px; padding: 12px;
    border: 1px solid #d8dce3; border-radius: 10px;
    font: inherit; resize: vertical; background: #fff; color: inherit;
  }
  textarea:focus { outline: 2px solid #3b82f6; outline-offset: 1px; border-color: transparent; }
  .row { display: flex; gap: 10px; margin-top: 16px; }
  button {
    font: inherit; padding: 10px 18px; border-radius: 10px; cursor: pointer;
    border: 1px solid #d3d8df; background: #fff; color: inherit;
  }
  button.primary { background: #2563eb; border-color: #2563eb; color: #fff; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  .out {
    white-space: pre-wrap; font-family: inherit;
    background: #f8fafc; border: 1px solid #e3e6eb; border-radius: 10px;
    padding: 12px; min-height: 160px;
  }
  .note { color: #8a919c; font-size: 12px; margin-top: 14px; }
  .toast { color: #16a34a; font-size: 13px; margin-left: 8px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(header)}</h1>
  <div class="sub">约 1 分钟。请只填写症状信息，不要填写姓名、身份证号或电话号码。</div>
  <div class="card" id="card"></div>
  <div class="note">本页面不联网、不保存内容，刷新即清空。整理结果仅供医生快速了解情况，不含诊断或用药建议。</div>
</div>
<script>
(function () {
  var QUESTIONS = [
    { label: '今天主要哪里不舒服？', hint: '说说最难受的部位和感觉，比如“右边太阳穴一跳一跳地疼”。', placeholder: '例如：右边太阳穴一跳一跳地疼', tag: '主诉' },
    { label: '这种情况多久了？', hint: '大概时间就行，比如 3 天、两个星期、半年。', placeholder: '例如：3 天', tag: '病程' },
    { label: '有没有在吃什么药？', hint: '药名和吃法，没有就写“没有”。', placeholder: '例如：布洛芬，每天三次，每次一片', tag: '用药' },
    { label: '有没有药物或食物过敏？', hint: '对什么过敏、过敏时什么表现，没有就写“没有”。', placeholder: '例如：青霉素过敏，起皮疹', tag: '过敏' },
    { label: '以前有没有得过什么病？', hint: '慢性病、做过的手术都可以说，没有就写“没有”。', placeholder: '例如：高血压 5 年', tag: '既往' },
    { label: '还有什么想告诉医生的？', hint: '睡眠、饮食、情绪，或者其他担心的事，可以留空。', placeholder: '例如：这两天晚上几乎没睡着', tag: '补充' }
  ];
  var answers = ['', '', '', '', '', ''];
  var index = 0;
  var card = document.getElementById('card');

  function render() {
    var q = QUESTIONS[index];
    var html = '';
    html += '<div class="step">第 ' + (index + 1) + ' / ' + QUESTIONS.length + ' 问</div>';
    html += '<div class="q">' + q.label + '</div>';
    html += '<div class="hint">' + q.hint + '</div>';
    html += '<textarea id="answer" placeholder="' + q.placeholder + '"></textarea>';
    html += '<div class="row">';
    html += '<button id="prev"' + (index === 0 ? ' disabled' : '') + '>上一题</button>';
    html += '<button class="primary" id="next">' + (index === QUESTIONS.length - 1 ? '生成结果' : '下一题') + '</button>';
    html += '</div>';
    card.innerHTML = html;
    var area = document.getElementById('answer');
    area.value = answers[index];
    area.focus();
    document.getElementById('prev').onclick = function () { save(); if (index > 0) { index -= 1; render(); } };
    document.getElementById('next').onclick = function () { save(); if (index < QUESTIONS.length - 1) { index += 1; render(); } else { showResult(); } };
    area.oninput = function () { answers[index] = area.value; };
  }

  function save() {
    var area = document.getElementById('answer');
    if (area) answers[index] = area.value;
  }

  function showResult() {
    var text = answers.map(function (value, i) {
      var v = value.replace(/\\s+/g, ' ').trim();
      return QUESTIONS[i].tag + '：' + (v || '未填写');
    }).join('\\n');
    var html = '';
    html += '<div class="q">填好了，请把这段内容交给医生</div>';
    html += '<div class="hint">可以点“复制”，也可以请医生直接读。</div>';
    html += '<div class="out" id="out"></div>';
    html += '<div class="row">';
    html += '<button id="back">返回修改</button>';
    html += '<button class="primary" id="copy">复制</button><span class="toast" id="toast"></span>';
    html += '</div>';
    card.innerHTML = html;
    var out = document.getElementById('out');
    out.textContent = text;
    document.getElementById('back').onclick = function () { index = QUESTIONS.length - 1; render(); };
    document.getElementById('copy').onclick = function () {
      var done = function () { document.getElementById('toast').textContent = '已复制'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { selectOut(); });
      } else {
        selectOut();
      }
    };
    function selectOut() {
      var range = document.createRange();
      range.selectNodeContents(out);
      var selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.getElementById('toast').textContent = '已选中，请长按或按键复制';
    }
  }

  render();
})();
</script>
</body>
</html>
`
}

/**
 * 最小 HTML 转义（标题与机构名是唯一由外部传入的文本）。
 * @param {string} text - 原始文本。
 * @returns {string} 转义结果。
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
