import { useRef, useState } from "react"
import { Clock } from "lucide-react"
import { Reveal } from "@/components/ui/reveal"
import { Button } from "@/components/ui/button"
import { ChurchCalendar } from "@/components/sections/church-calendar"
import { siteMeta } from "@/content/site"
import { upcomingSchedule } from "@/lib/schedule"
import { telHref } from "@/lib/utils"
import { dayTitle, useCalendarNames } from "@/lib/calendar-names"

const INITIAL_COUNT = 2
const STEP = 2 // сколько служб добавляет «Показать ещё»

export function Schedule() {
  const [count, setCount] = useState(INITIAL_COUNT)
  const blockRef = useRef<HTMLHeadingElement>(null)
  const calendarNames = useCalendarNames()

  // Расписание рассчитывается по правилам (src/content/schedule-rules.ts) от
  // сегодняшней местной даты посетителя на год с небольшим вперёд.
  const [upcoming] = useState(() => upcomingSchedule(new Date()))

  const visible = upcoming.slice(0, count)

  const collapse = () => {
    setCount(INITIAL_COUNT)
    blockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <section id="schedule" className="pt-12 pb-24 sm:pt-16 sm:pb-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
            Расписание
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl text-ink sm:text-4xl">
            Богослужения в Усть-Карске
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <ChurchCalendar />

          <Reveal delay={0.1} className="flex h-full flex-col rounded-2xl border border-line bg-card p-7">
            <h3 ref={blockRef} className="scroll-mt-28 font-serif text-2xl text-ink">Ближайшие богослужения</h3>

            {visible.length === 0 ? (
              <p className="mt-6 text-sm text-ink-faint">Ближайшие службы уточняются.</p>
            ) : (
              <ul className="mt-6 flex flex-col gap-5">
                {visible.map((day) => {
                  const patronal = day.patronal ?? false
                  return (
                    <li
                      key={day.date}
                      className={
                        patronal
                          ? "rounded-lg border border-gold/40 bg-gold/10 p-4"
                          : "border-b border-line pb-5 last:border-b-0 last:pb-0"
                      }
                    >
                      <div className="flex items-center gap-2 text-gold-dim">
                        <Clock className="size-4" />
                        <span className="font-serif text-lg text-ink">
                          {day.label}
                          {day.title ? `. ${day.title}` : ""}
                        </span>
                      </div>
                      {(() => {
                        const feast = dayTitle(calendarNames ? calendarNames[day.date] : undefined)
                        return feast ? (
                          <p className="mt-1 line-clamp-2 text-sm leading-snug text-gold-dim" title={feast}>
                            {feast}
                          </p>
                        ) : null
                      })()}
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {day.events.map((ev) => (
                          <li key={ev.time} className="text-[15px] leading-relaxed text-ink-soft">
                            <strong className="text-ink">{ev.time}</strong> — {ev.name}
                          </li>
                        ))}
                      </ul>
                      <a
                        href={`/kliros/index.html?date=${day.date}`}
                        className="mt-2 inline-block text-sm text-gold-dim underline underline-offset-4 transition-colors hover:text-gold"
                      >
                        Текст службы →
                      </a>
                    </li>
                  )
                })}
              </ul>
            )}

            {(count < upcoming.length || count > INITIAL_COUNT) && (
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {count < upcoming.length && (
                  <Button variant="outline" size="sm" onClick={() => setCount((c) => c + STEP)}>
                    Показать ещё →
                  </Button>
                )}
                {count > INITIAL_COUNT && (
                  <Button variant="outline" size="sm" onClick={collapse}>
                    Свернуть ↑
                  </Button>
                )}
              </div>
            )}

            <p className="mt-6 text-center text-sm text-ink-faint">
              Расписание уточняйте по тел.{" "}
              <a
                href={telHref(siteMeta.phone)}
                className="text-gold-dim underline underline-offset-4"
              >
                {siteMeta.phone}
              </a>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
