import {
  pickPascha,
  pickNextPascha,
  resolveCyclePosition,
  lukanGospelWeek,
  type PaschaDates,
} from "./liturgical-cycle"
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
  /** Рядовые чтения по датам (период от Пятидесятницы до Триоди), с учётом
   *  Воздвиженской преступки/отступки и суббот/недель пред и по праздникам.
   *  null — в этот день рядового чтения нет (великий праздник). */
  dated: Record<string, ReadingEntry | null | string>
  bible: BibleData
}

export interface ResolvedReading {
  note: string | null
  apostle: { ref: string; zachalo?: number; text: string | null } | null
  gospel: { ref: string; zachalo?: number; text: string | null } | null
}

export async function loadDailyReadingsData(): Promise<DailyReadingsData> {
  const [pascha, ordinary, triodion, dated, bible] = await Promise.all([
    fetch("/reading-data/pascha-dates.json").then((r) => r.json()),
    fetch("/reading-data/ordinary-cycle.json").then((r) => r.json()),
    fetch("/reading-data/triodion-cycle.json").then((r) => r.json()),
    fetch("/reading-data/pentecost-dated.json")
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({})),
    fetch("/reading-data/nt-text.json").then((r) => r.json()),
  ])
  return { pascha, ordinary, triodion, dated, bible }
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
  const key = isoDate(day)
  if (pos.period === "pentecost_period" && key in (data.dated ?? {})) {
    const dated = data.dated[key]
    // null — великий праздник: рядового чтения нет, блок скрывается
    entry = typeof dated === "string" ? null : dated
  } else if (pos.period === "pentecost_period") {
    // Запасной вариант для лет вне pentecost-dated.json: Апостол — по седмице
    // от Пятидесятницы, Евангелие — по «евангельской» седмице (Воздвиженская
    // преступка/отступка).
    const table = data.ordinary.pentecost_period
    const apostleEntry = table?.[pos.week]?.[pos.weekday]
    const gWeek = lukanGospelWeek(day, Number(pos.week), pascha as Date)
    const gospelEntry = table?.[String(gWeek)]?.[pos.weekday]
    entry =
      apostleEntry || gospelEntry
        ? {
            apostle: apostleEntry?.apostle,
            apostle_zachalo: apostleEntry?.apostle_zachalo,
            gospel: gospelEntry?.gospel,
            gospel_zachalo: gospelEntry?.gospel_zachalo,
            note: pos.weekday === "sun" ? `Неделя ${pos.week}-я по Пятидесятнице` : undefined,
          }
        : null
  } else if (pos.period === "holy_week") {
    entry = data.triodion.holy_week?.[pos.weekday]
  } else if (pos.period === "triodion_period") {
    entry = data.triodion.triodion_period?.[pos.week]?.[pos.weekday]
  } else {
    entry = data.ordinary.pascha_period?.[pos.week]?.[pos.weekday]
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

function isoDate(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${dd}`
}
