import type { QuestionData } from '../data/questions'
import type { FadingStage, StudyCondition } from '../types'

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1'
const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY as string | undefined

export const EMPTY_CHECK_HINT = '先试着从题目里找找两个数量、倍数和已知的总数或差吧～'

const FORMAT_RULES = '不使用 Markdown 或列表符号，只用2–3句简短、口语化的中文；不直接说出最终答案。'

function effectiveStage(stage: FadingStage, condition: StudyCondition): FadingStage {
  if (condition !== 'fixed') return stage
  return 'full_support'
}

function problemFacts(question: QuestionData): string {
  const relation = question.subtype === 'sum' ? '总数' : '差'
  return `较小量：${question.baseLabel}；较大量：${question.largerLabel}；倍数：${question.factor}；已知${relation}：${question.knownAmount}。`
}

function supportInstruction(stage: FadingStage, question: QuestionData, step: 1 | 2 | 3): string {
  if (stage === 'none') return ''
  if (stage === 'minimal') {
    if (step === 1) return '只给方向性提示：先找出题目中的倍数关系和已知数量。不得提到“份”、运算方法或答案。'
    if (step === 2) return '只给方向性提示：试着用“1份”和“几份”表示关系。'
    return '只给方向性提示：先求1份，再求几份。'
  }
  if (stage === 'partial') {
    if (step === 1) return '不用具体数字，引导学生辨认谁的数量更多、是多少倍，以及题目给出的总数或差。不得提到“份”、运算方法或答案。'
    if (step === 2) return `不用具体数字，引导学生把较小量看作1份、较大量看作几份，再求${question.subtype === 'sum' ? '总份数' : '相差份数'}。`
    return `不代入具体数字，引导学生用已知的${question.subtype === 'sum' ? '总数除以总份数' : '差除以相差份数'}求1份，再用1份乘倍数。`
  }

  if (step === 1) return `使用题目中的具体名称和数字，明确指出谁的数量更多、倍数，以及已知的${question.subtype === 'sum' ? '总数' : '差'}。不得提到“份”、运算方法或答案。`
  if (step === 2) return `说明${question.baseLabel}可以看作1份，${question.largerLabel}是${question.factor}份，然后询问学生两个数量${question.subtype === 'sum' ? '合起来一共有多少份' : '相差多少份'}。不得说出份数结果，不得给出加减算式。`
  const parts = question.subtype === 'sum' ? 1 + question.factor : question.factor - 1
  return `用具体数字引导计算：${question.knownAmount} ÷ ${parts} = ？求1份，再用1份 × ${question.factor} = ？求${question.largerLabel}。`
}

async function deepSeekChat(systemPrompt: string, userContent: string, maxTokens = 350): Promise<string> {
  if (!DEEPSEEK_API_KEY || DEEPSEEK_API_KEY === 'your_api_key_here') {
    return '请先在项目根目录 .env 中配置有效的 VITE_DEEPSEEK_API_KEY 后再使用 AI 提示。'
  }
  const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
    body: JSON.stringify({
      model: 'deepseek-chat', max_tokens: maxTokens,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
    }),
  })
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
  if (!response.ok) {
    console.error('DeepSeek API error:', data.error?.message ?? response.statusText)
    return '暂时无法获取提示，请稍后再试。'
  }
  return data.choices?.[0]?.message?.content?.trim() || '暂时无法获取提示，请稍后再试。'
}

async function generate(
  question: QuestionData,
  stage: FadingStage,
  condition: StudyCondition,
  step: 1 | 2 | 3,
  feedback = '',
): Promise<string> {
  if (condition === 'no_ai' || (condition === 'fading' && stage === 'none')) return ''
  const resolved = effectiveStage(stage, condition)
  const instruction = supportInstruction(resolved, question, step)
  if (!instruction) return ''
  const system = `你是小学数学辅导老师，正在辅导“倍数关系与份数表示”问题。${instruction}${FORMAT_RULES}`
  const user = `题目：${question.content}\n题目信息：${problemFacts(question)}${feedback ? `\n学生填写：${feedback}` : ''}\n只针对当前步骤给提示。`
  try {
    return await deepSeekChat(system, user, resolved === 'minimal' ? 120 : 350)
  } catch (error) {
    console.error('DeepSeek API error:', error)
    return '暂时无法获取提示，请稍后再试。'
  }
}

