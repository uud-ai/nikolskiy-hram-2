import { useState } from "react"
import { Mail, MapPin, Phone, User } from "lucide-react"
import { Reveal } from "@/components/ui/reveal"
import { Button } from "@/components/ui/button"
import { siteMeta } from "@/content/site"

const yandexRouteUrl = `https://yandex.ru/maps/?text=${encodeURIComponent(siteMeta.address)}`
// Точные координаты и параметры — из оригинального проекта (script.js)
const yandexEmbedUrl =
  "https://yandex.ru/map-widget/v1/?ll=118.826725%2C52.883713&mode=search" +
  `&text=${encodeURIComponent(siteMeta.address)}&z=16`

export function Contacts() {
  const [showMap, setShowMap] = useState(false)

  return (
    <section id="contacts" className="py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <Reveal className="text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-dim">
            Контакты
          </span>
          <h2 className="mt-4 text-balance font-serif text-3xl text-ink sm:text-4xl">
            Как нас найти
          </h2>
        </Reveal>

        <div className="mt-14 grid gap-10 md:grid-cols-2">
          <Reveal delay={0.05}>
            <dl className="flex flex-col gap-6">
              <ContactRow icon={MapPin} label="Адрес">
                {siteMeta.address}
              </ContactRow>
              <ContactRow icon={User} label="Настоятель">
                {siteMeta.rector}
              </ContactRow>
              <ContactRow icon={Phone} label="Телефон">
                <a href={`tel:${siteMeta.phone.replace(/[^+\d]/g, "")}`} className="hover:text-gold-dim">
                  {siteMeta.phone}
                </a>
              </ContactRow>
              <ContactRow icon={Mail} label="E-mail">
                <a href={`mailto:${siteMeta.email}`} className="hover:text-gold-dim">
                  {siteMeta.email}
                </a>
              </ContactRow>
            </dl>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="gold">
                <a href={yandexRouteUrl} target="_blank" rel="noreferrer noopener">
                  Проложить маршрут в Яндексе
                </a>
              </Button>
              {!showMap && (
                <Button variant="outline" onClick={() => setShowMap(true)}>
                  📍 Показать карту
                </Button>
              )}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-paper-dim">
              {showMap ? (
                <iframe
                  title="Карта проезда к храму"
                  src={yandexEmbedUrl}
                  className="h-full w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <button
                  onClick={() => setShowMap(true)}
                  className="group flex h-full w-full flex-col items-center justify-center gap-3 text-ink-faint transition-colors hover:text-gold-dim"
                >
                  <MapPin className="size-8" />
                  <span className="text-sm">Нажмите, чтобы загрузить карту</span>
                </button>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function ContactRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-4">
      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-paper-dim text-gold-dim">
        <Icon className="size-5" />
      </div>
      <div>
        <dt className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          {label}
        </dt>
        <dd className="mt-1 text-[15px] text-ink">{children}</dd>
      </div>
    </div>
  )
}
