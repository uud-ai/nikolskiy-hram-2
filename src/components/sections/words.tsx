import { useState } from "react"
import { Reveal } from "@/components/ui/reveal"
import { abbotWord } from "@/content/site"
import quotesData from "@/content/quotes.json"

interface Quote {
  text: string
  author: string
  source?: string
}

const quotes = quotesData as Quote[]

function pickRandomQuote(): Quote {
  return quotes[Math.floor(Math.random() * quotes.length)]
}

export function Words() {
  const [quote] = useState<Quote>(pickRandomQuote)

  return (
    <section className="bg-paper-dim py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="grid gap-8 md:grid-cols-5">
          <Reveal className="md:col-span-2">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={abbotWord.image}
                alt="Настоятель Никольского храма — иерей Николай"
                loading="lazy"
                className="aspect-[3/4] w-full object-cover"
              />
            </div>
          </Reveal>

          <Reveal delay={0.1} className="flex flex-col justify-center md:col-span-3">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
              Слово настоятеля
            </span>
            <blockquote className="mt-5 text-balance font-quote text-2xl leading-snug text-ink sm:text-3xl">
              «{abbotWord.quote}»
            </blockquote>
            <span className="mt-6 text-sm font-medium text-ink-soft">
              — {abbotWord.author}
            </span>
          </Reveal>
        </div>

        <Reveal delay={0.15}>
          <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-line bg-card p-8 text-center sm:p-12">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
              Слово святых отцов
            </span>
            <blockquote className="mt-5 text-balance font-quote text-xl leading-relaxed text-ink sm:text-2xl">
              «{quote.text}»
            </blockquote>
            <span className="mt-6 block text-sm font-medium text-ink-soft">
              — {quote.author}
            </span>
            {quote.source && (
              <span className="mt-1 block text-xs text-ink-faint">{quote.source}</span>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
