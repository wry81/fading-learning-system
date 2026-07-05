import type { QuestionData } from '../data/questions'
import type { FadingStage, SkillType, StudyCondition } from '../types'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined

/** After「检查一下」且学生未填任何空时显示（本地，不调 API） */
export const EMPTY_CHECK_HINT = '先试着从题目里找找数字吧～'

const FORMAT_RULES = `
重要格式规则：
- 绝对不使用 Markdown 格式
- 不使用 ###、**、---、- 等符号
- 只用普通中文句子
- 最多2-3句话
- 不分层，不分段，直接说`

const INITIAL_TEACHER_SYSTEM =
  `你是小学数学辅导老师，帮助三四年级学生做行程类应用题。回答要简短、口语化、鼓励性；不要直接写出本题的最终数值答案；不要使用方程式。${FORMAT_RULES}`

function buildStudentFeedbackBlock(
  studentInputs: string[],
  inputsCorrect: boolean[],
): string {
  const pairs = studentInputs.map((v, i) => {
    const ok = inputsCorrect[i] ?? false
    return `第${i + 1}空：「${v || '（未填）'}」${ok ? '✓' : '✗'}`
  })
  const correctIdx = inputsCorrect
    .map((ok, i) => (ok ? i + 1 : null))
    .filter((x): x is number => x != null)
  const wrongIdx = inputsCorrect
    .map((ok, i) => (!ok ? i + 1 : null))
    .filter((x): x is number => x != null)
  return [
    '学生填写的内容（按空顺序）：',
    ...pairs,
    '',
    `其中判定为正确的空序号：${correctIdx.length ? correctIdx.join('、') : '无'}`,
    `其中判定为错误或未填的空序号：${wrongIdx.length ? wrongIdx.join('、') : '无'}`,
  ].join('\n')
}

const HINT_RULES = `
重要规则：不要使用算式或具体数字；不要直接说出答案；用「你」不用「您」；最多2-3句话；结尾用问句鼓励思考。${FORMAT_RULES}`

/** Step 1 / Step 3：fixed 对照组与 fading full_support 使用相同深度 */
function effectiveFadingStage(
  fadingStage: FadingStage,
  studyCondition: StudyCondition,
): FadingStage {
  if (studyCondition === 'fixed') return 'full_support'
  return fadingStage
}

/** Step 2：fixed 对照组始终使用 partial 深度 */
function step2EffectiveStage(
  fadingStage: FadingStage,
  studyCondition: StudyCondition,
): FadingStage {
  if (studyCondition === 'fixed') return 'partial'
  return fadingStage
}

function step1SystemPrompt(
  fadingStage: FadingStage,
  studentBlock: string,
  studyCondition: StudyCondition,
): string {
  const stage = effectiveFadingStage(fadingStage, studyCondition)

  const ctx = `

${studentBlock}

请根据学生的具体填写情况给出反馈，仍遵守上述格式与重要规则。`

  if (stage === 'full_support') {
    return `你是一个友好的小学数学老师。
用一句话引导学生找出题目里的关键信息。
格式：'我们来看看题目，里面藏着几个重要的数字：
      一个是____，一个是____，还有一个是____'
把空白替换成这道题的信息类型（不是具体数字），
比如'两地之间的距离''甲的速度''乙的速度'。
语气轻松，像在和学生一起读题。${HINT_RULES}

${studentBlock}

请根据学生的具体填写情况给出反馈，仍遵守上述格式与重要规则。`
  }

  if (stage === 'partial') {
    return `你是一个小学数学老师。
用一句话提示学生应该关注题目的哪个方面。
只说信息类型，不说具体数字。
比如：'先找找题目里有几个速度？方向是什么？'
不超过20个字。${HINT_RULES}${ctx}`
  }

  if (stage === 'minimal') {
    return `你是一个小学数学老师。
只用一句话，提示学生读题时最重要的事。
不超过10个字。
比如：'找找题目里有哪些数字'${HINT_RULES}`
  }

  return ''
}

