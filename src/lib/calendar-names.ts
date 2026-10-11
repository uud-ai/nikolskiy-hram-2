import { useEffect, useState } from "react"

// Названия праздников и памяти святых по датам (YYYY-MM-DD → строки).
// Файл public/calendar-names.json раз в сутки дополняет GitHub Actions
// (.github/workflows/update-calendar.yml) примерно на два месяца вперёд.
export type CalendarNames = Record<string, string[]>

let cache: Promise<CalendarNames> | null = null

function loadCalendarNames(): Promise<CalendarNames> {
  if (!cache) {
    cache = fetch("/calendar-names.json")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<CalendarNames>
      })
      .catch((err) => {
        cache = null
        throw err
      })
  }
  return cache
}

// null — ещё загружается или не удалось загрузить.
export function useCalendarNames(): CalendarNames | null {
  const [names, setNames] = useState<CalendarNames | null>(null)
  useEffect(() => {
    let alive = true
    loadCalendarNames()
      .then((data) => alive && setNames(data))
      .catch(() => alive && setNames(null))
    return () => {
      alive = false
    }
  }, [])
  return names
}

// Убираем годы в скобках «(304)», «(ок. 850)», «(I)», сноски «*» и лишние пробелы.
function clean(s: string): string {
  return s
    .replace(/\s*\((?:ок\.\s*)?[0-9IVXLC–\-—,.\s]+(?:г\.\s*до Р\.\s*Х\.)?\)/g, "")
    .replace(/\*/g, "")
    .replace(/\s+([.,;])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim()
}

// Короткое название дня для расписания: в воскресенье — «Неделя N-я по
// Пятидесятнице» и главная память дня, в остальные дни — главная память
// (первая строка календаря: праздник или святые, которым служба).
export function dayTitle(names: string[] | undefined): string {
  if (!names?.length) return ""
  const first = clean(names[0]).replace(/\.\s*Глас \d+-й\.?$/, "")
  if (/^Неделя|^Воскресенье/.test(first) && names[1]) {
    return `${first}. ${clean(names[1])}`
  }
  return first
}
