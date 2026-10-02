import { useEffect, useState } from "react"
import { Reveal } from "@/components/ui/reveal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { loadDailyReadingsData, resolveReadingsForDate, type ResolvedReading } from "@/lib/readings"

const months = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
]

export function DailyReadings() {
  const [reading, setReading] = useState<ResolvedReading | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "hidden">("loading")

  useEffect(() => {
    let cancelled = false
    loadDailyReadingsData()
      .then((data) => {
        if (cancelled) return
        const result = resolveReadingsForDate(data, new Date())
        if (!result) {
          setStatus("hidden")
          return
        }
        setReading(result)
        setStatus("ready")
      })
      .catch(() => {
        if (!cancelled) setStatus("hidden")
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (status === "hidden") return null

  const today = new Date()
  const dateLabel = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`

  return (
    <section className="pt-24 pb-12 sm:pt-32 sm:pb-16">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
            Чтения дня
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl text-ink sm:text-4xl">
            {dateLabel}
          </h2>
        </Reveal>

        {status === "loading" && (
          <p className="mt-10 text-center text-sm text-ink-faint">Загрузка чтений…</p>
        )}

        {status === "ready" && reading && (
          <Reveal delay={0.1} className="mt-10 rounded-2xl border border-line bg-card p-2 sm:p-4">
            {reading.note && (
              <p className="px-5 pt-4 text-center text-sm italic text-gold-dim">{reading.note}</p>
            )}
            <Accordion type="single" collapsible>
              {reading.apostle && (
                <AccordionItem value="apostle">
                  <AccordionTrigger className="px-4">
                    <span className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                      <strong>Апостол</strong>
                      <span className="font-sans text-sm font-normal text-ink-faint">
                        {reading.apostle.ref}
                        {reading.apostle.zachalo ? ` (зач. ${reading.apostle.zachalo})` : ""}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 text-[15px] leading-relaxed">
                    {reading.apostle.text}
                  </AccordionContent>
                </AccordionItem>
              )}
              {reading.gospel && (
                <AccordionItem value="gospel">
                  <AccordionTrigger className="px-4">
                    <span className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                      <strong>Евангелие</strong>
                      <span className="font-sans text-sm font-normal text-ink-faint">
                        {reading.gospel.ref}
                        {reading.gospel.zachalo ? ` (зач. ${reading.gospel.zachalo})` : ""}
                      </span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 text-[15px] leading-relaxed">
                    {reading.gospel.text}
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </Reveal>
        )}
      </div>
    </section>
  )
}