const STEP2_NO_NUMBERS_RULE = `
重要规则（必须遵守）：
- 绝对不能提到任何具体数字
- 不要说「把60和40填入」之类的话
- 只使用概念词：甲的速度、乙的速度、速度和、总路程、相遇时间、两地距离、先行时间、甲先行距离、剩余距离、甲走的时间、乙走的时间、甲走的路程、乙走的路程`

const STEP3_NUMBERS_RULE = `
重要规则（必须遵守）：
- 必须引用题目中的实际数字，引导学生代入公式
- 可以写出算式（如 60 + 40 = ？），但不要直接说出最终答案的数值`

function step2FormulaLines(skillType: SkillType, hasTimeGap: boolean): string {
  if (skillType === '求时间') {
    if (hasTimeGap) {
      return `甲先行距离 = 甲的速度 × 先行时间
剩余距离 = 总路程 - 甲先行距离
速度和 = 甲的速度 + 乙的速度
相遇时间 = 剩余距离 ÷ 速度和`
    }
    return `速度和 = 甲的速度 + 乙的速度
相遇时间 = 总路程 ÷ 速度和`
  }

  if (hasTimeGap) {
    return `甲走的路程 = 甲的速度 × 甲走的时间
乙走的路程 = 乙的速度 × 乙走的时间
两地距离 = 甲走的路程 + 乙走的路程`
  }
  return `速度和 = 甲的速度 + 乙的速度
两地距离 = 速度和 × 相遇时间`
}

function step2SystemPrompt(
  fadingStage: FadingStage,
  skillType: SkillType,
  hasTimeGap: boolean,
  studentBlock: string,
  studyCondition: StudyCondition,
  includeFeedback: boolean,
): string {
  const stage = step2EffectiveStage(fadingStage, studyCondition)
  const formulaLines = step2FormulaLines(skillType, hasTimeGap)
  const feedbackCtx =
    includeFeedback && studentBlock
      ? `

${studentBlock}

若需反馈学生填空，只用概念词指出哪个量有误，绝不复述具体数字。仍遵守上述格式与规则。`
      : ''

  if (stage === 'full_support') {
    const lineCount = formulaLines.split('\n').length
    const suffix =
      lineCount > 2
        ? `就这几行，不加任何其他解释。`
        : `就这两行，不加任何其他解释。`

    return `你是小学数学辅导老师。
只用抽象概念解释公式，绝对不能提到任何具体数字。

回答内容固定为：
${formulaLines}

${suffix}
不使用Markdown格式。${STEP2_NO_NUMBERS_RULE}${feedbackCtx}`
  }

  if (stage === 'partial') {
    if (hasTimeGap && skillType === '求时间') {
      return `你是小学数学辅导老师。
只给方向提示，只用概念词，不提具体数字。

回答：
甲先走了一段距离，先算出剩余的路程，
再想想怎么求相遇时间。

不超过2句话，不使用Markdown格式。${STEP2_NO_NUMBERS_RULE}${feedbackCtx}`
    }

    if (hasTimeGap && skillType === '求路程') {
      return `你是小学数学辅导老师。
只给方向提示，只用概念词，不提具体数字。

回答：
先分别算出甲和乙各自走了多少路程，
再想想怎么得到两地距离。

不超过2句话，不使用Markdown格式。${STEP2_NO_NUMBERS_RULE}${feedbackCtx}`
    }

    if (skillType === '求时间') {
      return `你是小学数学辅导老师。
只给方向提示，只用概念词，不提具体数字。

回答：
想想两个人合起来的速度怎么算？
再想想有了速度和之后怎么求时间？

不超过2句话，不使用Markdown格式。${STEP2_NO_NUMBERS_RULE}${feedbackCtx}`
    }

    return `你是小学数学辅导老师。
只给方向提示，只用概念词，不提具体数字。

回答：
想想两个人合起来的速度怎么算？
再想想有了速度和和相遇时间之后，怎么得到两地距离？

不超过2句话，不使用Markdown格式。${STEP2_NO_NUMBERS_RULE}${feedbackCtx}`
  }

  if (stage === 'minimal') {
    let line: string
    if (hasTimeGap && skillType === '求时间') {
      line = '先算剩余距离，再除速度和。'
    } else if (hasTimeGap && skillType === '求路程') {
      line = '先算各自路程，再相加。'
    } else if (skillType === '求时间') {
      line = '速度和，然后除法。'
    } else {
      line = '速度和，然后乘法。'
    }
    return `你是小学数学辅导老师。
只输出这一句话，不加任何解释：
${line}${STEP2_NO_NUMBERS_RULE}`
  }

  return ''
}

