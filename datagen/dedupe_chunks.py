#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Khử trùng lặp 'ru' trên toàn bộ chunk (words_*.json hoặc sentences_*.json) của 1 ngôn ngữ,
bằng cách XÓA HẲN các mục trùng (giữ mục có id nhỏ nhất), thay vì soạn tay từng mục thay thế —
cần thiết ở quy mô lớn (hàng nghìn mục) khi soạn tay không còn khả thi.

Cách dùng: python3 dedupe_chunks.py <lang> <words|sentences>
"""
import json, os, sys, glob, re, collections

ROOT = os.path.dirname(os.path.abspath(__file__))

def main():
    if len(sys.argv) < 3:
        print("Usage: python3 dedupe_chunks.py <lang> <words|sentences>")
        sys.exit(1)
    lang, kind = sys.argv[1], sys.argv[2]
    chunk_dir = os.path.join(ROOT, lang)
    paths = glob.glob(os.path.join(chunk_dir, f"{kind}_*.json"))
    paths = sorted(paths, key=lambda p: int(re.search(rf"{kind}_(\d+)\.json", p).group(1)))

    file_data = {}
    all_items = []
    for p in paths:
        data = json.load(open(p, encoding="utf-8"))
        file_data[p] = data
        for it in data:
            all_items.append((p, it))

    all_items.sort(key=lambda pi: pi[1].get("id", 0))

    seen_ru = set()
    removed_by_file = collections.Counter()
    removed_by_cat = collections.Counter()
    to_remove_ids_by_file = collections.defaultdict(set)

    for p, it in all_items:
        key = str(it.get("ru", "")).strip().lower()
        if key in seen_ru:
            to_remove_ids_by_file[p].add(it["id"])
            removed_by_file[p] += 1
            removed_by_cat[it.get("category")] += 1
        else:
            seen_ru.add(key)

    total_removed = sum(removed_by_file.values())
    for p, data in file_data.items():
        remove_ids = to_remove_ids_by_file.get(p, set())
        if not remove_ids:
            continue
        new_data = [it for it in data if it["id"] not in remove_ids]
        json.dump(new_data, open(p, "w", encoding="utf-8"), ensure_ascii=False)
        print(f"{p}: removed {len(remove_ids)} duplicate(s), {len(data)} -> {len(new_data)}")

    print(f"\nTotal removed: {total_removed}")
    print("By category:", dict(removed_by_cat))

if __name__ == "__main__":
    main()
