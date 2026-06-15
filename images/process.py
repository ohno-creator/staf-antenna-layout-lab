# 製品写真の白背景を透過してbboxでトリミングするワンショットスクリプト
# （公開ファイルではありません。再生成したいときに使ってください）
from PIL import Image
from collections import deque
import os

BASE = os.path.dirname(os.path.abspath(__file__))
THRESHOLD = 232  # これ以上明るい外周連結ピクセルを背景とみなす
PAD_RATIO = 0.05


def remove_white_bg(img):
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    def is_bg(x, y):
        r, g, b, a = px[x, y]
        return a > 0 and r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD

    visited = bytearray(w * h)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_bg(x, y) and not visited[y * w + x]:
                visited[y * w + x] = 1
                queue.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg(x, y) and not visited[y * w + x]:
                visited[y * w + x] = 1
                queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        r, g, b, a = px[x, y]
        px[x, y] = (r, g, b, 0)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not visited[ny * w + nx] and is_bg(nx, ny):
                visited[ny * w + nx] = 1
                queue.append((nx, ny))

    # 境界を1pxだけ半透明にしてエッジを馴染ませる
    px2 = img.load()
    soft = []
    for y in range(h):
        for x in range(w):
            if px2[x, y][3] == 255:
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and px2[nx, ny][3] == 0:
                        soft.append((x, y))
                        break
    for x, y in soft:
        r, g, b, a = px2[x, y]
        px2[x, y] = (r, g, b, 150)
    return img


def crop_with_pad(img):
    bbox = img.getbbox()  # 非透過領域
    if not bbox:
        return img
    left, top, right, bottom = bbox
    bw, bh = right - left, bottom - top
    pad = max(4, int(max(bw, bh) * PAD_RATIO))
    left = max(0, left - pad)
    top = max(0, top - pad)
    right = min(img.size[0], right + pad)
    bottom = min(img.size[1], bottom + pad)
    return img.crop((left, top, right, bottom))


jobs = [
    ("1018-456_raw.jpg", "1018-456A.png", True),
    ("1019-107A_raw.jpeg", "1019-107A.png", True),
    ("1018-521A_raw.png", "1018-521A.png", False),  # 既に透過済み→トリミングのみ
]

for src, dst, needs_bg_removal in jobs:
    img = Image.open(os.path.join(BASE, src))
    img = remove_white_bg(img) if needs_bg_removal else img.convert("RGBA")
    img = crop_with_pad(img)
    img.save(os.path.join(BASE, dst))
    opaque = sum(1 for a in img.getchannel("A").getdata() if a > 0)
    total = img.size[0] * img.size[1]
    print(f"{dst}: {img.size[0]}x{img.size[1]}  不透過率 {opaque / total:.0%}")
