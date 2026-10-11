#!/usr/bin/env python3
"""Gộp + kiểm tra dữ liệu "Ghép câu từng bước" của 1 ngôn ngữ.

Dùng:  python3 datagen/merge_builder.py <mã ngôn ngữ>
Đọc datagen/<mã>/builder_*.json, kiểm tra cấu trúc (36 bài theo builder_lessons.json,
mỗi bài 3 nhánh x 3 bước, mọi chuỗi "hl" phải có trong câu, "tokens" ghép lại phải
đúng bằng câu bỏ dấu câu) rồi sinh app/assets/data/<mã>/builder.js.
"""
import glob, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUNCT_TAIL = re.compile(r"[\s.?!。？！…]+$")
ZH_PUNCT = re.compile(r"[。？！，、；：“”‘’.?!,;:\s]")


def main(lang):
    lessons_spec = json.load(open(os.path.join(ROOT, "datagen", "builder_lessons.json"), encoding="utf-8"))
    files = sorted(glob.glob(os.path.join(ROOT, "datagen", lang, "builder_*.json")))
    if not files:
        sys.exit("MISSING: datagen/%s/builder_*.json" % lang)
    lessons = []
    for f in files:
        lessons += json.load(open(f, encoding="utf-8"))
    lessons.sort(key=lambda x: x["id"])

    errors = []
    ids = [l["id"] for l in lessons]
    expected = [l["id"] for l in lessons_spec]
    if ids != expected:
        errors.append("lesson ids %s != expected %s" % (ids, expected))

    for l in lessons:
        tag = "lesson %s" % l.get("id")
        for k in ("vi", "note", "pivot", "branches"):
            if not l.get(k):
                errors.append("%s: missing %s" % (tag, k))
        if len(l.get("branches", [])) != 3:
            errors.append("%s: needs 3 branches" % tag)
        for bi, br in enumerate(l.get("branches", [])):
            steps = br.get("steps", [])
            if len(steps) != 3:
                errors.append("%s branch %d: needs 3 steps" % (tag, bi))
                continue
            for si, stp in enumerate(steps):
                where = "%s b%d s%d" % (tag, bi, si)
                for k in ("t", "ph", "vi"):
                    if not stp.get(k):
                        errors.append("%s: missing %s" % (where, k))
                for h in stp.get("hl", []):
                    if h not in stp.get("t", ""):
                        errors.append("%s: hl %r not in %r" % (where, h, stp.get("t")))
            last = steps[2]
            toks = last.get("tokens") or []
            if len(toks) < 2:
                errors.append("%s b%d: step3 needs tokens" % (tag, bi))
            elif lang == "zh":
                if "".join(toks) != ZH_PUNCT.sub("", last["t"]):
                    errors.append("%s b%d: tokens %r != %r" % (tag, bi, toks, last["t"]))
            else:
                if " ".join(toks) != PUNCT_TAIL.sub("", last["t"]):
                    errors.append("%s b%d: tokens %r != %r" % (tag, bi, toks, last["t"]))

    if errors:
        print("\n".join(errors))
        sys.exit("%d ERROR(S) in %s builder data" % (len(errors), lang))

    out = os.path.join(ROOT, "app", "assets", "data", lang, "builder.js")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("window.LANG_PACKS = window.LANG_PACKS || {};\n")
        fh.write("window.LANG_PACKS.%s = window.LANG_PACKS.%s || {};\n" % (lang, lang))
        fh.write("window.LANG_PACKS.%s.builder = " % lang)
        json.dump(lessons, fh, ensure_ascii=False, separators=(",", ":"))
        fh.write(";\n")
    print("OK %s: %d lessons -> %s" % (lang, len(lessons), os.path.relpath(out, ROOT)))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
