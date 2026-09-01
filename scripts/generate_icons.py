# -*- coding: utf-8 -*-
"""Генерация иконок LÉZARD TEXTE: вертикальный глаз ящера.

Тёмный фон, зелёный вертикальный зрачок, без текста.
"""
from PIL import Image, ImageDraw
import os

SIZES = {
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192,
}

BASE = 1024
BG = (14, 15, 13, 255)          # #0E0F0D графит
BG2 = (16, 18, 14, 255)         # внутренний фон глаза
OUTLINE = (110, 155, 31, 255)   # #6E9B1F оливковый
PUPIL = (167, 226, 46, 255)     # #A7E22E ядовито-зелёный
PUPIL_DARK = (95, 140, 20, 255)


def draw_eye(img, round_mask=False):
    d = ImageDraw.Draw(img)
    # фон
    d.rectangle([0, 0, BASE, BASE], fill=BG)
    cx = cy = BASE // 2
    rx, ry = 300, 250
    # глаз (альмонд / вертикальный овал)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=BG2, outline=OUTLINE, width=26)
    d.ellipse([cx - rx + 26, cy - ry + 26, cx + rx - 26, cy + ry - 26], fill=BG2)
    # вертикальный зрачок
    pw, ph = 128, 380
    d.rounded_rectangle(
        [cx - pw // 2, cy - ph // 2, cx + pw // 2, cy + ph // 2],
        radius=pw // 2,
        fill=PUPIL,
    )
    # тонкая тёмная щель сверху/снизу зрачка для глубины
    d.rounded_rectangle(
        [cx - pw // 4, cy - ph // 2 + 6, cx + pw // 4, cy + ph // 2 - 6],
        radius=pw // 4,
        fill=PUPIL_DARK,
    )
    if round_mask:
        mask = Image.new('L', (BASE, BASE), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, BASE, BASE], fill=255)
        img.putalpha(mask)
    return img


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)  # корень проекта
    res = os.path.join(root, 'android', 'app', 'src', 'main', 'res')

    for density, size in SIZES.items():
        mip = os.path.join(res, f'mipmap-{density}')
        os.makedirs(mip, exist_ok=True)
        img = draw_eye(Image.new('RGBA', (BASE, BASE))).resize(
            (size, size), Image.LANCZOS
        )
        img.save(os.path.join(mip, 'ic_launcher.png'))
        img_round = draw_eye(Image.new('RGBA', (BASE, BASE)), round_mask=True).resize(
            (size, size), Image.LANCZOS
        )
        img_round.save(os.path.join(mip, 'ic_launcher_round.png'))
        print(f'{density}: {size}px OK')


if __name__ == '__main__':
    main()
