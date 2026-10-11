#!/usr/bin/env python3
"""Sinh app/assets/data/meta.js: số từ/câu của từng ngôn ngữ.

App chỉ tải gói dữ liệu của ngôn ngữ đang chọn (cho nhanh), nên header lúc đang tải và
dashboard (% đã thuộc của cả 4 ngôn ngữ) cần biết tổng số mục mà không phải tải hết.
build.sh tự chạy script này mỗi lần build.
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "app", "assets", "data")


def count(path):
    if not os.path.exists(path):
        return 0
    s = open(path, encoding="utf-8").read()
    return len(json.loads(s[s.index("["):s.rindex("]") + 1]))


meta = {}
for lang in sorted(os.listdir(DATA)):
    d = os.path.join(DATA, lang)
    if not os.path.isdir(d):
        continue
    meta[lang] = {
        "words": count(os.path.join(d, "words.js")),
        "sentences": count(os.path.join(d, "sentences.js")),
        "builder": count(os.path.join(d, "builder.js")),
    }

with open(os.path.join(DATA, "meta.js"), "w", encoding="utf-8") as fh:
    fh.write("window.LANG_META = " + json.dumps(meta, separators=(",", ":")) + ";\n")
print("meta.js:", meta)
