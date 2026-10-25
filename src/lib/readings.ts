import {
  pickPascha,
  pickNextPascha,
  resolveCyclePosition,
  lukanGospelWeek,
  type PaschaDates,
} from "./liturgical-cycle"
import { bookIdForRef, getText, type BibleData } from "./bible-text"

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
   *  null — в этот день рядового чтения нет (великий праздник).
   *  Хранятся по годам: reading-data/pentecost-dated/<год>.json. */
  dated: Record<string, ReadingEntry | null | string>
  /** Чтения праздникам и святым с непереходящими датами, ключ — "ММ-ДД"
   *  (feasts.json). omit_ordinary_weekdays — рядовое чтение в этот праздник
   *  с понедельника по субботу не читается (нужно для дней вне
   *  pentecost-dated, например Сретения в подготовительные седмицы Триоди). */
  feasts: Record<string, (ReadingEntry & { title: string; omit_ordinary_weekdays?: boolean }) | string>
}

export interface Passage {
  ref: string
  zachalo?: number
  /** undefined — текст ещё не загружен; null — текста нет. */
  text?: string | null
}

export interface ResolvedReading {
  note: string | null
  apostle: Passage | null
  gospel: Passage | null
  /** Чтение святому дня (например, святителю Николаю), если есть. */
  feast: { title: string; apostle: Passage | null; gospel: Passage | null } | null
}

async function getJson<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`)
  return r.json() as Promise<T>
}

async function getJsonOptional<T>(url: string, fallback: T): Promise<T> {
  try {
    return await getJson<T>(url)
  } catch {
    return fallback
  }
}

/** Загружает таблицы чтений; рядовые чтения по датам — только за год даты `forDate`. */
export async function loadDailyReadingsData(forDate: Date): Promise<DailyReadingsData> {
  const [pascha, ordinary, triodion, dated, feasts] = await Promise.all([
    getJson<DailyReadingsData["pascha"]>("/reading-data/pascha-dates.json"),
    getJson<DailyReadingsData["ordinary"]>("/reading-data/ordinary-cycle.json"),
    getJson<DailyReadingsData["triodion"]>("/reading-data/triodion-cycle.json"),
    getJsonOptional<DailyReadingsData["dated"]>(`/reading-data/pentecost-dated/${forDate.getFullYear()}.json`, {}),
    getJsonOptional<DailyReadingsData["feasts"]>("/reading-data/feasts.json", {}),
  ])
  return { pascha, ordinary, triodion, dated, feasts }
}

function passage(ref: string | undefined, zachalo: number | undefined): Passage | null {
  return ref ? { ref, zachalo } : null
}

/**
 * Загружает текст Писания только для тех книг, которые нужны в этот день
 * (обычно 2–3 файла по 15–50 КБ вместо всего Нового Завета), и возвращает
 * копию чтения с заполненными текстами.
 */
export async function loadReadingTexts(reading: ResolvedReading): Promise<ResolvedReading> {
  const passages = [reading.apostle, reading.gospel, reading.feast?.apostle, reading.feast?.gospel]
  const books = new Set<string>()
  for (const p of passages) {
    const id = p ? bookIdForRef(p.ref) : null
    if (id) books.add(id)
  }
  const bible: BibleData = {}
  await Promise.all(
    [...books].map(async (id) => {
      bible[id] = await getJsonOptional<BibleData[string]>(`/reading-data/nt/${id}.json`, {})
    })
  )
  const withText = (p: Passage | null): Passage | null => (p ? { ...p, text: getText(bible, p.ref) } : null)
  return {
    ...reading,
    apostle: withText(reading.apostle),
    gospel: withText(reading.gospel),
    feast: reading.feast
      ? { ...reading.feast, apostle: withText(reading.feast.apostle), gospel: withText(reading.feast.gospel) }
      : null,
  }
}

export function resolveReadingsForDate(
  data: DailyReadingsData,
  targetDate: Date
): ResolvedReading | null {
  const day = new Date(targetDate)
  day.setHours(0, 0, 0, 0)

  const key = isoDate(day)
  const feastEntry = data.feasts?.[key.slice(5)]
  const feast =
    feastEntry && typeof feastEntry !== "string"
      ? {
          title: feastEntry.title,
          apostle: passage(feastEntry.apostle, feastEntry.apostle_zachalo),
          gospel: passage(feastEntry.gospel, feastEntry.gospel_zachalo),
        }
      : null

  const omitOrdinary =
    feastEntry && typeof feastEntry !== "string" && feastEntry.omit_ordinary_weekdays && day.getDay() !== 0
  const entry = omitOrdinary ? null : resolveOrdinaryEntry(data, day, key)
  const apostle = passage(entry?.apostle, entry?.apostle_zachalo)
  const gospel = passage(entry?.gospel, entry?.gospel_zachalo)

  if (!apostle && !gospel && !feast) return null

  return { note: entry?.note ?? null, apostle, gospel, feast }
}

function resolveOrdinaryEntry(
  data: DailyReadingsData,
  day: Date,
  key: string
): ReadingEntry | null | undefined {
  const pascha = pickPascha(day, data.pascha)
  const nextPascha = pickNextPascha(day, data.pascha)
  if (!pascha && !nextPascha) return null

  const pos = resolveCyclePosition(day, pascha, nextPascha)
  if (pos.period === "unresolved") return null

  let entry: ReadingEntry | null | undefined
  if (pos.period === "pentecost_period" && key in (data.dated ?? {})) {
    const dated = data.dated[key]
    // null — великий праздник: рядового чтения нет, блок скрывается
    entry = typeof dated === "string" ? null : dated
  } else if (pos.period === "pentecost_period") {
    // Запасной вариант для лет вне pentecost-dated/<год>.json: Апостол — по седмице
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

  return entry
}

function isoDate(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${dd}`
}
