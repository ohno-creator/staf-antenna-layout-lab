# 1019-107A専用の高品質透過処理
# 元画像が97x82pxと小さいため、4倍Lanczos拡大→シャープ化→
# 白領域除去（外周連結＋閉じた大きな白領域）→輪郭アンチエイリアスで仕上げる
from PIL import Image, ImageFilter
from collections import deque
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SCALE = 4
WHITE_T = 238          # 白とみなすしきい値（min(R,G,B)）
HOLE_MIN_AREA = 800    # 外周非連結でも背景とみなす白領域の最小面積（4倍画像上）
PAD_RATIO = 0.05

img = Image.open(os.path.join(BASE, "1019-107A_raw.jpeg")).convert("RGB")
w0, h0 = img.size
img = img.resize((w0 * SCALE, h0 * SCALE), Image.LANCZOS)
img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=90, threshold=2))
w, h = img.size
px = img.load()

# 白マスクの連結成分を抽出
is_white = bytearray(w * h)
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if min(r, g, b) >= WHITE_T:
            is_white[y * w + x] = 1

labeled = bytearray(w * h)  # 0=未処理 1=背景として除去
visited = bytearray(w * h)
for sy in range(h):
    for sx in range(w):
        idx0 = sy * w + sx
        if not is_white[idx0] or visited[idx0]:
            continue
        # BFSで成分を収集
        component = []
        touches_border = False
        queue = deque([(sx, sy)])
        visited[idx0] = 1
        while queue:
            x, y = queue.popleft()
            component.append((x, y))
            if x == 0 or y == 0 or x == w - 1 or y == h - 1:
                touches_border = True
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h:
                    ni = ny * w + nx
                    if is_white[ni] and not visited[ni]:
                        visited[ni] = 1
                        queue.append((nx, ny))
        if touches_border or len(component) >= HOLE_MIN_AREA:
            for x, y in component:
                labeled[y * w + x] = 1

# アルファ生成→ガウスぼかしで輪郭を滑らかに
alpha = Image.new("L", (w, h), 255)
ap = alpha.load()
for y in range(h):
    for x in range(w):
        if labeled[y * w + x]:
            ap[x, y] = 0
alpha = alpha.filter(ImageFilter.GaussianBlur(1.6))

out = img.convert("RGBA")
out.putalpha(alpha)

# bboxトリミング（α>16の範囲）
mask = alpha.point(lambda a: 255 if a > 16 else 0)
bbox = mask.getbbox()
left, top, right, bottom = bbox
pad = max(4, int(max(right - left, bottom - top) * PAD_RATIO))
out = out.crop((max(0, left - pad), max(0, top - pad), min(w, right + pad), min(h, bottom + pad)))
out.save(os.path.join(BASE, "1019-107A.png"))
print(f"saved 1019-107A.png: {out.size[0]}x{out.size[1]}")