function step3SystemPrompt(
  fadingStage: FadingStage,
  skillType: SkillType,
  hasTimeGap: boolean,
  studyCondition: StudyCondition,
): string {
  const stage = effectiveFadingStage(fadingStage, studyCondition)

  if (stage === 'full_support') {
    if (skillType === '求时间' && hasTimeGap) {
      return `你是小学数学辅导老师。
学生已经知道公式了，现在引导他们
把题目里的具体数字代入计算。

根据题目内容，分四步告诉学生：
第一步：用[甲的速度]乘[先行时间]，算出甲先行距离
第二步：用[总路程]减甲先行距离，得到剩余距离
第三步：把[甲的速度]和[乙的速度]加起来，得到速度和
第四步：用剩余距离除以速度和，得到相遇时间

把方括号里的内容替换成题目中的实际数字。
可以写出带数字的算式（如 35 × 2 = ？），但不要直接说出最终相遇时间的数值。

不超过4句话，不使用Markdown格式。${STEP3_NUMBERS_RULE}`
    }

    if (skillType === '求时间') {
      return `你是小学数学辅导老师。
学生已经知道公式了，现在引导他们
把题目里的具体数字代入计算。

根据题目内容，告诉学生：
第一步：把[甲的速度]和[乙的速度]加起来，
        算出速度和是多少
第二步：用[总路程]除以速度和，
        算出相遇时间

把方括号里的内容替换成题目中的实际数字。
例如题目是300米、60米/分钟、40米/分钟，
则说：
第一步：60 + 40 = ？，这就是速度和
第二步：300 ÷ 速度和 = ？，这就是相遇时间

不超过3句话，不使用Markdown格式。${STEP3_NUMBERS_RULE}`
    }

    if (hasTimeGap) {
      return `你是小学数学辅导老师。
学生已经知道公式了，现在引导他们
把题目里的具体数字代入计算。

根据题目内容，分三步告诉学生：
第一步：用[甲的速度]乘[甲走的时间]，算出甲走的路程
第二步：用[乙的速度]乘[乙走的时间]，算出乙走的路程
第三步：把甲走的路程和乙走的路程加起来，得到两地距离

把方括号里的内容替换成题目中的实际数字。
可以写出带数字的算式，但不要直接说出最终两地距离的数值。

不超过4句话，不使用Markdown格式。${STEP3_NUMBERS_RULE}`
    }

    return `你是小学数学辅导老师。
学生已经知道公式了，现在引导他们
把题目里的具体数字代入计算。

根据题目内容，告诉学生：
第一步：把[甲的速度]和[乙的速度]加起来，
        算出速度和是多少
第二步：用[速度和]乘以[相遇时间]，
        算出两地距离

把方括号里的内容替换成题目中的实际数字。
例如题目中甲的速度是55米/分钟、乙的速度是45米/分钟、
相遇时间是6分钟，则说：
第一步：55 + 45 = ？，这就是速度和
第二步：速度和 × 6 = ？，这就是两地距离

不超过3句话，不使用Markdown格式。${STEP3_NUMBERS_RULE}`
  }

  if (stage === 'partial') {
    if (skillType === '求时间' && hasTimeGap) {
      return `你是小学数学辅导老师。
引导学生把数字代入，但不直接给出计算结果。

根据题目说：
先算甲先行距离和剩余距离，
再把两个速度加起来得到速度和，
最后用剩余距离除以速度和。

把题目中的实际数字代入每一步。
不超过3句话，不使用Markdown格式。${STEP3_NUMBERS_RULE}`
    }

    if (skillType === '求时间') {
      return `你是小学数学辅导老师。
引导学生把数字代入，但不直接给出计算结果。

根据题目说：
把题目里的两个速度加起来，
得到速度和之后，
再用总路程除以它。

把「两个速度」和「总路程」替换成题目中的实际数字。
不超过2句话，不使用Markdown格式。${STEP3_NUMBERS_RULE}`
    }

    if (hasTimeGap) {
      return `你是小学数学辅导老师。
引导学生把数字代入，但不直接给出计算结果。

根据题目说：
分别用两人的速度乘以各自走的时间，
得到两段路程后相加。

把速度和走的时间替换成题目中的实际数字。
不超过2句话，不使用Markdown格式。${STEP3_NUMBERS_RULE}`
    }

    return `你是小学数学辅导老师。
引导学生把数字代入，但不直接给出计算结果。

根据题目说：
把题目里的两个速度加起来，
得到速度和之后，
再用它乘以相遇时间。

把「两个速度」和「相遇时间」替换成题目中的实际数字。
不超过2句话，不使用Markdown格式。${STEP3_NUMBERS_RULE}`
  }

  if (stage === 'minimal') {
    let line: string
    if (hasTimeGap && skillType === '求时间') {
      line = '先算剩余距离，再除速度和。'
    } else if (hasTimeGap && skillType === '求路程') {
      line = '先算各自路程，再相加。'
    } else if (skillType === '求时间') {
      line = '先加速度，再除总路程。'
    } else {
      line = '先加速度，再乘相遇时间。'
    }
    return `你是小学数学辅导老师。
只输出一句话：
${line}${STEP3_NUMBERS_RULE}`
  }

  return ''
}

