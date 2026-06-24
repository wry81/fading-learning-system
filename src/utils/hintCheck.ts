/** Flatten per-line slot values in reading order (same as expectedStep*Values). */
export function flattenHintSlots(rows: string[][]): string[] {
  return rows.flatMap((row) => [...row])
}

function parseNumLoose(s: string): number | null {
  const t = s.trim().replace(/\s/g, '').replace(',', '.')
  if (!t) return null
  const frac = /^(-?\d+)\/(-?\d+)$/.exec(t)
  if (frac) {
    const a = Number(frac[1])
    const b = Number(frac[2])
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null
    return a / b
  }
  const x = Number(t)
  return Number.isFinite(x) ? x : null
}

/** Compare student answer to expected; empty student string → not correct. */
export function valueMatches(student: string, expected: string): boolean {
  const se = student.trim()
  const ee = expected.trim()
  if (!se) return false
  const ns = parseNumLoose(se)
  const ne = parseNumLoose(ee)
  if (ns != null && ne != null) {
    const scale = Math.max(Math.abs(ne), 1)
    const tol = Math.max(1e-6, 1e-4 * scale, Math.abs(ne - Math.round(ne)) < 1e-9 ? 0 : 0.005 * scale)
    return Math.abs(ns - ne) <= tol
  }
  return se.replace(/\s/g, '') === ee.replace(/\s/g, '')
}

/** One boolean per expected slot (aligned by index). */
export function checkHintInputs(studentFlat: string[], expected: string[]): boolean[] {
  return expected.map((exp, i) => valueMatches(studentFlat[i] ?? '', exp))
}

export function alignStudentToExpected(studentFlat: string[], expectedLen: number): string[] {
  const out = studentFlat.slice(0, expectedLen)
  while (out.length < expectedLen) out.push('')
  return out
}
