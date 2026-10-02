// Портировано из cycle.js оригинального проекта: определение положения даты
// в подвижном годовом круге чтений. Дата Пасхи берётся из pascha-dates.json,
// дальше только арифметика дат: Пятидесятница = Пасха + 49 дней, Неделя N по
// Пятидесятнице = Пятидесятница + 7N дней. Постная Триодь считается назад от
// ближайшей будущей Пасхи: 70 дней до неё — Неделя о мытаре и фарисее,
// последние 6 — Страстная седмица (holy_week).

export type PaschaDates = Record<string, { date: string; source?: string }>

export type CyclePosition =
  | { period: "holy_week"; weekday: string }
  | { period: "triodion_period"; week: string; weekday: string }
  | { period: "pascha_period"; week: string; weekday: string }
  | { period: "pentecost_period"; week: string; weekday: string }
  | { period: "unresolved" }

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
const WEEKDAY_KEYS_REV = ["sun", "sat", "fri", "thu", "wed", "tue", "mon"]
const HOLY_WEEK_KEYS = ["sat", "fri", "thu", "wed", "tue", "mon"]

function addDays(date: Date, n: number) {
  const d = new Date(date.getTime())
  d.setDate(d.getDate() + n)
  return d
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function paschaCandidates(paschaDates: PaschaDates) {
  return Object.keys(paschaDates)
    .filter((key) => key.charAt(0) !== "_")
    .map((key) => new Date(paschaDates[key].date + "T00:00:00"))
    .sort((a, b) => a.getTime() - b.getTime())
}

export function pickPascha(day: Date, paschaDates: PaschaDates): Date | null {
  const candidates = paschaCandidates(paschaDates)
  let chosen: Date | null = null
  for (const c of candidates) {
    if (c <= day) chosen = c
    else break
  }
  return chosen
}

export function pickNextPascha(day: Date, paschaDates: PaschaDates): Date | null {
  const candidates = paschaCandidates(paschaDates)
  for (const c of candidates) {
    if (c >= day) return c
  }
  return null
}

function resolveTriodionPosition(day: Date, nextPascha: Date): CyclePosition | null {
  const bp = daysBetween(day, nextPascha)
  if (bp < 1 || bp > 70) return null
  if (bp <= 6) {
    return { period: "holy_week", weekday: HOLY_WEEK_KEYS[bp - 1] }
  }
  const week = Math.floor(bp / 7)
  const weekday = WEEKDAY_KEYS_REV[bp % 7]
  return { period: "triodion_period", week: String(week), weekday }
}

export function resolveCyclePosition(
  day: Date,
  pascha: Date | null,
  nextPascha: Date | null
): CyclePosition {
  if (nextPascha) {
    const triodionPos = resolveTriodionPosition(day, nextPascha)
    if (triodionPos) return triodionPos
  }
  if (!pascha) return { period: "unresolved" }

  const pentecost = addDays(pascha, 49)

  if (day < pascha) return { period: "unresolved" }

  if (day >= pascha && day < pentecost) {
    const daysSincePascha = daysBetween(pascha, day)
    if (daysSincePascha === 0) {
      return { period: "pascha_period", week: "pascha", weekday: "sun" }
    }
    const week = Math.floor((daysSincePascha - 1) / 7) + 2
    const weekday = WEEKDAY_KEYS[(daysSincePascha - 1) % 7]
    return { period: "pascha_period", week: String(week), weekday }
  }

  if (daysBetween(pentecost, day) === 0) {
    return { period: "pascha_period", week: "pentecost", weekday: "sun" }
  }

  if (day > pentecost) {
    const daysSincePentecost = daysBetween(pentecost, day)
    const week = Math.floor((daysSincePentecost - 1) / 7) + 1
    const weekday = WEEKDAY_KEYS[(daysSincePentecost - 1) % 7]
    return { period: "pentecost_period", week: String(week), weekday }
  }

  return { period: "unresolved" }
}