function step2UserMessage(
  question: QuestionData,
  stepLabel: string,
  studentBlock: string,
  isCheck: boolean,
): string {
  const lines = [
    `题目类型：${question.skillType}`,
    `有时间差：${question.hasTimeGap ? '是' : '否'}`,
    `题目：${question.content}`,
    '',
    '本步提示只能使用抽象概念词，绝不能出现题目中的具体数字。',
  ]
  if (studentBlock) {
    lines.push('', studentBlock)
  }
  if (isCheck) {
    lines.push(
      '',
      `请只针对「${stepLabel}」这一步，根据学生填空情况给出反馈。反馈时只用概念词，不要复述学生填写的数字。不要用 Markdown 或列表符号，只用普通中文。`,
    )
  } else {
    lines.push(
      '',
      `请只针对「${stepLabel}」这一步给出提示。学生尚未填写公式框。不要用 Markdown 或列表符号，只用普通中文。`,
    )
  }
  return lines.join('\n')
}

function userMessageForStep3(question: QuestionData): string {
  return [
    `题目类型：${question.skillType}`,
    `有时间差：${question.hasTimeGap ? '是' : '否'}`,
    `题目：${question.content}`,
    '',
    '请只针对「草稿计算」这一步给出提示，引导学生把题目中的实际数字代入公式。',
    '可以写出带数字的算式（如 60 + 40 = ？），但不要直接说出最终答案的数值。',
    '不要用 Markdown 或列表符号，只用2-3句普通中文。',
  ].join('\n')
}

async function deepSeekChat(systemPrompt: string, userContent: string, maxTokens = 500): Promise<string> {
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your_api_key_here') {
    return '请先在项目根目录 .env 中配置有效的 VITE_DEEPSEEK_API_KEY 后再使用 AI 提示。'
  }

  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  })

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }

  if (!response.ok) {
    console.error('DeepSeek API error:', data.error?.message ?? response.statusText)
    return '暂时无法获取提示，请稍后再试。'
  }

  const content = data.choices?.[0]?.message?.content
  if (typeof content === 'string' && content.trim()) return content.trim()

  return '暂时无法获取提示，请稍后再试。'
}

