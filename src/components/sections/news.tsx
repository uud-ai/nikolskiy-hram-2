import { useEffect, useState } from "react"
import { Newspaper } from "lucide-react"
import { Reveal } from "@/components/ui/reveal"
import { Button } from "@/components/ui/button"
import { MONTHS_GENITIVE } from "@/lib/utils"

// Новости хранятся в public/news.json и подгружаются при открытии страницы.
// Файл можно править вручную или автоматически (сценарий n8n добавляет
// туда запись через GitHub API). Формат:
// { "items": [ { "id", "title", "date": "YYYY-MM-DD", "text",
//                "image"?, "sourceTitle"?, "sourceUrl"? } ] }
export interface NewsItem {
  id?: string
  title: string
  date: string
  text: string
  image?: string
  sourceTitle?: string
  sourceUrl?: string
}

const INITIAL_COUNT = 3

function formatDate(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!m) return date
  const month = MONTHS_GENITIVE[Number(m[2]) - 1]
  return month ? `${Number(m[3])} ${month} ${m[1]} г.` : date
}

// Ссылка на источник показывается, только если это обычный http(s)-адрес.
function safeUrl(url?: string) {
  return url && /^https?:\/\//i.test(url) ? url : undefined
}

function isNewsItem(x: unknown): x is NewsItem {
  if (!x || typeof x !== "object") return false
  const o = x as Record<string, unknown>
  return typeof o.title === "string" && typeof o.date === "string" && typeof o.text === "string"
}

export function News() {
  const [items, setItems] = useState<NewsItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    fetch("/news.json", { cache: "no-cache" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json()
      })
      .then((data: { items?: unknown }) => {
        const list = Array.isArray(data?.items) ? data.items.filter(isNewsItem) : []
        list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        setItems(list)
      })
      .catch(() => setFailed(true))
  }, [])

  const visible = items ? (showAll ? items : items.slice(0, INITIAL_COUNT)) : []

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

        {items && items.length > 0 ? (
          <div className="mt-12 flex flex-col gap-6">
            {visible.map((item, i) => {
              const source = safeUrl(item.sourceUrl)
              return (
                <Reveal key={item.id ?? `${item.date}-${item.title}`} delay={Math.min(i, 3) * 0.08}>
                  <article className="overflow-hidden rounded-2xl border border-line bg-card">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        className="aspect-[16/9] w-full object-cover"
                      />
                    )}
                    <div className="p-7">
                      <time
                        dateTime={item.date}
                        className="text-xs font-semibold uppercase tracking-wider text-gold-dim"
                      >
                        {formatDate(item.date)}
                      </time>
                      <h3 className="mt-2 text-balance font-serif text-2xl text-ink">
                        {item.title}
                      </h3>
                      <div className="mt-4 flex flex-col gap-3 leading-relaxed text-ink-soft">
                        {item.text
                          .split(/\n\s*\n/)
                          .filter((p) => p.trim())
                          .map((p, j) => (
                            <p key={j} className="whitespace-pre-line">{p.trim()}</p>
                          ))}
                      </div>
                      {source && (
                        <p className="mt-5 text-sm text-ink-faint">
                          Источник:{" "}
                          <a
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="text-gold-dim underline underline-offset-4 transition-colors hover:text-ink"
                          >
                            {item.sourceTitle || new URL(source).hostname}
                          </a>
                        </p>
                      )}
                    </div>
                  </article>
                </Reveal>
              )
            })}

            {items.length > INITIAL_COUNT && (
              <div className="mt-2 text-center">
                <Button variant="outline" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Свернуть" : `Все новости (${items.length})`}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <Reveal className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-dashed border-line bg-card px-8 py-12 text-center">
            <Newspaper className="size-8 text-gold-dim" />
            <p className="text-ink-soft">
              {failed
                ? "Не удалось загрузить новости. Попробуйте обновить страницу."
                : items === null
                  ? "Загружаем новости…"
                  : "Пока новостей нет. Загляните позже."}
            </p>
          </Reveal>
        )}
      </div>
    </section>
  )
}
