import { useEffect, useState } from "react"
import { Reveal } from "@/components/ui/reveal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  loadDailyReadingsData,
  loadReadingTexts,
  resolveReadingsForDate,
  type Passage,
  type ResolvedReading,
} from "@/lib/readings"
import { MONTHS_GENITIVE as months } from "@/lib/utils"

export function DailyReadings() {
  // Дата фиксируется при первом показе, чтобы не меняться между перерисовками.
  const [today] = useState(() => new Date())
  const [reading, setReading] = useState<ResolvedReading | null>(null)
  const [status, setStatus] = useState<"loading" | "ready" | "hidden">("loading")

  useEffect(() => {
    let cancelled = false
    loadDailyReadingsData(today)
      .then((data) => {
        if (cancelled) return
        const result = resolveReadingsForDate(data, today)
        if (!result) {
          setStatus("hidden")
          return
        }
        // Ссылки на чтения показываем сразу, тексты подгружаем следом.
        setReading(result)
        setStatus("ready")
        return loadReadingTexts(result).then((full) => {
          if (!cancelled) setReading(full)
        })
      })
      .catch(() => {
        if (!cancelled) setStatus((s) => (s === "ready" ? s : "hidden"))
      })
    return () => {
      cancelled = true
    }
  }, [today])

  if (status === "hidden") return null

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
            {(reading.apostle || reading.gospel) && (
              <Accordion type="single" collapsible>
                {reading.apostle && <ReadingItem value="apostle" label="Апостол" passage={reading.apostle} />}
                {reading.gospel && <ReadingItem value="gospel" label="Евангелие" passage={reading.gospel} />}
              </Accordion>
            )}

            {reading.feast && (
              <>
                {/* В великие праздники рядового чтения нет — тогда чтение праздника идёт первым. */}
                <p
                  className={`px-5 text-center text-sm italic text-gold-dim ${
                    reading.apostle || reading.gospel || reading.note ? "pt-6" : "pt-4"
                  }`}
                >
                  {reading.feast.title}
                </p>
                <Accordion type="single" collapsible>
                  {reading.feast.apostle && (
                    <ReadingItem value="feast-apostle" label="Апостол" passage={reading.feast.apostle} />
                  )}
                  {reading.feast.gospel && (
                    <ReadingItem value="feast-gospel" label="Евангелие" passage={reading.feast.gospel} />
                  )}
                </Accordion>
              </>
            )}
          </Reveal>
        )}
      </div>
    </section>
  )
}

function ReadingItem({ value, label, passage }: { value: string; label: string; passage: Passage }) {
  return (
    <AccordionItem value={value}>
      <AccordionTrigger className="px-4">
        <span className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <strong>{label}</strong>
          <span className="font-sans text-sm font-normal text-ink-faint">
            {passage.ref}
            {passage.zachalo ? ` (зач. ${passage.zachalo})` : ""}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent className="px-4 text-[15px] leading-relaxed">
        {passage.text === undefined ? (
          <span className="text-ink-faint">Загрузка текста…</span>
        ) : passage.text === null ? (
          <span className="text-ink-faint">Текст отрывка недоступен.</span>
        ) : (
          passage.text
        )}
      </AccordionContent>
    </AccordionItem>
  )
}
