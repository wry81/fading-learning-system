import type { ProblemSubtype, SkillType, TutorialQuestionMeta } from '../types'

export interface QuestionData extends TutorialQuestionMeta {
  id: string
  type: 'fill_in_blank'
  subject: string
  skillType: SkillType
  subtype: ProblemSubtype
  difficulty: 0 | 1 | 2 | 3 | 4 | 5
  content: string
  baseLabel: string
  largerLabel: string
  factor: number
  knownAmount: number
  knownQuantityLabel: string
  correctAnswers: number[]
  answerLabels: string[]
  answerUnits: string[]
}

export const questions: QuestionData[] = [
  {
    id: 'tutorial1', type: 'fill_in_blank', subject: '练习题', skillType: '倍数份数关系',
    subtype: 'sum', difficulty: 0, isTutorial: true,
    content: '小明和小红一共有24颗糖。小红的糖是小明的2倍。两人各有多少颗糖？',
    baseLabel: '小明', largerLabel: '小红', factor: 2, knownAmount: 24,
    knownQuantityLabel: '小明和小红糖的总数',
    correctAnswers: [8, 16], answerLabels: ['小明', '小红'], answerUnits: ['颗', '颗'],
  },
  {
    id: 'm001', type: 'fill_in_blank', subject: '倍数关系·和', skillType: '倍数份数关系', subtype: 'sum', difficulty: 1,
    content: '小宇和小杰一共有48张卡片。小杰的卡片数量是小宇的3倍。两人各有多少张卡片？',
    baseLabel: '小宇', largerLabel: '小杰', factor: 3, knownAmount: 48,
    knownQuantityLabel: '小宇和小杰卡片的总数',
    correctAnswers: [12, 36], answerLabels: ['小宇', '小杰'], answerUnits: ['张', '张'],
  },
  {
    id: 'm002', type: 'fill_in_blank', subject: '倍数关系·差', skillType: '倍数份数关系', subtype: 'difference', difficulty: 1,
    content: '哥哥的邮票数量是弟弟的3倍，哥哥比弟弟多28张邮票。两人各有多少张邮票？',
    baseLabel: '弟弟', largerLabel: '哥哥', factor: 3, knownAmount: 28,
    knownQuantityLabel: '哥哥和弟弟邮票的数量差',
    correctAnswers: [14, 42], answerLabels: ['弟弟', '哥哥'], answerUnits: ['张', '张'],
  },
  {
    id: 'm003', type: 'fill_in_blank', subject: '倍数关系·和', skillType: '倍数份数关系', subtype: 'sum', difficulty: 2,
    content: '学校科技社团中，五年级参加的人数是四年级的2倍，两个年级一共有45人。两个年级分别有多少人参加？',
    baseLabel: '四年级', largerLabel: '五年级', factor: 2, knownAmount: 45,
    knownQuantityLabel: '四年级和五年级参加科技社团的总人数',
    correctAnswers: [15, 30], answerLabels: ['四年级', '五年级'], answerUnits: ['人', '人'],
  },
  {
    id: 'm004', type: 'fill_in_blank', subject: '倍数关系·差', skillType: '倍数份数关系', subtype: 'difference', difficulty: 2,
    content: '红色彩带的长度是蓝色彩带的4倍，红色彩带比蓝色彩带长36厘米。两条彩带分别长多少厘米？',
    baseLabel: '蓝色彩带', largerLabel: '红色彩带', factor: 4, knownAmount: 36,
    knownQuantityLabel: '红色彩带和蓝色彩带的长度差',
    correctAnswers: [12, 48], answerLabels: ['蓝色彩带', '红色彩带'], answerUnits: ['厘米', '厘米'],
  },
  {
    id: 'm005', type: 'fill_in_blank', subject: '倍数关系·和', skillType: '倍数份数关系', subtype: 'sum', difficulty: 3,
    content: '两个书架上一共有70本书。上层书架的书是下层书架的4倍。两个书架分别有多少本书？',
    baseLabel: '下层书架', largerLabel: '上层书架', factor: 4, knownAmount: 70,
    knownQuantityLabel: '上层书架和下层书架图书的总数',
    correctAnswers: [14, 56], answerLabels: ['下层书架', '上层书架'], answerUnits: ['本', '本'],
  },
  {
    id: 'm006', type: 'fill_in_blank', subject: '倍数关系·差', skillType: '倍数份数关系', subtype: 'difference', difficulty: 3,
    content: '篮子里苹果的数量是梨的5倍，苹果比梨多48个。苹果和梨分别有多少个？',
    baseLabel: '梨', largerLabel: '苹果', factor: 5, knownAmount: 48,
    knownQuantityLabel: '苹果和梨的数量差',
    correctAnswers: [12, 60], answerLabels: ['梨', '苹果'], answerUnits: ['个', '个'],
  },
  {
    id: 'm007', type: 'fill_in_blank', subject: '倍数关系·和', skillType: '倍数份数关系', subtype: 'sum', difficulty: 4,
    content: '小林和小雨一共存了84元。小林存的钱是小雨的6倍。两人分别存了多少钱？',
    baseLabel: '小雨', largerLabel: '小林', factor: 6, knownAmount: 84,
    knownQuantityLabel: '小林和小雨存钱的总数',
    correctAnswers: [12, 72], answerLabels: ['小雨', '小林'], answerUnits: ['元', '元'],
  },
  {
    id: 'm008', type: 'fill_in_blank', subject: '倍数关系·差', skillType: '倍数份数关系', subtype: 'difference', difficulty: 4,
    content: '科技馆上午接待的学生人数是下午的5倍，上午比下午多接待72名学生。上午和下午分别接待多少名学生？',
    baseLabel: '下午', largerLabel: '上午', factor: 5, knownAmount: 72,
    knownQuantityLabel: '上午和下午接待学生的人数差',
    correctAnswers: [18, 90], answerLabels: ['下午', '上午'], answerUnits: ['名', '名'],
  },
]

export function experimentQuestions(skillType: SkillType): QuestionData[] {
  return questions.filter((q) => !q.isTutorial && q.skillType === skillType)
}

export function getTutorialQuestion(): QuestionData {
  const tutorial = questions.find((q) => q.isTutorial)
  if (!tutorial) throw new Error('Tutorial question not found')
  return tutorial
}
