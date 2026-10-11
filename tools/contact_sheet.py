#!/usr/bin/env python3
"""Ghép ảnh chụp của tools/screens.js thành bảng tổng hợp: mỗi màn hình 1 ảnh, đủ các kích thước.

Dùng: python3 tools/contact_sheet.py <thư mục ảnh> <thư mục ra> [chiều cao mỗi ô, mặc định 520]
"""
import os, sys
from collections import defaultdict
from PIL import Image, ImageDraw

src, out = sys.argv[1], sys.argv[2]
cell_h = int(sys.argv[3]) if len(sys.argv) > 3 else 520
os.makedirs(out, exist_ok=True)

ORDER = ["phone-small", "phone", "fold-cover", "fold-open", "tablet", "phone-land", "fold-open-land", "tablet-land"]
groups = defaultdict(dict)
for f in os.listdir(src):
    if f.endswith(".png") and "__" in f:
        screen, size = f[:-4].split("__")
        groups[screen][size] = os.path.join(src, f)

for screen, sizes in sorted(groups.items()):
    tiles = []
    for name in ORDER:
        if name not in sizes:
            continue
        im = Image.open(sizes[name]).convert("RGB")
        scale = cell_h / im.height
        im = im.resize((max(1, int(im.width * scale)), cell_h))
        tiles.append((name, im))
    # 2 hàng: hàng trên các khổ dọc, hàng dưới các khổ ngang
    rows = [[t for t in tiles if "land" not in t[0]], [t for t in tiles if "land" in t[0]]]
    rows = [r for r in rows if r]
    pad, label_h = 12, 22
    W = max(sum(im.width for _, im in r) + pad * (len(r) + 1) for r in rows)
    H = sum(cell_h + label_h + pad for _ in rows) + pad
    sheet = Image.new("RGB", (W, H), (60, 64, 72))
    d = ImageDraw.Draw(sheet)
    y = pad
    for r in rows:
        x = pad
        for name, im in r:
            d.text((x, y), name, fill=(255, 255, 255))
            sheet.paste(im, (x, y + label_h))
            x += im.width + pad
        y += cell_h + label_h + pad
    sheet.save(os.path.join(out, screen + ".png"))
    print(screen, sheet.size)
