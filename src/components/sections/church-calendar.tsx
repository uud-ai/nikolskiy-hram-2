import { useEffect, useState } from "react"
import { Reveal } from "@/components/ui/reveal"

const months = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
]
const weekdays = [
  "воскресенье", "понедельник", "вторник", "среда",
  "четверг", "пятница", "суббота",
]

export function ChurchCalendar() {
  const [feasts, setFeasts] = useState<string[] | null>(null)
  const [failed, setFailed] = useState(false)

  const now = new Date()
  const dayNew = now.getDate()
  const monthNew = months[now.getMonth()]

  const oldDate = new Date(now)
  oldDate.setDate(oldDate.getDate() - 13)
  const dayOld = oldDate.getDate()
  const monthOld = months[oldDate.getMonth()]

  useEffect(() => {
    const pad = (n: number) => String(n).padStart(2, "0")
    const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

    fetch("/calendar-names.json")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json()
      })
      .then((data: Record<string, string[]>) => {
        const names = data[todayKey]
        setFeasts(Array.isArray(names) && names.length ? names : [])
      })
      .catch(() => setFailed(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Reveal className="flex h-full flex-col rounded-2xl border border-line bg-card p-7">
      <h3 className="font-serif text-2xl text-ink">Церковный календарь</h3>

      <div className="mt-6 flex items-stretch gap-4 text-center">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Новый стиль
          </div>
          <div className="mt-1 font-serif text-xl text-ink">
            {dayNew} {monthNew}
          </div>
        </div>
        <div className="w-px bg-line" />
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Старый стиль
          </div>
          <div className="mt-1 font-serif text-xl text-ink">
            {dayOld} {monthOld}
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-sm capitalize text-gold-dim">
        {weekdays[now.getDay()]}
      </div>

      <div className="mt-5 flex flex-col gap-2 border-t border-line pt-5 text-sm leading-relaxed text-ink-soft">
        {failed && <p className="text-ink-faint">Не удалось загрузить календарь.</p>}
        {!failed && feasts === null && <p className="text-ink-faint">Загрузка…</p>}
        {!failed && feasts !== null && feasts.length === 0 && (
          <p className="text-ink-faint">Праздники и память святых дня — в полном календаре.</p>
        )}
        {feasts?.map((f) => <p key={f}>{f}</p>)}
      </div>
    </Reveal>
  )
}
