// Портировано из bible-text.js: получение текста отрывка (Синодальный
// перевод, 1876, общественное достояние) по ссылке вида 'Мф.22:35-46' или
// 'Мф.10:32-33,37-38,19:27-30' из reading-data/nt-text.json:
// { book_id: { chapter: { verse: text } } }.

export type BibleData = Record<string, Record<string, Record<string, string>>>

const BOOK_MAP: Record<string, string> = {
  Мф: "Matt", Мк: "Mark", Лк: "Luke", Ин: "John",
  Деян: "Acts", Рим: "Rom", "1Кор": "1Cor", "2Кор": "2Cor",
  Гал: "Gal", Еф: "Eph", Флп: "Phil", Кол: "Col", Евр: "Heb",
  Иак: "Jas", "1Пет": "1Pet", "2Пет": "2Pet",
  "1Ин": "1John", "2Ин": "2John", "3Ин": "3John", Иуд: "Jude",
  "1Тим": "1Tim", "2Тим": "2Tim", Тит: "Titus", Флм: "Phlm",
  "1Фес": "1Thess", "2Фес": "2Thess", "1Сол": "1Thess", "2Сол": "2Thess",
}

const SEG_CROSS_CHAPTER = /^(\d+):(\d+)-(\d+):(\d+)$/
const SEG_SAME_CHAPTER_RANGE = /^(\d+):(\d+)-(\d+)$/
const SEG_SINGLE = /^(\d+):(\d+)$/
const SEG_VERSE_RANGE_NO_CHAPTER = /^(\d+)-(\d+)$/
const SEG_VERSE_NO_CHAPTER = /^(\d+)$/
const SEG_VERSE_TO_CHAPTER_VERSE = /^(\d+)-(\d+):(\d+)$/

function chapterVerses(bookData: BibleData, bookId: string, chapter: number) {
  const ch = bookData[bookId]?.[String(chapter)] ?? {}
  return Object.keys(ch).map(Number).sort((a, b) => a - b)
}

function verseText(bookData: BibleData, bookId: string, chapter: number, verse: number) {
  return bookData[bookId]?.[String(chapter)]?.[String(verse)]
}

function extractRange(
  bookData: BibleData,
  bookId: string,
  ch1: number,
  v1: number,
  ch2: number,
  v2: number
) {
  const out: string[] = []
  if (ch1 === ch2) {
    for (let v = v1; v <= v2; v++) {
      const t = verseText(bookData, bookId, ch1, v)
      if (t) out.push(t)
    }
    return out
  }
  chapterVerses(bookData, bookId, ch1).forEach((v) => {
    if (v >= v1) {
      const t = verseText(bookData, bookId, ch1, v)
      if (t) out.push(t)
    }
  })
  for (let c = ch1 + 1; c < ch2; c++) {
    chapterVerses(bookData, bookId, c).forEach((v) => {
      const t = verseText(bookData, bookId, c, v)
      if (t) out.push(t)
    })
  }
  chapterVerses(bookData, bookId, ch2).forEach((v) => {
    if (v <= v2) {
      const t = verseText(bookData, bookId, ch2, v)
      if (t) out.push(t)
    }
  })
  return out
}

function parseAndFetch(bookData: BibleData, ref: string): string[] | null {
  const dotIdx = ref.indexOf(".")
  if (dotIdx === -1) return null

  const bookShort = ref.slice(0, dotIdx)
  const rest = ref.slice(dotIdx + 1)
  const bookId = BOOK_MAP[bookShort]
  if (!bookId || !bookData[bookId]) return null

  let currentChapter: number | null = null
  let result: string[] = []
  const segments = rest.split(",")

  for (const raw of segments) {
    const seg = raw.trim()
    let m: RegExpExecArray | null

    if ((m = SEG_CROSS_CHAPTER.exec(seg))) {
      const [, c1, v1, c2, v2] = m.map(Number)
      result = result.concat(extractRange(bookData, bookId, c1, v1, c2, v2))
      currentChapter = c2
      continue
    }
    if ((m = SEG_SAME_CHAPTER_RANGE.exec(seg))) {
      const [, ch, sv1, sv2] = m.map(Number)
      result = result.concat(extractRange(bookData, bookId, ch, sv1, ch, sv2))
      currentChapter = ch
      continue
    }
    if ((m = SEG_SINGLE.exec(seg))) {
      const [, sch, svv] = m.map(Number)
      const t1 = verseText(bookData, bookId, sch, svv)
      if (t1) result.push(t1)
      currentChapter = sch
      continue
    }
    if ((m = SEG_VERSE_TO_CHAPTER_VERSE.exec(seg)) && currentChapter !== null) {
      const [, vv1, vch2, vv2] = m.map(Number)
      result = result.concat(extractRange(bookData, bookId, currentChapter, vv1, vch2, vv2))
      currentChapter = vch2
      continue
    }
    if ((m = SEG_VERSE_RANGE_NO_CHAPTER.exec(seg)) && currentChapter !== null) {
      const [, rv1, rv2] = m.map(Number)
      result = result.concat(extractRange(bookData, bookId, currentChapter, rv1, currentChapter, rv2))
      continue
    }
    if ((m = SEG_VERSE_NO_CHAPTER.exec(seg)) && currentChapter !== null) {
      const onlyV = Number(m[1])
      const t2 = verseText(bookData, bookId, currentChapter, onlyV)
      if (t2) result.push(t2)
      continue
    }
  }

  return result.length ? result : null
}

export function getText(bookData: BibleData, ref: string): string | null {
  const parsed = parseAndFetch(bookData, ref)
  return parsed ? parsed.join(" ") : null
}
