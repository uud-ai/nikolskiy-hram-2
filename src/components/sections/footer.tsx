import { footerText, siteMeta } from "@/content/site"

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper-dim">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl text-sm leading-relaxed text-ink-faint">
            {footerText}
          </div>
          <div className="text-sm text-ink-soft sm:text-right">{siteMeta.address}</div>
        </div>
        <div className="mt-6 border-t border-line pt-6 text-sm text-ink-soft">
          <a
            href="/privacy.html"
            className="text-ink-faint underline decoration-line underline-offset-4 transition-colors hover:text-gold-dim"
          >
            Политика в отношении обработки персональных данных
          </a>
        </div>
      </div>
    </footer>
  )
}
