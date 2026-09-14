#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Dồn id thành ngữ (sentences_6.json: 1001-1110, sentences_7.json: 1111-1260)
sang dải 2001-2260, để nhường 1001-2000 cho các câu giao tiếp thường mới."""
import json, os, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
OFFSET = 1000

for lang in ["ru", "en", "fr", "zh"]:
    d = os.path.join(ROOT, lang)
    for fn in ["sentences_6.json", "sentences_7.json"]:
        path = os.path.join(d, fn)
        if not os.path.exists(path):
            print(f"SKIP (not found): {path}")
            continue
        data = json.load(open(path, encoding="utf-8"))
        for it in data:
            it["id"] = it["id"] + OFFSET
        json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False)
        print(f"{path}: renumbered {len(data)} items, id {data[0]['id']}-{data[-1]['id']}")
