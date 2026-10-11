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
    # chỉ file bài chính builder_1.json, builder_2.json... (không lấy builder_extra_*.json)
    files = sorted(f for f in glob.glob(os.path.join(ROOT, "datagen", lang, "builder_*.json"))
                   if re.match(r"builder_\d+\.json$", os.path.basename(f)))
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

    # phần hướng dẫn chi tiết + ví dụ thêm (builder_extra_*.json, xem builder_extra_spec.md)
    extra_files = sorted(glob.glob(os.path.join(ROOT, "datagen", lang, "builder_extra_*.json")))
    extras = {}
    for f in extra_files:
        for e in json.load(open(f, encoding="utf-8")):
            extras[e["id"]] = e
    if extra_files and sorted(extras) != expected:
        errors.append("extra ids %s != expected" % sorted(extras))

    def check_sentence(where, it, need_tokens):
        for k in ("t", "ph", "vi"):
            if not it.get(k):
                errors.append("%s: missing %s" % (where, k))
        for h in it.get("hl", []):
            if h not in it.get("t", ""):
                errors.append("%s: hl %r not in %r" % (where, h, it.get("t")))
        if need_tokens:
            toks = it.get("tokens") or []
            want = ZH_PUNCT.sub("", it["t"]) if lang == "zh" else PUNCT_TAIL.sub("", it["t"])
            got = "".join(toks) if lang == "zh" else " ".join(toks)
            if len(toks) < 2 or got != want:
                errors.append("%s: tokens %r != %r" % (where, toks, it.get("t")))

    for l in lessons:
        e = extras.get(l["id"])
        if not e:
            continue
        tag = "extra %s" % l["id"]
        if not any(b.get("k") == "P" for b in e.get("formula", [])):
            errors.append("%s: formula needs a P block" % tag)
        if not 3 <= len(e.get("points", [])) <= 4:
            errors.append("%s: needs 3-4 points" % tag)
        if not 1 <= len(e.get("mistakes", [])) <= 2:
            errors.append("%s: needs 1-2 mistakes" % tag)
        for k in ("compare", "tip"):
            if not e.get(k):
                errors.append("%s: missing %s" % (tag, k))
        if len(e.get("how", [])) != 3:
            errors.append("%s: needs 3 how" % tag)
        if not 3 <= len(e.get("dialog", [])) <= 4:
            errors.append("%s: dialog needs 3-4 lines" % tag)
        for i, d in enumerate(e.get("dialog", [])):
            check_sentence("%s dialog %d" % (tag, i), d, False)
        if len(e.get("more", [])) != 6:
            errors.append("%s: needs 6 more examples" % tag)
        for i, m in enumerate(e.get("more", [])):
            check_sentence("%s more %d" % (tag, i), m, True)
        for k in ("formula", "points", "mistakes", "compare", "tip", "how", "dialog", "more"):
            l[k] = e.get(k)

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
