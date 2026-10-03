import { Phone } from "lucide-react"
import { siteMeta } from "@/content/site"
import { telHref } from "@/lib/utils"

export function MobileCallButton() {
  return (
    <a
      href={telHref(siteMeta.phone)}
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-sm font-semibold text-ink shadow-[0_10px_30px_-8px_rgba(196,164,90,0.7)] transition-transform hover:scale-105 md:hidden"
    >
      <Phone className="size-4" />
      Позвонить
    </a>
  )
}
