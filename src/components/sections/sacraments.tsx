import { Reveal } from "@/components/ui/reveal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { sacraments, siteMeta } from "@/content/site"

export function Sacraments() {
  return (
    <section id="sacraments" className="py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
            Таинства Церкви
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl text-ink sm:text-4xl">
            Таинства
          </h2>
        </Reveal>

        <Reveal delay={0.1} className="mt-12 rounded-2xl border border-line bg-card p-7">
          <Accordion type="single" collapsible className="divide-y divide-line">
            {sacraments.map((s) => (
              <AccordionItem
                key={s.title}
                value={s.title}
                className="border-b border-line last:border-b-0"
              >
                <AccordionTrigger className="text-ink hover:text-gold-dim [&>svg]:text-gold-dim">
                  {s.title}
                </AccordionTrigger>
                <AccordionContent className="text-ink-soft">
                  <dl className="flex flex-col gap-3">
                    {s.items.map((item) => (
                      <div key={item.label}>
                        <dt className="text-xs font-semibold uppercase tracking-wider text-gold-dim">
                          {item.label}
                        </dt>
                        <dd className="mt-1">{item.text}</dd>
                      </div>
                    ))}
                  </dl>
                  <a
                    href={s.href}
                    className="mt-4 inline-block text-sm text-gold-dim underline underline-offset-4 transition-colors hover:text-ink"
                  >
                    Подробнее о таинстве →
                  </a>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <Reveal delay={0.2} className="mt-12 text-center">
          <p className="mb-4 text-sm text-ink-faint">Для записи звоните:</p>
          <Button asChild variant="gold" size="lg">
            <a href={`tel:${siteMeta.phone.replace(/[^+\d]/g, "")}`}>
              {siteMeta.phone}
            </a>
          </Button>
        </Reveal>
      </div>
    </section>
  )
}