function userMessageForStep(
  question: QuestionData,
  stepLabel: string,
  includeStep2Scaffold: boolean,
  studentBlock: string,
): string {
  const lines = [
    `题目：${question.content}`,
    '',
    studentBlock,
    '',
    `请只针对「${stepLabel}」这一步给出反馈，不要跳到最终数值答案（除非仅作鼓励且不要求学生照抄）。不要用 Markdown 或列表符号，只用2-3句普通中文。`,
  ]
  if (includeStep2Scaffold && question.step2Hints.length > 0) {
    lines.push('', '本题的框架填空线索（供把握难度）：')
    question.step2Hints.forEach((h) => lines.push(h))
  }
  return lines.join('\n')
}

/** fading + full_support：题目加载后的 Step1 初始引导（学生尚未填写） */
export async function generateStep1InitialFullSupport(question: QuestionData): Promise<string> {
  const userContent = `学生刚看到这道题，还没有开始填写。
请用2-3句友好的话引导他开始读题，找出题目中的关键数字。
不要直接说出答案。不要用 Markdown，只用普通中文句子。

题目：${question.content}`
  try {
    return await deepSeekChat(INITIAL_TEACHER_SYSTEM, userContent, 220)
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return '暂时无法获取提示，请稍后再试。'
  }
}

/** Step 2 — 题目加载后的初始 AI 提示（学生尚未填写） */
export async function generateStep2InitialHint(
  question: QuestionData,
  fadingStage: FadingStage,
  studyCondition: StudyCondition,
): Promise<string> {
  if (fadingStage === 'none' && studyCondition === 'fading') return ''
  if (studyCondition === 'no_ai') return ''

  const stage = step2EffectiveStage(fadingStage, studyCondition)

  if (stage === 'minimal') {
    return generateStep2Hint(question, 'minimal', [], [], studyCondition)
  }

  const systemPrompt = step2SystemPrompt(
    stage,
    question.skillType,
    question.hasTimeGap,
    '',
    studyCondition,
    false,
  )
  if (!systemPrompt) return ''

  try {
    return await deepSeekChat(
      systemPrompt,
      step2UserMessage(question, '列解题框架', '', false),
      stage === 'full_support' ? 320 : 260,
    )
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return '暂时无法获取提示，请稍后再试。'
  }
}

/** @deprecated Use generateStep2InitialHint */
export async function generateStep2InitialFullSupport(question: QuestionData): Promise<string> {
  return generateStep2InitialHint(question, 'full_support', 'fading')
}

/** fading + full_support：题目加载后的 Step3 初始引导（草稿计算） */
export async function generateStep3InitialFullSupport(question: QuestionData): Promise<string> {
  return generateStep3Hint(question, 'full_support', 'fading')
}

/** Step 3 — 草稿计算：引导运算方法，不给出答案 */
export async function generateStep3Hint(
  question: QuestionData,
  fadingStage: FadingStage,
  studyCondition: StudyCondition,
): Promise<string> {
  if (fadingStage === 'none' && studyCondition === 'fading') return ''

  const stage = effectiveFadingStage(fadingStage, studyCondition)
  const systemPrompt = step3SystemPrompt(stage, question.skillType, question.hasTimeGap, studyCondition)
  if (!systemPrompt) return ''

  try {
    return await deepSeekChat(systemPrompt, userMessageForStep3(question), 400)
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return '暂时无法获取提示，请稍后再试。'
  }
}

