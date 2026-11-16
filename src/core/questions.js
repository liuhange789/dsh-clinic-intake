/**
 * 诊前问答题目定义：Client 界面、Host 工具、患者端 HTML 页面共用一份。
 * @module dsh-clinic-intake/core/questions
 */

/** 六个问题；id 与 ANSWER_FIELDS 一一对应。 */
export const QUESTIONS = Object.freeze([
  {
    id: 'chief',
    label: '今天主要哪里不舒服？',
    hint: '说说最难受的部位和感觉，比如“右边太阳穴一跳一跳地疼”。',
    placeholder: '例如：右边太阳穴一跳一跳地疼',
  },
  {
    id: 'duration',
    label: '这种情况多久了？',
    hint: '大概时间就行，比如 3 天、两个星期、半年。',
    placeholder: '例如：3 天',
  },
  {
    id: 'medications',
    label: '有没有在吃什么药？',
    hint: '药名和吃法，没有就写“没有”。',
    placeholder: '例如：布洛芬，每天三次，每次一片',
  },
  {
    id: 'allergies',
    label: '有没有药物或食物过敏？',
    hint: '对什么过敏、过敏时什么表现，没有就写“没有”。',
    placeholder: '例如：青霉素过敏，起皮疹',
  },
  {
    id: 'history',
    label: '以前有没有得过什么病？',
    hint: '慢性病、做过的手术、长期吃的药都可以说，没有就写“没有”。',
    placeholder: '例如：高血压 5 年',
  },
  {
    id: 'extra',
    label: '还有什么想告诉医生的？',
    hint: '睡眠、饮食、大小便、情绪，或者其他担心的事，可以留空。',
    placeholder: '例如：这两天晚上几乎没睡着',
  },
])

/** 界面上的固定声明。 */
export const DISCLAIMER = '本插件只整理患者自述，不提供诊断、分诊结论或用药建议，也不是医疗器械。'
