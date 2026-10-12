// Страница «Благовеста» — отдельное приложение в /blagovest/. Чтобы переход
// по кнопке был быстрым, заранее подгружаем его файлы в кэш браузера: когда
// блок появился на экране или на кнопку навели/нажали пальцем.
export const BLAGOVEST_HREF = "/blagovest/"

const BLAGOVEST_PREFETCH = [
  "/blagovest/",
  "/blagovest/topics.js",
  "/blagovest/verses_of_day.js",
  "/blagovest/app.js",
  "/blagovest/vendor/marked.min.js",
  "/blagovest/vendor/purify.min.js",
]

let prefetched = false
export function prefetchBlagovest() {
  if (prefetched) return
  prefetched = true
  for (const href of BLAGOVEST_PREFETCH) {
    const link = document.createElement("link")
    link.rel = "prefetch"
    link.href = href
    document.head.appendChild(link)
  }
}

// Обработчики для ссылки на «Благовест»: наведение, касание, фокус с клавиатуры.
export const blagovestLinkProps = {
  onPointerEnter: prefetchBlagovest,
  onTouchStart: prefetchBlagovest,
  onFocus: prefetchBlagovest,
}