export function generateStep1InitialFullSupport(question: QuestionData): Promise<string> {
  return Promise.resolve(
    `题目告诉我们${question.largerLabel}的数量是${question.baseLabel}的${question.factor}倍，所以${question.largerLabel}的数量更多。题目给出的${question.subtype === 'sum' ? '总数' : '差'}是${question.knownAmount}${question.answerUnits[0] ?? ''}。`,
  )
}

export function generateStep2InitialHint(question: QuestionData, stage: FadingStage, condition: StudyCondition): Promise<string> {
  if (condition === 'no_ai' || (condition === 'fading' && stage === 'none')) return Promise.resolve('')
  const resolved = effectiveStage(stage, condition)
  if (resolved === 'minimal') return Promise.resolve('试着用“份”表示两个数量之间的关系。')
  if (resolved === 'partial') return Promise.resolve('把较小的数量看作1份，再根据倍数关系表示另一个数量。')
  const partCalculation = question.subtype === 'sum'
    ? `1 + ${question.factor} = ${question.factor + 1}`
    : `${question.factor} - 1 = ${question.factor - 1}`
  return Promise.resolve(
    `${question.baseLabel}可以看作1份，${question.largerLabel}是${question.factor}份。${question.subtype === 'sum' ? '两个数量合起来' : `${question.largerLabel}比${question.baseLabel}多出的部分`}对应 ${partCalculation} 份，也就是${question.subtype === 'sum' ? question.factor + 1 : question.factor - 1}份。`,
  )
}

export function generateStep2InitialFullSupport(question: QuestionData): Promise<string> {
  return generateStep2InitialHint(question, 'full_support', 'fading')
}

export function generateStep3InitialFullSupport(question: QuestionData): Promise<string> {
  return generate(question, 'full_support', 'fading', 3)
}

export function generateStep3Hint(question: QuestionData, stage: FadingStage, condition: StudyCondition): Promise<string> {
  return generate(question, stage, condition, 3)
}

export function generateStep1Hint(
  question: QuestionData, stage: FadingStage, studentInputs: string[], inputsCorrect: boolean[], condition: StudyCondition,
): Promise<string> {
  if (condition === 'no_ai' || (condition === 'fading' && stage === 'none')) return Promise.resolve('')
  const resolved = effectiveStage(stage, condition)
  const checked = studentInputs.some((value) => value.trim())
  const allCorrect = checked && inputsCorrect.every(Boolean)
  if (allCorrect) return Promise.resolve('你已经找对了数量更多的一方、倍数和题目给出的已知数量！')
  if (resolved === 'minimal') return Promise.resolve('先找出题目中的倍数关系和已知数量。')
  if (resolved === 'partial') return Promise.resolve('先找一找谁的数量更多、是多少倍，以及题目给出的总数或差。')
  return generateStep1InitialFullSupport(question)
}

export function generateStep2Hint(
  question: QuestionData, stage: FadingStage, studentInputs: string[], inputsCorrect: boolean[], condition: StudyCondition,
): Promise<string> {
  const checked = studentInputs.some((value) => value.trim())
  if (checked && inputsCorrect.every(Boolean)) {
    return Promise.resolve('你已经正确建立了两个数量的份数关系！')
  }
  return generateStep2InitialHint(question, stage, condition)
}

export async function generateTutorialStep1Hint(): Promise<string> {
  return '找找题目里有几个数字？哪个是铅笔的数量，哪个是总价格？'
}
export async function generateTutorialStep2Hint(): Promise<string> {
  return '先用总价格 ÷ 铅笔数量，再用每支价格 × 要买的数量。'
}
export async function generateTutorialStep3Hint(): Promise<string> {
  return '用每支铅笔的价格乘16，在草稿纸上算出总价。'
}