/** Step 1 — 读题理解（「检查一下」后，结合填空） */
export async function generateStep1Hint(
  question: QuestionData,
  fadingStage: FadingStage,
  studentInputs: string[],
  inputsCorrect: boolean[],
  studyCondition: StudyCondition,
): Promise<string> {
  if (fadingStage === 'none' && studyCondition === 'fading') return ''

  if (studyCondition === 'fading' && fadingStage === 'minimal') {
    const systemPrompt = step1SystemPrompt('minimal', '', studyCondition)
    if (!systemPrompt) return ''
    try {
      return await deepSeekChat(
        systemPrompt,
        `题目：${question.content}\n\n请给一句与读题理解相关的关键词提示（不要参考学生填空）。`,
        200,
      )
    } catch (error) {
      console.error('DeepSeek API error:', error)
      return '暂时无法获取提示，请稍后再试。'
    }
  }

  const allEmpty = studentInputs.every((s) => !String(s).trim())
  if (allEmpty) {
    return EMPTY_CHECK_HINT
  }

  const studentBlock = buildStudentFeedbackBlock(studentInputs, inputsCorrect)

  const stage = effectiveFadingStage(fadingStage, studyCondition)
  const systemPrompt = step1SystemPrompt(stage, studentBlock, studyCondition)
  if (!systemPrompt) return ''

  try {
    return await deepSeekChat(
      systemPrompt,
      userMessageForStep(question, '读题理解', false, studentBlock),
      500,
    )
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return '暂时无法获取提示，请稍后再试。'
  }
}

/** Step 2 — 列框架（初始加载 +「检查一下」后，结合填空） */
export async function generateStep2Hint(
  question: QuestionData,
  fadingStage: FadingStage,
  studentInputs: string[],
  inputsCorrect: boolean[],
  studyCondition: StudyCondition,
): Promise<string> {
  if (fadingStage === 'none' && studyCondition === 'fading') return ''
  if (studyCondition === 'no_ai') return ''

  const stage = step2EffectiveStage(fadingStage, studyCondition)

  if (stage === 'minimal') {
    const systemPrompt = step2SystemPrompt(
      'minimal',
      question.skillType,
      question.hasTimeGap,
      '',
      studyCondition,
      false,
    )
    if (!systemPrompt) return ''
    try {
      return await deepSeekChat(
        systemPrompt,
        `题目类型：${question.skillType}\n有时间差：${question.hasTimeGap ? '是' : '否'}\n题目：${question.content}\n\n请给一句与列框架相关的关键词提示。不要出现任何具体数字。`,
        120,
      )
    } catch (error) {
      console.error('DeepSeek API error:', error)
      return '暂时无法获取提示，请稍后再试。'
    }
  }

  const allEmpty = studentInputs.every((s) => !String(s).trim())
  if (allEmpty) {
    return EMPTY_CHECK_HINT
  }

  const studentBlock = buildStudentFeedbackBlock(studentInputs, inputsCorrect)
  const systemPrompt = step2SystemPrompt(
    fadingStage,
    question.skillType,
    question.hasTimeGap,
    studentBlock,
    studyCondition,
    true,
  )
  if (!systemPrompt) return ''

  try {
    return await deepSeekChat(
      systemPrompt,
      step2UserMessage(question, '列解题框架', studentBlock, true),
      stage === 'full_support' ? 400 : 300,
    )
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return '暂时无法获取提示，请稍后再试。'
  }
}

/** Tutorial — Step 1 读题理解（固定引导，不调 API） */
export async function generateTutorialStep1Hint(): Promise<string> {
  return '找找题目里有几个数字？哪个是铅笔的数量，哪个是总价格？'
}

/** Tutorial — Step 2 列框架（固定引导，不调 API） */
export async function generateTutorialStep2Hint(): Promise<string> {
  return '先用总价格 ÷ 铅笔数量，算出每支铅笔的价格。再用每支价格 × 要买的数量，就是所求总价。'
}

/** Tutorial — Step 3 草稿计算 */
export async function generateTutorialStep3Hint(): Promise<string> {
  return '用每支铅笔的价格乘以16，在草稿纸上算出总共需要多少钱。'
}
