#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gộp + kiểm tra dữ liệu 1 gói ngôn ngữ bất kỳ (không riêng tiếng Nga).
Cách dùng: python3 merge_lang.py <mã ngôn ngữ, vd: en/fr/zh>
Đọc chunk từ  datagen/<lang>/words_1..5.json, sentences_1..5.json, sentences_6.json (idioms)
Ghi ra        app/assets/data/<lang>/words.js, sentences.js
"""
import json, sys, os, collections

ROOT = os.path.dirname(os.path.abspath(__file__))

WORD_CATS = {"greetings","numbers_time","verbs","family_people","food_drink",
    "everyday_objects_tech","transport","hotel","city_directions","shopping_money",
    "airport_customs","health","weather_nature","work_business","emotions_adjectives"}
SENT_CATS = {"greetings","small_talk","farewell_thanks","airport","telecom","bank_money",
    "hotel","restaurant","shopping","directions_transport","emergency_medical","business",
    "idioms_slang"}

WORD_FIELDS = ["id","ru","phonetic","pos","meaning","usage","example_ru","example_vi","category"]
SENT_FIELDS = ["id","ru","phonetic","meaning","note","category"]

def load(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def check_items(items, fields, cats, label):
    problems = []
    seen_ids = set()
    seen_ru = set()
    for i, it in enumerate(items):
        if not isinstance(it, dict):
            problems.append(f"{label}[{i}] not an object"); continue
        for fld in fields:
            if fld not in it or (isinstance(it.get(fld), str) and it.get(fld).strip()=="" and fld not in ("usage","note")):
                problems.append(f"{label} id={it.get('id')} missing/empty field '{fld}'")
        iid = it.get("id")
        if iid in seen_ids:
            problems.append(f"{label} duplicate id {iid}")
        seen_ids.add(iid)
        ru = str(it.get("ru","")).strip().lower()
        if ru in seen_ru:
            problems.append(f"{label} duplicate ru '{it.get('ru')}' (id={iid})")
        seen_ru.add(ru)
        cat = it.get("category")
        if cat not in cats:
            problems.append(f"{label} id={iid} unknown category '{cat}'")
    return problems

def process(lang, kind, chunk_files, fields, cats, expected_total, chunk_dir, out_data):
    all_items = []
    for fn in chunk_files:
        path = os.path.join(chunk_dir, fn)
        if not os.path.exists(path):
            print(f"MISSING FILE: {path}")
            sys.exit(1)
        try:
            data = load(path)
        except Exception as e:
            print(f"JSON ERROR in {fn}: {e}")
            sys.exit(1)
        if not isinstance(data, list):
            print(f"{fn}: top-level is not a list")
            sys.exit(1)
        print(f"{fn}: {len(data)} items")
        all_items.extend(data)

    all_items.sort(key=lambda x: x.get("id", 0))
    problems = check_items(all_items, fields, cats, kind)
    print(f"\n=== [{lang}] {kind.upper()} TOTAL: {len(all_items)} (expected {expected_total}) ===")
    if problems:
        print(f"--- {len(problems)} problem(s) found ---")
        for p in problems[:200]:
            print(" -", p)
        if len(problems) > 200:
            print(f"   ... and {len(problems)-200} more")
    else:
        print("No problems found.")

    cat_counts = collections.Counter(it.get("category") for it in all_items)
    print("Category counts:", dict(cat_counts))

    os.makedirs(out_data, exist_ok=True)
    json_path = os.path.join(chunk_dir, f"{kind}.json")  # bản tham chiếu, không đóng gói vào app
    js_path = os.path.join(out_data, f"{kind}.js")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=None)
    with open(js_path, "w", encoding="utf-8") as f:
        f.write("window.LANG_PACKS = window.LANG_PACKS || {};\n")
        f.write(f"window.LANG_PACKS.{lang} = window.LANG_PACKS.{lang} || {{}};\n")
        f.write(f"window.LANG_PACKS.{lang}.{kind} = ")
        json.dump(all_items, f, ensure_ascii=False)
        f.write(";\n")
    print(f"Wrote {json_path}")
    print(f"Wrote {js_path}")
    return len(problems), len(all_items)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 merge_lang.py <lang_code> [expected_words_total] [expected_sentences_total]")
        sys.exit(1)
    lang = sys.argv[1]
    expected_words = int(sys.argv[2]) if len(sys.argv) > 2 else 1000
    expected_sent = int(sys.argv[3]) if len(sys.argv) > 3 else 1100
    chunk_dir = os.path.join(ROOT, lang)
    out_data = os.path.join(ROOT, "..", "app", "assets", "data", lang)

    import glob, re
    def glob_chunks(prefix):
        paths = glob.glob(os.path.join(chunk_dir, f"{prefix}_*.json"))
        return sorted((os.path.basename(p) for p in paths),
                       key=lambda n: int(re.search(rf"{prefix}_(\d+)\.json", n).group(1)))

    word_chunks = glob_chunks("words")
    sent_chunks = glob_chunks("sentences")

    p1, n1 = process(lang, "words", word_chunks, WORD_FIELDS, WORD_CATS, expected_words, chunk_dir, out_data)
    p2, n2 = process(lang, "sentences", sent_chunks, SENT_FIELDS, SENT_CATS, expected_sent, chunk_dir, out_data)
    print("\n================ SUMMARY ================")
    print(f"[{lang}] words: {n1} items, {p1} problems")
    print(f"[{lang}] sentences: {n2} items, {p2} problems")
    if p1 or p2:
        sys.exit(2)
