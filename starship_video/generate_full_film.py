import numpy as np
import math
import os
import subprocess
import time
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FPS = 30
TOTAL_DURATION = 62.0
TOTAL_FRAMES = int(FPS * TOTAL_DURATION) # 1860 frames

FONT_BOLD = "/home/user/fonts/NotoSansSC-Bold.otf"
FONT_REG = "/home/user/fonts/NotoSansSC-Regular.otf"

f_main_title = ImageFont.truetype(FONT_BOLD, 46)
f_sub_title = ImageFont.truetype(FONT_BOLD, 26)
f_h3 = ImageFont.truetype(FONT_BOLD, 22)
f_text = ImageFont.truetype(FONT_REG, 20)
f_data = ImageFont.truetype(FONT_BOLD, 32)
f_caption = ImageFont.truetype(FONT_BOLD, 32)

def draw_hud_box(draw, x, y, w, h, title="", subtitle=""):
    # Semi-transparent dark slate tech card
    # In PIL draw rectangle with outline
    draw.rectangle([x, y, x + w, y + h], fill=(12, 18, 28, 220), outline=(0, 210, 255, 180), width=2)
    # Corner brackets
    c_len = 12
    draw.line([(x, y), (x + c_len, y)], fill=(0, 240, 255, 255), width=3)
    draw.line([(x, y), (x, y + c_len)], fill=(0, 240, 255, 255), width=3)
    draw.line([(x + w, y), (x + w - c_len, y)], fill=(0, 240, 255, 255), width=3)
    draw.line([(x + w, y), (x + w, y + c_len)], fill=(0, 240, 255, 255), width=3)
    draw.line([(x, y + h), (x + c_len, y + h)], fill=(0, 240, 255, 255), width=3)
    draw.line([(x, y + h), (x, y + h - c_len)], fill=(0, 240, 255, 255), width=3)
    draw.line([(x + w, y + h), (x + w - c_len, y + h)], fill=(0, 240, 255, 255), width=3)
    draw.line([(x + w, y + h), (x + w, y + h - c_len)], fill=(0, 240, 255, 255), width=3)
    
    if title:
        draw.text((x + 18, y + 14), title, font=f_h3, fill=(0, 225, 255))
    if subtitle:
        draw.text((x + 18, y + 42), subtitle, font=f_text, fill=(200, 220, 240))

def draw_caption_bar(draw, text):
    # Centered bottom subtitle bar
    bbox = draw.textbbox((0, 0), text, font=f_caption)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 30, 14
    cx = W // 2
    by = H - 90
    draw.rectangle([cx - tw//2 - pad_x, by - pad_y, cx + tw//2 + pad_x, by + th + pad_y], 
                   fill=(10, 14, 22, 220), outline=(255, 200, 50, 160), width=1)
    draw.text((cx - tw//2, by - 2), text, font=f_caption, fill=(255, 255, 255))

print("HUD helper verified.")
