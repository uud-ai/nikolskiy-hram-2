import { useState } from "react"
import { Newspaper } from "lucide-react"
import { Reveal } from "@/components/ui/reveal"
import { Button } from "@/components/ui/button"
import { allNews, type NewsItem } from "@/lib/news"
import { MONTHS_GENITIVE as months } from "@/lib/utils"

const INITIAL_COUNT = 3

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  return `${d} ${months[m - 1]} ${y}`
}

export function News() {
  const [todayIso] = useState(() => new Date().toLocaleDateString("en-CA"))
  const [expanded, setExpanded] = useState(false)

  // Новости с будущей датой ждут своего дня.
  const published = allNews.filter((n) => n.date <= todayIso)
  const visible = expanded ? published : published.slice(0, INITIAL_COUNT)

  return (
    <section id="news" className="bg-paper-dim py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
            Новости прихода в Усть-Карске
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl text-ink sm:text-4xl">
            Новости
          </h2>
        </Reveal>

        {published.length === 0 ? (
          <Reveal className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-dashed border-line bg-card px-8 py-12 text-center">
            <Newspaper className="size-8 text-gold-dim" />
            <p className="text-ink-soft">Пока новостей нет. Загляните позже.</p>
          </Reveal>
        ) : (
          <div className="mt-10 flex flex-col gap-6">
            {visible.map((item) => (
              <NewsCard key={item.slug} item={item} />
            ))}
            {!expanded && published.length > INITIAL_COUNT && (
              <div className="text-center">
                <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
                  Все новости →
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

function NewsCard({ item }: { item: NewsItem }) {
  const [open, setOpen] = useState(false)
  const long = item.paragraphs.length > 1
  const shown = open || !long ? item.paragraphs : item.paragraphs.slice(0, 1)

  return (
    <Reveal>
      <article id={`news-${item.slug}`} className="overflow-hidden rounded-2xl border border-line bg-card">
        {item.image && (
          <img
            src={item.image}
            alt=""
            loading="lazy"
            className="aspect-[16/9] w-full object-cover"
          />
        )}
        <div className="p-6 sm:p-8">
          <time dateTime={item.date} className="text-xs font-semibold uppercase tracking-wider text-gold-dim">
            {formatDate(item.date)}
          </time>
          <h3 className="mt-2 text-balance font-serif text-2xl text-ink">{item.title}</h3>
          <div className="mt-4 flex flex-col gap-3 text-[15px] leading-relaxed text-ink-soft">
            {shown.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
          {long && (
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="mt-4 text-sm text-gold-dim underline underline-offset-4 transition-colors hover:text-gold"
            >
              {open ? "Свернуть" : "Читать полностью"}
            </button>
          )}
        </div>
      </article>
    </Reveal>
  )
}
