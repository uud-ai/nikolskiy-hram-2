import { pickPascha, pickNextPascha, resolveCyclePosition, type PaschaDates } from "./liturgical-cycle"
import { getText, type BibleData } from "./bible-text"

export interface ReadingEntry {
  apostle?: string
  apostle_zachalo?: number
  gospel?: string
  gospel_zachalo?: number
  note?: string
}

type CycleTable = Record<string, Record<string, ReadingEntry>>

export interface DailyReadingsData {
  pascha: PaschaDates
  ordinary: { pascha_period: CycleTable; pentecost_period: CycleTable }
  triodion: { triodion_period: CycleTable; holy_week: Record<string, ReadingEntry> }
  bible: BibleData
}

export interface ResolvedReading {
  note: string | null
  apostle: { ref: string; zachalo?: number; text: string | null } | null
  gospel: { ref: string; zachalo?: number; text: string | null } | null
}

export async function loadDailyReadingsData(): Promise<DailyReadingsData> {
  const [pascha, ordinary, triodion, bible] = await Promise.all([
    fetch("/reading-data/pascha-dates.json").then((r) => r.json()),
    fetch("/reading-data/ordinary-cycle.json").then((r) => r.json()),
    fetch("/reading-data/triodion-cycle.json").then((r) => r.json()),
    fetch("/reading-data/nt-text.json").then((r) => r.json()),
  ])
  return { pascha, ordinary, triodion, bible }
}

export function resolveReadingsForDate(
  data: DailyReadingsData,
  targetDate: Date
): ResolvedReading | null {
  const day = new Date(targetDate)
  day.setHours(0, 0, 0, 0)

  const pascha = pickPascha(day, data.pascha)
  const nextPascha = pickNextPascha(day, data.pascha)
  if (!pascha && !nextPascha) return null

  const pos = resolveCyclePosition(day, pascha, nextPascha)
  if (pos.period === "unresolved") return null

  let entry: ReadingEntry | null | undefined
  if (pos.period === "holy_week") {
    entry = data.triodion.holy_week?.[pos.weekday]
  } else if (pos.period === "triodion_period") {
    entry = data.triodion.triodion_period?.[pos.week]?.[pos.weekday]
  } else {
    entry = data.ordinary[pos.period]?.[pos.week]?.[pos.weekday]
  }

  if (!entry) return null

  const apostle = entry.apostle
    ? { ref: entry.apostle, zachalo: entry.apostle_zachalo, text: getText(data.bible, entry.apostle) }
    : null
  const gospel = entry.gospel
    ? { ref: entry.gospel, zachalo: entry.gospel_zachalo, text: getText(data.bible, entry.gospel) }
    : null

  if (!apostle && !gospel) return null

  return { note: entry.note ?? null, apostle, gospel }
}
