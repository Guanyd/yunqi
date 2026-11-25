"""生成 PWA 图标：icon-192.png / icon-512.png / apple-touch-icon.png / maskable 版本

设计：暖色底（与 app --accent #c8735a 一致）+ 白色心形，居中留足安全区。
"""
from PIL import Image, ImageDraw
import math, os

ACCENT = (200, 115, 90)           # --accent
ACCENT_DARK = (169, 84, 61)       # --accent-deep
WHITE = (255, 253, 251)           # --surface

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public')
os.makedirs(OUT, exist_ok=True)


def heart_points(cx, cy, size, steps=720):
    """经典心形参数方程，size 为整体宽度"""
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * size / 32.0, cy - y * size / 32.0))
    return pts


def make_icon(px, glyph_ratio=0.56, full_bleed=True):
    ss = 4  # 超采样抗锯齿
    S = px * ss
    img = Image.new('RGBA', (S, S), ACCENT + (255,))
    d = ImageDraw.Draw(img)

    # 轻微径向渐变：中心稍亮
    for r in range(int(S * 0.75), 0, -max(1, S // 220)):
        f = r / (S * 0.75)
        col = tuple(int(ACCENT[i] + (ACCENT_DARK[i] - ACCENT[i]) * f) for i in range(3))
        d.ellipse([S / 2 - r, S / 2 - r, S / 2 + r, S / 2 + r], fill=col + (255,))

    size = S * glyph_ratio
    d.polygon(heart_points(S / 2, S / 2 + size * 0.06, size), fill=WHITE + (255,))

    img = img.resize((px, px), Image.LANCZOS)
    return img


# any purpose（iOS / 桌面）
make_icon(192, 0.56).save(os.path.join(OUT, 'icon-192.png'), optimize=True)
make_icon(512, 0.56).save(os.path.join(OUT, 'icon-512.png'), optimize=True)
# apple-touch-icon：iOS 主屏 180×180
make_icon(180, 0.56).save(os.path.join(OUT, 'apple-touch-icon.png'), optimize=True)
# maskable：内容收进 80% 安全区
make_icon(512, 0.42).save(os.path.join(OUT, 'icon-512-maskable.png'), optimize=True)
make_icon(192, 0.42).save(os.path.join(OUT, 'icon-192-maskable.png'), optimize=True)

for f in sorted(os.listdir(OUT)):
    p = os.path.join(OUT, f)
    if f.endswith('.png'):
        print(f, os.path.getsize(p), 'bytes')
