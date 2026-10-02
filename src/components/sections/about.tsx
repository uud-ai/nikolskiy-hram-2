import { Reveal } from "@/components/ui/reveal"
import { historyPeriods, gallery } from "@/content/site"

export function About() {
  return (
    <section id="about" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
            О храме
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl text-ink sm:text-4xl">
            Страницы истории: духовное наследие
          </h2>
        </Reveal>

        <div className="mt-20 flex flex-col gap-24">
          {historyPeriods.map((period, i) => (
            <div
              key={period.title}
              className="grid items-center gap-10 md:grid-cols-2 md:gap-16"
            >
              <Reveal
                className={i % 2 === 1 ? "md:order-2" : ""}
                delay={0.05}
              >
                <div className="group relative overflow-hidden rounded-2xl">
                  <img
                    src={period.image}
                    alt={period.imageAlt}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-premium group-hover:scale-105"
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-ink/10" />
                </div>
              </Reveal>

              <Reveal className={i % 2 === 1 ? "md:order-1" : ""} delay={0.15}>
                <span className="font-serif text-sm italic text-gold-dim">
                  {period.year}
                </span>
                <h3 className="mt-2 text-balance font-serif text-2xl text-ink sm:text-3xl">
                  {period.title}
                </h3>
                <p className="mt-5 text-[15px] leading-relaxed text-ink-soft sm:text-base">
                  {period.text}
                </p>
              </Reveal>
            </div>
          ))}
        </div>

        <Reveal className="mt-28">
          <h3 className="text-center font-serif text-2xl text-ink sm:text-3xl">
            Храм в фотографиях
          </h3>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
            {gallery.map((img, i) => (
              <Reveal key={img.src} delay={(i % 3) * 0.08}>
                <div className="group aspect-[4/3] overflow-hidden rounded-xl">
                  <img
                    src={img.src}
                    alt={img.alt}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 ease-premium group-hover:scale-110"
                  />
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
