"""生成 iOS 开屏图（apple-touch-startup-image）。

iOS 的 PWA 没有 manifest 里的 splash 配置，只能在 index.html 里用
<link rel="apple-touch-startup-image" media="..."> 指定每个机型尺寸的图。
设计：暖色底 + 与 app 图标一致的圆角方块心形 + 应用名。
"""
from PIL import Image, ImageDraw, ImageFont
import math, os

BG = (248, 245, 240)        # --bg
ACCENT = (212, 133, 106)    # --accent
ACCENT_DARK = (188, 110, 84)
WHITE = (255, 255, 255)
TEXT = (44, 44, 44)         # --text

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public')
FONT_BOLD = 'C:/Windows/Fonts/msyhbd.ttc'

# (css 宽, css 高, dpr) -> 对应机型
DEVICES = [
    (320, 568, 2),   # iPhone SE 1st
    (375, 667, 2),   # iPhone 8 / SE 2/3
    (375, 812, 3),   # iPhone X / XS / 11 Pro
    (390, 844, 3),   # iPhone 12 / 13 / 14
    (393, 852, 3),   # iPhone 15 / 16
    (402, 874, 3),   # iPhone 16 Pro
    (414, 896, 2),   # iPhone XR / 11
    (414, 896, 3),   # iPhone XS Max / 11 Pro Max
    (428, 926, 3),   # iPhone 12 / 13 Pro Max
    (430, 932, 3),   # iPhone 14 / 15 Pro Max
    (440, 956, 3),   # iPhone 16 Pro Max
]


def heart_points(cx, cy, size, steps=720):
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * size / 32.0, cy - y * size / 32.0))
    return pts


def make_splash(w, h):
    img = Image.new('RGB', (w, h), BG)
    d = ImageDraw.Draw(img)

    tile = int(min(w, h) * 0.30)          # 图标方块边长
    radius = int(tile * 0.22)
    cx, cy = w // 2, int(h * 0.44)

    # 方块底色 + 轻微竖向渐变
    for y in range(tile):
        f = y / tile
        col = tuple(int(ACCENT[i] + (ACCENT_DARK[i] - ACCENT[i]) * f) for i in range(3))
        d.line([(cx - tile // 2, cy - tile // 2 + y), (cx + tile // 2, cy - tile // 2 + y)], fill=col)
    # 圆角遮罩
    mask = Image.new('L', (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [cx - tile // 2, cy - tile // 2, cx + tile // 2, cy - tile // 2 + tile],
        radius=radius, fill=255)
    img = Image.composite(img, Image.new('RGB', (w, h), BG), mask)

    d = ImageDraw.Draw(img)
    d.polygon(heart_points(cx, cy + tile * 0.04, tile * 0.56), fill=WHITE)

    # 应用名
    size = max(18, int(w * 0.055))
    try:
        font = ImageFont.truetype(FONT_BOLD, size)
    except OSError:
        font = ImageFont.load_default()
    label = '孕期记录'
    bbox = d.textbbox((0, 0), label, font=font)
    tw = bbox[2] - bbox[0]
    d.text((cx - tw // 2, cy + tile // 2 + int(h * 0.035)), label, font=font, fill=TEXT)

    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for cw, ch, dpr in DEVICES:
        w, h = cw * dpr, ch * dpr
        name = f'apple-splash-{cw * dpr}x{ch * dpr}.png'
        make_splash(w, h).save(os.path.join(OUT, name), optimize=True)
        print(name, os.path.getsize(os.path.join(OUT, name)), 'bytes')


if __name__ == '__main__':
    main()
