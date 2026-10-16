// Логика страницы «Благовест». Вынесено из index.html, чтобы политика
// безопасности (Content-Security-Policy) могла запретить любые встроенные
// скрипты: на странице выполняется только код из файлов этого сайта.
    // ============================================================
    // НАСТРОЙКИ
    // ============================================================
    const FUNCTION_URL = 'https://functions.yandexcloud.net/d4epe1g39ghi90d4vf6l';

    // Общий токен для барьера от случайных сканеров на стороне функции.
    // Это НЕ секрет в криптографическом смысле — он виден в исходниках страницы.
    // Цель — отсечь шум: те, кто наткнулся на URL функции и не знает про токен,
    // получат 403 и пойдут дальше. Настоящая защита — rate limit на сервере.
    // При смене токена нужно одновременно обновить секрет APP_TOKEN в Cloudflare
    // (`wrangler secret put APP_TOKEN` в backend/).
    const APP_TOKEN = 'bg-public-v1-7Kp9qLm3X';

    // Если приложение открыли переходом с другой страницы того же сайта
    // (напр. teaser-секция на главной nikolskiyhram.site, когда «Благовест»
    // встроен туда подпапкой /blagovest/) — document.referrer это покажет.
    // Домен нигде не хардкодим: сработает для любого сайта, который когда-
    // нибудь ещё так же встроит приложение, и корректно ничего не покажет
    // при прямом заходе (закладка, QR-код).
    let parentSiteUrl = null;
    if (document.referrer) {
        try {
            const ref = new URL(document.referrer);
            if (ref.origin === location.origin && ref.href !== location.href) {
                parentSiteUrl = ref.href;
            }
        } catch (e) { /* некорректный referrer — просто не показываем кнопку */ }
    }

    // ============================================================
    // ОФЛАЙН-КЭШ (SERVICE WORKER)
    // Путь относительный — scope подстраивается под то, где лежит файл
    // (корень на GitHub Pages gospel-navigator, /blagovest/ на сайте
    // храма), без хардкода. SW кэширует только статику (темы, стих дня,
    // шрифты/иконки) — чат всё равно нужен живой, см. sw.js.
    // register() сам отказывает на file:// / небезопасном http — .catch
    // просто проглатывает это, без влияния на остальное приложение.
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => {});
        });
    }

    // Ссылки в ответах ИИ, открывающиеся в новой вкладке, не должны получать
    // доступ к этой странице через window.opener.
    if (window.DOMPurify) {
        DOMPurify.addHook('afterSanitizeAttributes', (node) => {
            if (node.tagName === 'A' && node.hasAttribute('target')) {
                node.setAttribute('target', '_blank');
                node.setAttribute('rel', 'noopener noreferrer');
            }
        });
    }

    function askConfirm(text) {
        return Promise.resolve(window.confirm(text));
    }

    // ============================================================
    // СОСТОЯНИЕ
    // ============================================================
    let currentScreen = 'home';
    let currentTopic = null;
    // Кэшируем выбранный стих дня в момент загрузки страницы.
    // Если пользователь держит приложение открытым через полночь — стих
    // не «прыгнет» сам собой; обновится при следующем открытии. Это намеренно:
    // менять контент под пользователем посреди сессии — плохой UX.
    let currentVerseOfDay = null;
    let chatHistory = JSON.parse(localStorage.getItem('blagovest_chat_history') || '[]');

    // Контекст последней переписки. Хранится ОТДЕЛЬНЫМ ключом, потому что свойство
    // на массиве (вроде chatHistory.__context) при JSON.stringify теряется — после
    // перезагрузки страницы контекст становился undefined, и переписка из одного
    // контекста (например, «Стих дня») протекала в другой (свободный чат).
    //
    // Возможные значения: null (свободный чат), 'topic:<id>', 'verse:<ref>'.
    function getContext() {
        return localStorage.getItem('blagovest_chat_context');
    }
    function setContext(ctx) {
        if (ctx === null || ctx === undefined) {
            localStorage.removeItem('blagovest_chat_context');
        } else {
            localStorage.setItem('blagovest_chat_context', ctx);
        }
    }

    // ============================================================
    // ССЫЛКИ НА КНИГИ ПИСАНИЯ (для интерактивных ссылок в ответах AI)
    // ============================================================
    const bibleBooksMap = {
        'Матфея': 'Mt', 'Мф': 'Mt',
        'Марка': 'Mk', 'Мк': 'Mk',
        'Луки': 'Lk', 'Лк': 'Lk',
        'Иоанна': 'Jn', 'Ин': 'Jn', 'Иоанн': 'Jn',
        'Римлянам': 'Rom', 'Рим': 'Rom',
        '1 Коринфянам': '1Cor', '1 Кор': '1Cor',
        '2 Коринфянам': '2Cor', '2 Кор': '2Cor',
        'Галатам': 'Gal', 'Гал': 'Gal',
        'Ефесянам': 'Eph', 'Еф': 'Eph',
        'Филиппийцам': 'Phil', 'Флп': 'Phil',
        'Колоссянам': 'Col', 'Кол': 'Col',
        '1 Тимофею': '1Tim', '1 Тим': '1Tim',
        '2 Тимофею': '2Tim', '2 Тим': '2Tim',
        '1 Петра': '1Pet', '1 Пет': '1Pet',
        '2 Петра': '2Pet', '2 Пет': '2Pet',
        'Иакова': 'Jas', 'Иак': 'Jas',
        'Деяний': 'Acts', 'Деян': 'Acts'
    };

    // Превращает упоминания библейских ссылок («Мф 5:3», «Ин 14:6») в кликабельные
    // ссылки на azbyka.ru. Принимает HTML-строку (уже после marked + DOMPurify),
    // возвращает HTML-строку.
    //
    // Важно: работаем не регекспом по строке, а по DOM-узлам. Иначе если marked
    // уже сделал ссылку из markdown-разметки [Мф 5:3](...), регексп влепил бы
    // внутрь второй <a> — получился бы невалидный вложенный тег. Поэтому
    // обходим только текстовые узлы, и только те, что не находятся внутри <a>.
    const BIBLE_REF_REGEX = /(1\s*Кор|2\s*Кор|1\s*Тим|2\s*Тим|1\s*Пет|2\s*Пет|Матфея|Марка|Луки|Иоанна|Римлянам|Галатам|Ефесянам|Филиппийцам|Колоссянам|Иакова|Деяний|Мф|Мк|Лк|Ин|Иоанн|Рим|Гал|Еф|Флп|Кол|Иак|Деян)\.?\s*(\d+):(\d+(?:-\d+)?)/gi;

    function linkifyBible(html) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;

        // Собираем все текстовые узлы, которые НЕ находятся внутри <a>.
        const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                if (node.parentNode && node.parentNode.closest('a')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        });

        const textNodes = [];
        let n;
        while ((n = walker.nextNode())) textNodes.push(n);

        textNodes.forEach(node => {
            const text = node.nodeValue;
            if (!BIBLE_REF_REGEX.test(text)) return;
            BIBLE_REF_REGEX.lastIndex = 0; // сбросить после test() с флагом /g

            const frag = document.createDocumentFragment();
            let lastIndex = 0;
            let match;
            while ((match = BIBLE_REF_REGEX.exec(text)) !== null) {
                const [full, book, chapter, verse] = match;
                const start = match.index;

                if (start > lastIndex) {
                    frag.appendChild(document.createTextNode(text.slice(lastIndex, start)));
                }

                const normalized = book.replace(/\s+/g, ' ').trim();
                const bookCode = bibleBooksMap[normalized] || bibleBooksMap[normalized.replace(/\s/g, '')] || 'Jn';
                const a = document.createElement('a');
                a.href = `https://azbyka.ru/biblia/?${bookCode}.${chapter}:${verse}`;
                a.target = '_blank';
                a.rel = 'noopener';
                a.className = 'bible-link';
                a.textContent = full;
                frag.appendChild(a);

                lastIndex = start + full.length;
            }
            if (lastIndex < text.length) {
                frag.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            node.parentNode.replaceChild(frag, node);
        });

        return wrapper.innerHTML;
    }

    // ============================================================
    // НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ
    // ============================================================
    function showScreen(name) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-' + name).classList.add('active');
        currentScreen = name;

        const backBtn = document.getElementById('backBtn');
        const headerTitle = document.getElementById('headerTitle');

        if (name === 'home') {
            // На главном экране внутри приложения возвращаться некуда — но
            // если мы сюда попали переходом с родительского сайта, та же
            // стрелка «‹» ведёт обратно туда (см. parentSiteUrl выше и
            // обработчик клика ниже).
            if (parentSiteUrl) {
                backBtn.classList.add('visible');
                backBtn.setAttribute('aria-label', 'Назад на сайт');
            } else {
                backBtn.classList.remove('visible');
                backBtn.setAttribute('aria-label', 'Назад');
            }
            headerTitle.textContent = 'Благовест';
            currentTopic = null;
        } else if (name === 'topic') {
            backBtn.classList.add('visible');
            backBtn.setAttribute('aria-label', 'Назад');
            headerTitle.textContent = currentTopic ? currentTopic.title : 'Тема';
        } else if (name === 'chat') {
            backBtn.classList.add('visible');
            backBtn.setAttribute('aria-label', 'Назад');
            // При длинной переписке начальный «бейдж» контекста уплывает наверх
            // вместе со скроллом — а шапка остаётся видна всегда. Поэтому дублируем
            // в неё короткий маркер того, о чём идёт разговор. Источник истины —
            // ключ контекста, сохранённый через setContext: 'verse:<ref>', 'topic:<id>'
            // или 'free'. Это надёжнее, чем смотреть на currentTopic/currentVerseOfDay,
            // потому что те живут независимо от того, какой чат сейчас активен.
            const ctx = getContext();
            if (ctx && ctx.startsWith('verse:')) {
                headerTitle.textContent = ctx.slice('verse:'.length);
            } else if (ctx && ctx.startsWith('topic:')) {
                const topicId = ctx.slice('topic:'.length);
                const t = (typeof TOPICS !== 'undefined') ? TOPICS.find(x => x.id === topicId) : null;
                headerTitle.textContent = t ? t.title : 'Беседа';
            } else {
                headerTitle.textContent = 'Беседа';
            }
            setTimeout(() => {
                const cc = document.getElementById('chat-container');
                cc.scrollTop = cc.scrollHeight;
            }, 50);
        }

        window.scrollTo(0, 0);
    }

    function goBack() {
        if (currentScreen === 'chat' && currentTopic) {
            showScreen('topic');
        } else {
            showScreen('home');
        }
    }

    // ============================================================
    // СТИХ ДНЯ
    // ============================================================
    function renderVerseOfDay() {
        const container = document.getElementById('verseOfDay');
        if (!container) return;

        // Если verses_of_day.js не подгрузился (например, при первом
        // развёртывании на GitHub Pages, пока файла нет) — просто молча
        // не рисуем блок, чтобы пользователь не видел поломанной разметки.
        if (typeof getVerseOfDay !== 'function') return;

        const v = getVerseOfDay();
        currentVerseOfDay = v;

        container.innerHTML = `
            <div class="verse-of-day">
                <div class="verse-of-day-label">Стих дня</div>
                <div class="verse-of-day-ref">${v.ref}</div>
                <p class="verse-of-day-text">${v.text}</p>
                <button class="verse-of-day-action" id="verseOfDayBtn">
                    <i class="ti ti-message-circle-question"></i>Что это значит?
                </button>
            </div>
        `;

        document.getElementById('verseOfDayBtn').addEventListener('click', () => {
            openVerseOfDayChat();
        });
    }

    // Открывает чат с предзаданным первым сообщением от лица пользователя.
    // С точки зрения сервера это обычный чат-запрос, отличается только полем
    // source='verse_of_day' и тегом стиха в payload — это нужно для аналитики.
    function openVerseOfDayChat() {
        if (!currentVerseOfDay) return;
        const v = currentVerseOfDay;

        // Это смена контекста относительно прежней переписки — чистим историю.
        // Контекстный ключ — verse:<ref>, чтобы возврат к тому же стиху сохранял диалог,
        // а возврат к другому стиху / теме / свободному чату — нет.
        const newContextKey = 'verse:' + v.ref;
        const prevContext = getContext();
        if (prevContext !== null && prevContext !== newContextKey) {
            resetHistory();
        }
        setContext(newContextKey);

        const cc = document.getElementById('chat-container');
        cc.innerHTML = '';

        // Бейдж со ссылкой на стих — тот же стиль, что у тематических бейджей.
        const badge = document.createElement('div');
        badge.className = 'topic-badge';
        badge.innerHTML = `<i class="ti ti-book-2"></i> Стих дня · ${v.ref}`;
        cc.appendChild(badge);

        // Если это первый заход на этот стих — формируем начальное
        // сообщение пользователя и сразу отправляем. AI ответит, пользователь
        // увидит результат как обычный чат.
        const firstQuestion = `Объясни, пожалуйста, стих ${v.ref}: «${v.text}» — в каком контексте он был сказан и как его понимать?`;

        showScreen('chat');

        // Отправляем как обычное сообщение, помечая источник.
        sendVerseOfDayQuestion(firstQuestion);
    }

    // Отдельная функция отправки: то же, что sendMessage, но текст приходит
    // программно, а в payload добавлены source/verseTag для серверной аналитики.
    async function sendVerseOfDayQuestion(text) {
        if (isSending) return;
        isSending = true;
        appendMessage('user', text);
        chatHistory.push({ role: "user", content: text });
        saveHistory();
        setLoading(true);

        try {
            const payload = {
                messages: chatHistory,
                topicContext: null,
                source: 'verse_of_day',
                verseTag: currentVerseOfDay ? currentVerseOfDay.tag : null,
                verseRef: currentVerseOfDay ? currentVerseOfDay.ref : null
            };

            const { message: aiAnswer } = await postChatRequest(payload);
            appendMessage('ai', aiAnswer);
            chatHistory.push({ role: "assistant", content: aiAnswer });
            if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);
            saveHistory();
        } catch (error) {
            appendMessage('ai', 'К сожалению, произошла ошибка: ' + error.message);
        } finally {
            isSending = false;
            setLoading(false);
        }
    }

    // ============================================================
    // РЕНДЕР ГЛАВНОЙ
    // ============================================================
    function renderHome() {
        const grid = document.getElementById('tilesGrid');
        grid.innerHTML = '';
        TOPICS.forEach(topic => {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.setAttribute('role', 'button');
            tile.setAttribute('tabindex', '0');
            tile.setAttribute('aria-label', topic.title);
            tile.innerHTML = `
                <div class="tile-icon"><i class="ti ${topic.icon}"></i></div>
                <div class="tile-title">${topic.title}</div>
            `;
            tile.addEventListener('click', () => { openTopic(topic.id); });
            tile.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openTopic(topic.id);
                }
            });
            grid.appendChild(tile);
        });
    }

    // ============================================================
    // РЕНДЕР СТРАНИЦЫ ТЕМЫ
    // ============================================================
    function openTopic(topicId) {
        const topic = TOPICS.find(t => t.id === topicId);
        if (!topic) return;

        // При переходе на НОВУЮ плитку — очищаем историю переписки.
        // Если пользователь возвращается на ту же тему (например, после кнопки «Назад»),
        // историю сохраняем — это продолжение той же беседы.
        if (!currentTopic || currentTopic.id !== topic.id) {
            resetHistory();
        }

        currentTopic = topic;

        document.getElementById('topicIcon').className = 'ti ' + topic.icon;
        document.getElementById('topicTitle').textContent = topic.title;
        document.getElementById('topicIntro').textContent = topic.intro;

        const versesList = document.getElementById('versesList');
        versesList.innerHTML = '';
        topic.verses.forEach(v => {
            const div = document.createElement('div');
            div.className = 'verse';
            div.innerHTML = `
                <div class="verse-ref">${v.ref}</div>
                <div class="verse-text">${v.text}</div>
            `;
            versesList.appendChild(div);
        });

        const commentaryList = document.getElementById('commentaryList');
        commentaryList.innerHTML = '';
        topic.commentary.forEach(paragraph => {
            const p = document.createElement('p');
            p.className = 'commentary-text';
            p.textContent = paragraph;
            commentaryList.appendChild(p);
        });

        showScreen('topic');
    }

    // Флаг «идёт запрос к серверу». Защищает от двойной отправки, если
    // пользователь успел дважды нажать Enter / кнопку до того, как inputs
    // успели задизейблиться.
    let isSending = false;

    // Таймаут запроса к функции. Yandex Cloud Function живёт 30 сек —
    // оставляем небольшой запас на сеть, чтобы успеть показать понятную ошибку
    // до того, как браузер сам оборвёт fetch.
    const REQUEST_TIMEOUT_MS = 25000;

    // Общая логика POST к функции с AbortController, таймаутом и единообразной
    // обработкой ошибок (429/403/400 → сообщение сервера, таймаут → своё сообщение).
    // Возвращает { ok: true, message } или бросает Error с понятным message.
    async function postChatRequest(payload) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
            const response = await fetch(FUNCTION_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-App-Token': APP_TOKEN
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            // Особые случаи: сервер вернул понятное текстовое сообщение —
            // показываем его пользователю, а не общее «Ошибка связи».
            if (response.status === 429 || response.status === 403 || response.status === 400) {
                let serverMsg = '';
                try {
                    const errData = await response.json();
                    serverMsg = errData.message || '';
                } catch (e) {}
                throw new Error(serverMsg || 'Запрос отклонён сервером.');
            }
            if (!response.ok) throw new Error('Ошибка связи с сервером');

            const data = await response.json();
            return { message: data.message || 'Извините, не получил ответа.' };
        } catch (err) {
            // AbortError — это наш таймаут. Перепаковываем в понятное сообщение.
            if (err.name === 'AbortError') {
                throw new Error('Ответ занял слишком много времени. Попробуйте задать вопрос ещё раз.');
            }
            // TypeError от fetch — запрос вообще не дошёл до сервера (нет сети,
            // соединение оборвано по пути, адрес недоступен из этой сети).
            if (err instanceof TypeError) {
                throw new Error('сервер чата сейчас недоступен. Проверьте подключение к интернету и попробуйте позже.');
            }
            throw err;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // ============================================================
    // ЧАТ
    // ============================================================
    function saveHistory() {
        localStorage.setItem('blagovest_chat_history', JSON.stringify(chatHistory));
    }

    // Тихая очистка истории — без подтверждения и без вывода сообщений.
    // Используется при переключении контекста (новая плитка / возврат в свободный чат и т.п.),
    // чтобы старая переписка не «протекала» в новый разговор и не уходила в API.
    function resetHistory() {
        chatHistory = [];
        localStorage.removeItem('blagovest_chat_history');
        // Контекст в этот момент тоже сбрасываем — конкретный новый контекст
        // выставит вызывающая сторона через setContext(...).
        setContext(null);
    }

    async function clearHistory() {
        const yes = await askConfirm('Очистить историю переписки?');
        if (!yes) return;
        chatHistory = [];
        localStorage.removeItem('blagovest_chat_history');
        setContext(null);
        const cc = document.getElementById('chat-container');
        cc.innerHTML = '';
        appendMessage('ai', 'История очищена. О чём вы хотите спросить?', false);
    }

    function openChat(topicContext) {
        // Если переключаемся между свободным чатом и тематическим (или наоборот) —
        // тоже считаем это сменой контекста и чистим историю.
        // Формат ключа: 'topic:<id>' для темы, 'free' для свободного чата,
        // 'verse:<ref>' для стиха дня (см. openVerseOfDayChat).
        const newContextKey = topicContext ? ('topic:' + topicContext.id) : 'free';
        const prevContext = getContext();
        if (prevContext !== null && prevContext !== newContextKey) {
            resetHistory();
        }
        setContext(newContextKey);

        const cc = document.getElementById('chat-container');
        cc.innerHTML = '';

        // Если открываем чат по теме — добавляем «бейдж темы» и приветствие в контексте темы
        if (topicContext) {
            const badge = document.createElement('div');
            badge.className = 'topic-badge';
            badge.innerHTML = `<i class="ti ${topicContext.icon}"></i> ${topicContext.title}`;
            cc.appendChild(badge);

            appendMessage('ai',
                `Готов обсудить с вами тему «${topicContext.title}». О чём именно вы хотели бы поговорить?`,
                false
            );
        } else {
            // Свободный чат — показываем накопленную историю
            if (chatHistory.length === 0) {
                appendMessage('ai', 'Мир вам! Я помогу найти ответы в Евангелии. О чём вы хотите спросить?', false);
            } else {
                chatHistory.forEach(msg => {
                    appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.content, false);
                });
            }
        }

        showScreen('chat');
        setTimeout(() => document.getElementById('userInput').focus(), 100);
    }

    async function sendMessage() {
        if (isSending) return; // защита от двойной отправки (двойной Enter, дабл-клик, IME)
        const input = document.getElementById('userInput');
        const text = input.value.trim();
        if (!text) return; // пустую строку не шлём; валидация длины — на сервере

        isSending = true;
        appendMessage('user', text);
        chatHistory.push({ role: "user", content: text });
        saveHistory();
        input.value = '';
        setLoading(true);

        try {
            const payload = {
                messages: chatHistory,
                topicContext: currentTopic ? currentTopic.aiContext : null,
                // Маркер источника для серверной аналитики. См. также sendVerseOfDayQuestion.
                source: currentTopic ? 'topic' : 'free_chat',
                topicId: currentTopic ? currentTopic.id : null
            };

            const { message: aiAnswer } = await postChatRequest(payload);

            appendMessage('ai', aiAnswer);
            chatHistory.push({ role: "assistant", content: aiAnswer });

            if (chatHistory.length > 12) chatHistory = chatHistory.slice(-12);
            saveHistory();
        } catch (error) {
            appendMessage('ai', 'К сожалению, произошла ошибка: ' + error.message);
        } finally {
            isSending = false;
            setLoading(false);
        }
    }

    function appendMessage(role, text, shouldScroll = true) {
        const cc = document.getElementById('chat-container');
        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${role === 'user' ? 'user-message' : 'ai-message'}`;

        if (role === 'ai' || role === 'assistant') {
            // marked → DOMPurify → linkifyBible.
            // DOMPurify санитизирует HTML от потенциально опасных тегов/атрибутов
            // (если LLM или будущий источник вернёт сырой HTML). linkifyBible
            // потом работает уже с безопасным DOM.
            // Если marked или DOMPurify не загрузились (сбой сети, блокировщик),
            // ответ показываем простым текстом: вставлять неочищенный HTML
            // на страницу нельзя ни при каких условиях.
            if (window.marked && window.DOMPurify) {
                const rawHtml = marked.parse(text);
                const cleanHtml = DOMPurify.sanitize(rawHtml, { ADD_ATTR: ['target'] });
                msgDiv.innerHTML = linkifyBible(cleanHtml);
            } else {
                msgDiv.textContent = text;
                msgDiv.style.whiteSpace = 'pre-wrap';
            }
        } else {
            msgDiv.textContent = text;
        }

        cc.appendChild(msgDiv);
        if (shouldScroll) cc.scrollTop = cc.scrollHeight;
    }

    function setLoading(isLoading) {
        document.getElementById('loader').style.display = isLoading ? 'block' : 'none';
        document.getElementById('sendBtn').disabled = isLoading;
        document.getElementById('userInput').disabled = isLoading;
        if (!isLoading) document.getElementById('userInput').focus();
    }

    // ============================================================
    // СЛУШАТЕЛИ СОБЫТИЙ
    // ============================================================
    document.getElementById('backBtn').addEventListener('click', () => {
        if (currentScreen === 'home' && parentSiteUrl) {
            location.href = parentSiteUrl;
            return;
        }
        goBack();
    });
    document.getElementById('clearBtn').addEventListener('click', () => { clearHistory(); });
    document.getElementById('freeChatCard').addEventListener('click', () => { openChat(null); });
    document.getElementById('freeChatCard').addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openChat(null);
        }
    });
    document.getElementById('askAboutTopicBtn').addEventListener('click', () => { openChat(currentTopic); });
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('userInput').addEventListener('keydown', e => {
        // keydown надёжнее устаревшего keypress; isComposing — чтобы Enter
        // во время ввода через IME (китайский/японский и т.п.) не отправлял сообщение.
        if (e.key === 'Enter' && !e.isComposing) {
            e.preventDefault();
            sendMessage();
        }
    });

    // ============================================================
    // ДЕСКТОПНЫЙ "СПОТЛАЙТ" ЗА ПРИЛОЖЕНИЕМ
    // Обновляет CSS-переменные --spot-x/--spot-y на <body>, которые читает
    // body::before (см. <style>). Эффект сам выключен в CSS на тач-устройствах
    // и при prefers-reduced-motion — слушатель здесь просто не навешиваем,
    // чтобы не тратить ресурсы там, где эффекта и так не будет видно.
    // ============================================================
    const supportsSpotlight = window.matchMedia('(pointer: fine)').matches
        && window.matchMedia('(prefers-reduced-motion: no-preference)').matches;
    if (supportsSpotlight) {
        // rAF-throttle: быстрое движение мыши даёт десятки mousemove между
        // кадрами — пишем стиль максимум раз на кадр (с последними координатами),
        // а не на каждое событие.
        let spotlightX = 0, spotlightY = 0, spotlightFrame = null;
        document.addEventListener('mousemove', e => {
            spotlightX = e.clientX;
            spotlightY = e.clientY;
            if (spotlightFrame !== null) return;
            spotlightFrame = requestAnimationFrame(() => {
                document.body.style.setProperty('--spot-x', spotlightX + 'px');
                document.body.style.setProperty('--spot-y', spotlightY + 'px');
                spotlightFrame = null;
            });
        }, { passive: true });
    }

    // ============================================================
    // ЗАПУСК
    // ============================================================
    renderVerseOfDay();
    renderHome();
    showScreen('home');
