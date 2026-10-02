import { Newspaper } from "lucide-react"
import { Reveal } from "@/components/ui/reveal"

export function News() {
  return (
    <section id="news" className="bg-paper-dim py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <Reveal>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
            Новости прихода в Усть-Карске
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl text-ink sm:text-4xl">
            Новости
          </h2>
          <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-4 rounded-2xl border border-dashed border-line bg-card px-8 py-12">
            <Newspaper className="size-8 text-gold-dim" />
            <p className="text-ink-soft">Пока новостей нет. Загляните позже.</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
