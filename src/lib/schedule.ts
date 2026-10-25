// Расчёт расписания богослужений по правилам из src/content/schedule-rules.ts.
// Ничего не загружает из сети: даты Пасхи вычисляются по юлианской пасхалии.

import {
  LITURGY,
  PASCHA_NIGHT,
  fixedFeasts,
  movableFeasts,
  scheduleExceptions,
  weeklyServices,
  type ScheduleEvent,
} from "@/content/schedule-rules"
import { MONTHS_GENITIVE } from "@/lib/utils"

export interface ScheduleDay {
  date: string // ГГГГ-ММ-ДД
  label: string // «4 декабря (пт)»
  title: string
  patronal?: boolean
  events: ScheduleEvent[]
}

const WEEKDAYS_SHORT = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"]

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function addDays(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

/** Православная Пасха (по новому стилю) для года: юлианская пасхалия + разница стилей. */
export function orthodoxPascha(year: number): Date {
  const a = year % 4
  const b = year % 7
  const c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31) // по старому стилю
  const day = ((d + e + 114) % 31) + 1
  const styleGap = Math.floor(year / 100) - Math.floor(year / 400) - 2 // 13 дней в 1900–2099 гг.
  return new Date(year, month - 1, day + styleGap)
}

function nightLabel(eve: Date, day: Date) {
  return eve.getMonth() === day.getMonth()
    ? `с ${eve.getDate()} на ${day.getDate()} ${MONTHS_GENITIVE[day.getMonth()]}`
    : `с ${eve.getDate()} ${MONTHS_GENITIVE[eve.getMonth()]} на ${day.getDate()} ${MONTHS_GENITIVE[day.getMonth()]}`
}

function sortEvents(events: ScheduleEvent[]) {
  const seen = new Set<string>()
  return events
    .filter((e) => {
      const key = `${e.time}|${e.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => a.time.localeCompare(b.time))
}

/** Службы на один день по правилам и исключениям; null — служб нет. */
export function scheduleForDate(date: Date): ScheduleDay | null {
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const iso = isoDate(day)
  const pascha = orthodoxPascha(day.getFullYear())

  const titles: string[] = []
  let patronal = false
  let events: ScheduleEvent[] = [...(weeklyServices[day.getDay()] ?? [])]

  const fixed = fixedFeasts[iso.slice(5)]
  if (fixed) {
    titles.push(fixed.title)
    patronal ||= fixed.patronal ?? false
    events.push(LITURGY)
  }
  for (const f of movableFeasts) {
    if (isoDate(addDays(pascha, f.offset)) === iso) {
      titles.push(f.title)
      events.push(LITURGY)
    }
  }

  const eve = addDays(pascha, -1)
  if (iso === isoDate(eve)) {
    titles.push(`Светлое Христово Воскресение. Пасха — богослужение в ночь ${nightLabel(eve, pascha)}`)
    events.push(PASCHA_NIGHT)
  }
  // Пасхальная служба уже совершена ночью — на сам день Пасхи отдельных служб нет.
  if (iso === isoDate(pascha)) events = []

  let title = titles.join(". ")
  const exception = scheduleExceptions[iso]
  if (exception) {
    if (exception.events) events = [...exception.events]
    if (exception.title !== undefined) title = exception.title
  }

  if (events.length === 0) return null
  return {
    date: iso,
    label: `${day.getDate()} ${MONTHS_GENITIVE[day.getMonth()]} (${WEEKDAYS_SHORT[day.getDay()]})`,
    title,
    ...(patronal ? { patronal } : {}),
    events: sortEvents(events),
  }
}

/** Ближайшие дни со службами, начиная с `from` (включительно), на `days` дней вперёд. */
export function upcomingSchedule(from: Date, days = 400): ScheduleDay[] {
  const out: ScheduleDay[] = []
  for (let i = 0; i < days; i++) {
    const s = scheduleForDate(addDays(from, i))
    if (s) out.push(s)
  }
  return out
}
