// sw.js — офлайн-кэш для «Благовеста».
//
// Файл должен лежать В ТОЙ ЖЕ папке, что index.html — scope service worker'а
// браузер берёт из места самого файла (см. регистрацию в index.html:
// navigator.serviceWorker.register('sw.js'), путь относительный специально,
// чтобы работало и в корне (GitHub Pages gospel-navigator), и в подкаталоге
// (nikolskiyhram.site/blagovest/) без хардкода.
//
// Что кэшируется:
//  - оболочка приложения (APP_SHELL) — ставится в кэш при install, поэтому
//    темы и «стих дня» (это статика, зашитая в topics.js/verses_of_day.js)
//    открываются офлайн сразу после первого визита;
//  - локальные шрифты из fonts/ — кэшируются по факту первого запроса.
//    Внешние домены service worker не трогает.
//
// Чего не кэшируется:
//  - POST-запросы к чат-бэкенду (Cloudflare Workers) — это живой API,
//    не статика. Офлайн чат закономерно не отвечает — index.html уже
//    показывает понятную ошибку сети (см. postChatRequest).
//
// Страница и скрипты берутся из сети в первую очередь (network-first), кэш —
// только запасной вариант для офлайна. Поэтому новая версия index.html,
// topics.js и verses_of_day.js доходит до посетителей сразу после деплоя,
// даже если CACHE_NAME забыли поменять. Шрифты не меняются — их отдаём из
// кэша (cache-first). CACHE_NAME стоит менять, чтобы почистить старый кэш.
const CACHE_NAME = 'blagovest-v5';
const APP_SHELL = ['./', './index.html', './topics.js', './verses_of_day.js',
    './vendor/marked.min.js', './vendor/purify.min.js'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

function putInCache(req, res) {
    if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
    }
    return res;
}

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return; // POST к чат-бэкенду не трогаем — идёт в сеть напрямую

    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return; // чужие домены не кэшируем

    // Шрифты неизменны — сначала кэш.
    if (url.pathname.includes('/fonts/')) {
        event.respondWith(
            caches.match(req).then((cached) => cached || fetch(req).then((res) => putInCache(req, res)))
        );
        return;
    }

    // Всё остальное — сначала сеть, при отсутствии связи — кэш.
    event.respondWith(
        fetch(req)
            .then((res) => putInCache(req, res))
            .catch(() =>
                caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
                    .then((res) => res || Response.error())
            )
    );
});
