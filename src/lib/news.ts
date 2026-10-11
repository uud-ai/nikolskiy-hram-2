// Новости прихода. Каждая новость — отдельный файл src/content/news/*.md:
//
//   ---
//   title: Освящение нового иконостаса
//   date: 2026-10-11
//   image: /images/news/ikonostas.jpg   (необязательно)
//   ---
//   Текст новости. Абзацы разделяются пустой строкой.
//
// Файлы подхватываются при сборке сайта. Новость с датой в будущем
// попадает на сайт сразу, но показывается посетителям только начиная
// с этой даты — так можно подготовить объявление заранее.

export interface NewsItem {
  slug: string
  title: string
  date: string // ГГГГ-ММ-ДД
  image?: string
  paragraphs: string[]
}

const files = import.meta.glob("/src/content/news/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>

function unquote(value: string): string {
  const v = value.trim()
  if (v.length >= 2 && v.startsWith('"') && v.endsWith('"')) {
    try {
      return JSON.parse(v) as string
    } catch {
      return v.slice(1, -1)
    }
  }
  if (v.length >= 2 && v.startsWith("'") && v.endsWith("'")) {
    return v.slice(1, -1).replace(/''/g, "'")
  }
  return v
}

/** Простой разбор шапки «ключ: значение» между строками «---». */
function parseNewsFile(slug: string, raw: string): NewsItem | null {
  const text = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n")
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text)
  if (!m) return null

  const meta: Record<string, string> = {}
  for (const line of m[1].split("\n")) {
    const idx = line.indexOf(":")
    if (idx <= 0 || /^\s/.test(line)) continue
    meta[line.slice(0, idx).trim()] = unquote(line.slice(idx + 1))
  }

  const title = meta.title?.trim()
  const dateMatch = /^\d{4}-\d{2}-\d{2}/.exec(meta.date ?? "")
  if (!title || !dateMatch) return null

  const image = meta.image?.trim()
  const paragraphs = m[2]
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)

  return {
    slug,
    title,
    date: dateMatch[0],
    // Только картинки с этого сайта или по https — без javascript: и т. п.
    image: image && (image.startsWith("/") || image.startsWith("https://")) ? image : undefined,
    paragraphs,
  }
}

export const allNews: NewsItem[] = Object.entries(files)
  .map(([path, raw]) => parseNewsFile(path.split("/").pop()!.replace(/\.md$/, ""), raw))
  .filter((n): n is NewsItem => n !== null)
  .sort((a, b) => (a.date === b.date ? b.slug.localeCompare(a.slug) : b.date.localeCompare(a.date)))
