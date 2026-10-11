"""Генерирует public/reading-data/pentecost-dated/<год>.json — рядовые чтения на
каждый день от понедельника Святого Духа до субботы перед Неделей о мытаре и
фарисее для всех лет из pascha-dates.json.

Запуск (нужна локальная копия Ponomar):
  git clone --depth 1 https://github.com/typiconman/ponomar /tmp/ponomar
  PONOMAR_XML=/tmp/ponomar/Ponomar/languages/xml python3 tools/build_pentecost_readings.py
"""
import json, datetime as dt, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from ponomar_lectionary import readings, jdn_greg

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "public" / "reading-data"
pascha = {int(k): dt.date.fromisoformat(v["date"]) for k, v in
          json.loads((DATA / "pascha-dates.json").read_text()).items() if not k.startswith("_")}

def ordinal(n): return f"{n}-я"

# Двунадесятые праздники и навечерия в этом периоде (новый стиль): рядовые
# чтения не читаются — блок на сайте скрывается.
GREAT_FEASTS = {(7, 12), (8, 19), (8, 28), (9, 21), (9, 27), (12, 4), (1, 6), (1, 7), (1, 18), (1, 19)}
NOMINAL = json.loads((DATA / "ordinary-cycle.json").read_text())["pentecost_period"]
WD = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]

# Разметка стихов в Ponomar местами следует английской Библии; приводим к
# Синодальному переводу, как в русских церковных календарях.
RU_FIX = {
    "Мк.3:19-27": "Мк.3:20-27",
    "Мф.22:2-14": "Мф.22:1-14",
    "2Кор.13:3-14": "2Кор.13:3-13",
    "Деян.9:19-31": "Деян.9:20-31",
}

def week_info(day, pent):
    ds = (day - pent).days
    return (ds - 1) // 7 + 1, day.weekday() == 6

out = {"_comment": "Сгенерировано tools/build_pentecost_readings.py из данных Ponomar. "
       "Ключ — дата (новый стиль). null — дня нет рядового чтения (великий праздник), "
       "блок чтений на сайте скрывается."}
eff, gaps = {}, []
for y in sorted(pascha):
    if y + 1 not in pascha: continue
    pent = pascha[y] + dt.timedelta(49)
    end = pascha[y + 1] - dt.timedelta(70)  # Неделя о мытаре и фарисее — уже Триодь
    d = pent + dt.timedelta(1)
    while d < end:
        r, env = readings(jdn_greg(d))
        ap = [(RU_FIX.get(a, a), z, w) for a, z, w in r["apostle"]]
        gp = [(RU_FIX.get(g, g), z, w) for g, z, w in r["gospel"]]
        names = r.get("names", [])
        week, is_sun = week_info(d, pent)
        notes = []
        entry = None
        if ap or gp:
            a0 = ap[0] if ap else None
            g0 = gp[0] if gp else None
            entry = {}
            if a0: entry.update(apostle=a0[0], apostle_zachalo=a0[1])
            if g0: entry.update(gospel=g0[0], gospel_zachalo=g0[1])
            if is_sun and not names:
                notes.append(f"Неделя {ordinal(week)} по Пятидесятнице" + (", Всех святых" if week == 1 else ""))
            gweek = int(g0[2]) if g0 and g0[2] else None
            eff[d] = (int(a0[2]) if a0 and a0[2] else week, gweek or week)
            if gweek and gweek >= 18 and d.month >= 9 and gweek != week and not names:
                notes.append(f"Евангелие — {ordinal(gweek - 17)} седмица Лукина чтения")
            if names:
                notes.insert(0, "; ".join(dict.fromkeys(n.replace("Возвижению", "Воздвижении").replace("Воздвижению", "Воздвижении") for n in names)))
            extra_a = [a for a in dict.fromkeys(x[0] for x in ap[1:]) if a != (a0 or [None])[0]]
            extra_g = [g for g in dict.fromkeys(x[0] for x in gp[1:]) if g != (g0 or [None])[0]]
            if extra_a or extra_g:
                if week == 2 and is_sun and not names:
                    lbl = "Всех святых, в земле Российской просиявших (чтения)"
                else:
                    lbl = "Также"
                notes.append(f"{lbl}: " + "; ".join(extra_a + extra_g))
            if notes: entry["note"] = ". ".join(notes)
        if (d.month, d.day) in GREAT_FEASTS:
            entry = None
        elif entry is None and d.weekday() != 6:
            gaps.append(d)
        out[d.isoformat()] = entry
        d += dt.timedelta(1)

# Дни, для которых в Ponomar нет рядового чтения (несколько будних дней в
# январе): берём седмицу Апостола/Евангелия соседних дней той же седмицы и
# читаем по номинальной таблице.
for d in gaps:
    monday = d - dt.timedelta(d.weekday())
    near = sorted((x for x in eff if monday <= x < monday + dt.timedelta(6)), key=lambda x: abs((x - d).days))
    if not near:
        continue
    aw, gw = eff[near[0]]
    wd = WD[d.weekday()]
    a = NOMINAL.get(str(aw), {}).get(wd, {})
    g = NOMINAL.get(str(gw), {}).get(wd, {})
    if a.get("apostle") and g.get("gospel"):
        out[d.isoformat()] = {"apostle": a["apostle"], "apostle_zachalo": a.get("apostle_zachalo"),
                              "gospel": g["gospel"], "gospel_zachalo": g.get("gospel_zachalo")}

# Раскладываем по календарным годам, чтобы главная страница грузила только
# файл текущего года (около 20 КБ в сжатом виде), а не все годы сразу.
OUT_DIR = DATA / "pentecost-dated"
OUT_DIR.mkdir(exist_ok=True)
by_year = {}
for k, v in out.items():
    if k.startswith("_"):
        continue
    by_year.setdefault(k[:4], {})[k] = v
for year, entries in by_year.items():
    payload = {k: v for k, v in out.items() if k.startswith("_")}
    payload.update(entries)
    (OUT_DIR / f"{year}.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1))
print("дней:", len(out) - 1, "годов:", len(by_year))
