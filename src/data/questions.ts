import type { HasTimeGapMeta, SkillType } from '../types'

export interface QuestionData extends HasTimeGapMeta {
  id: string
  type: 'fill_in_blank'
  subject: string
  skillType: SkillType
  difficulty: 1 | 2 | 3 | 4 | 5
  content: string
  step1Hints: string[]
  step2Hints: string[]
  /** Flat list in reading order: each line's blanks left-to-right, then next line. */
  expectedStep1Values: string[]
  expectedStep2Values: string[]
  answerUnit: string
  correctAnswer: number
  answerLabel: string
}

export const questions: QuestionData[] = [
  {
    id: 't001',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求时间',
    hasTimeGap: false,
    difficulty: 1,
    content:
      '甲和乙从相距300米的两端同时出发相向而行，甲每分钟走60米，乙每分钟走40米，几分钟后两人相遇？',
    step1Hints: [
      '两地距离：___ 米',
      '甲的速度：___ 米/分钟',
      '乙的速度：___ 米/分钟',
    ],
    step2Hints: [
      '相遇时间 = ___ ÷ ___',
    ],
    answerUnit: '分钟',
    correctAnswer: 3,
    answerLabel: '___分钟后两人相遇',
    expectedStep1Values: [
      '300',
      '60',
      '40',
    ],
    expectedStep2Values: [
      '总路程',
      '速度和',
    ],
  },

  {
    id: 't002',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求时间',
    hasTimeGap: false,
    difficulty: 2,
    content:
      '甲和乙从相距560米的两端同时出发相向而行，甲每分钟走45米，乙每分钟走25米，几分钟后两人相遇？',
    step1Hints: [
      '两地距离：___ 米',
      '甲的速度：___ 米/分钟',
      '乙的速度：___ 米/分钟',
    ],
    step2Hints: [
      '相遇时间 = ___ ÷ ___',
    ],
    answerUnit: '分钟',
    correctAnswer: 8,
    answerLabel: '___分钟后两人相遇',
    expectedStep1Values: [
      '560',
      '45',
      '25',
    ],
    expectedStep2Values: [
      '总路程',
      '速度和',
    ],
  },

  {
    id: 't003',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求时间',
    hasTimeGap: false,
    difficulty: 3,
    content:
      '甲和乙从相距720米的两端同时出发相向而行，甲每分钟走48米，乙每分钟走42米，几分钟后两人相遇？',
    step1Hints: [
      '两地距离：___ 米',
      '甲的速度：___ 米/分钟',
      '乙的速度：___ 米/分钟',
    ],
    step2Hints: [
      '相遇时间 = ___ ÷ ___',
    ],
    answerUnit: '分钟',
    correctAnswer: 8,
    answerLabel: '___分钟后两人相遇',
    expectedStep1Values: [
      '720',
      '48',
      '42',
    ],
    expectedStep2Values: [
      '总路程',
      '速度和',
    ],
  },

  {
    id: 't004',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求时间',
    hasTimeGap: true,
    difficulty: 3,
    content:
      '甲从A地出发，走了2分钟后乙才从B地出发，两人相向而行。甲每分钟走35米，乙每分钟走15米，两地相距170米，乙出发后再过几分钟两人相遇？',
    step1Hints: [
      '两地距离：___ 米',
      '甲的速度：___ 米/分钟',
      '乙的速度：___ 米/分钟',
      '甲先行时间：___ 分钟',
      '甲先行距离：___×___=___ 米',
    ],
    step2Hints: [
      '相遇时间 = ___ ÷ ___',
    ],
    answerUnit: '分钟',
    correctAnswer: 2,
    answerLabel: '乙出发后再过___分钟两人相遇',
    expectedStep1Values: [
      '170',
      '35',
      '15',
      '2',
      '70',
    ],
    expectedStep2Values: [
      '总路程',
      '速度和',
    ],
  },

  {
    id: 't005',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求时间',
    hasTimeGap: true,
    difficulty: 4,
    content:
      '甲从A地出发，走了3分钟后乙才从B地出发，两人相向而行。甲每分钟走40米，乙每分钟走20米，两地相距240米，乙出发后再过几分钟两人相遇？',
    step1Hints: [
      '两地距离：___ 米',
      '甲的速度：___ 米/分钟',
      '乙的速度：___ 米/分钟',
      '甲先行时间：___ 分钟',
      '甲先行距离：___×___=___ 米',
    ],
    step2Hints: [
      '相遇时间 = ___ ÷ ___',
    ],
    answerUnit: '分钟',
    correctAnswer: 2,
    answerLabel: '乙出发后再过___分钟两人相遇',
    expectedStep1Values: [
      '240',
      '40',
      '20',
      '3',
      '120',
    ],
    expectedStep2Values: [
      '总路程',
      '速度和',
    ],
  },

  {
    id: 't006',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求时间',
    hasTimeGap: true,
    difficulty: 5,
    content:
      '甲骑自行车从A城出发，乙骑自行车从B城出发相向而行，A、B两城相距52千米。甲每小时行12千米，乙每小时行8千米。甲出发1小时后乙才出发，乙出发后再过几小时两人相遇？',
    step1Hints: [
      '两城距离：___ 千米',
      '甲的速度：___ 千米/小时',
      '乙的速度：___ 千米/小时',
      '甲先行时间：___ 小时',
      '甲先行距离：___×___=___ 千米',
    ],
    step2Hints: [
      '相遇时间 = ___ ÷ ___',
    ],
    answerUnit: '小时',
    correctAnswer: 2,
    answerLabel: '乙出发后再过___小时两人相遇',
    expectedStep1Values: [
      '52',
      '12',
      '8',
      '1',
      '12',
    ],
    expectedStep2Values: [
      '总路程',
      '速度和',
    ],
  },

  {
    id: 'r001',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求路程',
    hasTimeGap: false,
    difficulty: 1,
    content:
      '甲和乙从两地同时出发相向而行，甲每分钟走55米，乙每分钟走45米，经过6分钟后两人相遇，两地相距多少米？',
    step1Hints: [
      '甲的速度：___ 米/分钟',
      '乙的速度：___ 米/分钟',
      '相遇时间：___ 分钟',
    ],
    step2Hints: [
      '两地距离 = ___ × ___',
    ],
    answerUnit: '米',
    correctAnswer: 600,
    answerLabel: '两地相距___米',
    expectedStep1Values: [
      '55',
      '45',
      '6',
    ],
    expectedStep2Values: [
      '速度和',
      '相遇时间',
    ],
  },

  {
    id: 'r002',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求路程',
    hasTimeGap: false,
    difficulty: 2,
    content:
      '甲和乙从两地同时出发相向而行，甲每小时走12千米，乙每小时走8千米，5小时后两人相遇，两地相距多少千米？',
    step1Hints: [
      '甲的速度：___ 千米/小时',
      '乙的速度：___ 千米/小时',
      '相遇时间：___ 小时',
    ],
    step2Hints: [
      '两地距离 = ___ × ___',
    ],
    answerUnit: '千米',
    correctAnswer: 100,
    answerLabel: '两地相距___千米',
    expectedStep1Values: [
      '12',
      '8',
      '5',
    ],
    expectedStep2Values: [
      '速度和',
      '相遇时间',
    ],
  },

  {
    id: 'r003',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求路程',
    hasTimeGap: false,
    difficulty: 3,
    content:
      '甲和乙从两地同时出发相向而行，甲每小时走18千米，乙每小时走12千米，4小时后两人相遇，两地相距多少千米？',
    step1Hints: [
      '甲的速度：___ 千米/小时',
      '乙的速度：___ 千米/小时',
      '相遇时间：___ 小时',
    ],
    step2Hints: [
      '两地距离 = ___ × ___',
    ],
    answerUnit: '千米',
    correctAnswer: 120,
    answerLabel: '两地相距___千米',
    expectedStep1Values: [
      '18',
      '12',
      '4',
    ],
    expectedStep2Values: [
      '速度和',
      '相遇时间',
    ],
  },

  {
    id: 'r004',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求路程',
    hasTimeGap: true,
    difficulty: 3,
    content:
      '甲从A地出发，1小时后乙从B地出发，两人相向而行。甲每小时走8千米，乙每小时走12千米，乙出发后2小时两人相遇，A、B两地相距多少千米？',
    step1Hints: [
      '甲的速度：___ 千米/小时',
      '乙的速度：___ 千米/小时',
      '甲共走时间：___+___=___ 小时',
      '乙共走时间：___ 小时',
    ],
    step2Hints: [
      '两地距离 = ___ × ___',
    ],
    answerUnit: '千米',
    correctAnswer: 48,
    answerLabel: 'A、B两地相距___千米',
    expectedStep1Values: [
      '8',
      '12',
      '3',
      '2',
    ],
    expectedStep2Values: [
      '速度和',
      '相遇时间',
    ],
  },

  {
    id: 'r005',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求路程',
    hasTimeGap: true,
    difficulty: 4,
    content:
      '甲从A地出发，2小时后乙从B地出发，两人相向而行。甲每小时走12千米，乙每小时走16千米，乙出发后3小时两人相遇，A、B两地相距多少千米？',
    step1Hints: [
      '甲的速度：___ 千米/小时',
      '乙的速度：___ 千米/小时',
      '甲共走时间：___+___=___ 小时',
      '乙共走时间：___ 小时',
    ],
    step2Hints: [
      '两地距离 = ___ × ___',
    ],
    answerUnit: '千米',
    correctAnswer: 108,
    answerLabel: 'A、B两地相距___千米',
    expectedStep1Values: [
      '12',
      '16',
      '5',
      '3',
    ],
    expectedStep2Values: [
      '速度和',
      '相遇时间',
    ],
  },

  {
    id: 'r006',
    type: 'fill_in_blank',
    subject: '相遇问题',
    skillType: '求路程',
    hasTimeGap: false,
    difficulty: 5,
    content:
      '甲、乙两人同时从A、B两地出发相向而行，甲的速度是乙速度的3倍，经过4小时后两人相遇，乙每小时走5千米，A、B两地相距多少千米？',
    step1Hints: [
      '乙的速度：___ 千米/小时',
      '甲的速度：___×___=___ 千米/小时',
      '相遇时间：___ 小时',
    ],
    step2Hints: [
      '两地距离 = ___ × ___',
    ],
    answerUnit: '千米',
    correctAnswer: 80,
    answerLabel: 'A、B两地相距___千米',
    expectedStep1Values: [
      '5',
      '15',
      '4',
    ],
    expectedStep2Values: [
      '速度和',
      '相遇时间',
    ],
  }
]
