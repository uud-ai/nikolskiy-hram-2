import { useEffect, useRef } from "react"
import { BookOpen } from "lucide-react"
import { Reveal } from "@/components/ui/reveal"
import { Button } from "@/components/ui/button"
import { blagovestLinkProps, prefetchBlagovest } from "@/lib/prefetch-blagovest"


export function GospelChat() {
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = sectionRef.current
    if (!el || !("IntersectionObserver" in window)) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          prefetchBlagovest()
          io.disconnect()
        }
      },
      { rootMargin: "200px" },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={sectionRef} className="bg-paper-dim py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-5 text-center sm:px-8">
        <Reveal>
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gold-glow/40 text-gold-dim">
            <BookOpen className="size-6" />
          </div>
          <span className="mt-6 block text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
            Благовест
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl text-ink sm:text-4xl">
            Есть вопрос об Евангелии?
          </h2>
          <p className="mt-4 text-ink-soft">
            Задайте его простыми словами — ответ придёт по синодальному
            тексту и толкованию блж. Феофилакта Болгарского.
          </p>
        </Reveal>
        <Reveal delay={0.1} className="mt-8">
          <Button asChild variant="gold" size="lg">
            <a
              href="/blagovest/"
              {...blagovestLinkProps}
            >
              Спросить
            </a>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
