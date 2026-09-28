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

f_title = ImageFont.truetype(FONT_BOLD, 46)
f_h2 = ImageFont.truetype(FONT_BOLD, 28)
f_h3 = ImageFont.truetype(FONT_BOLD, 22)
f_text = ImageFont.truetype(FONT_REG, 20)
f_data = ImageFont.truetype(FONT_BOLD, 32)
f_caption = ImageFont.truetype(FONT_BOLD, 30)
f_tag = ImageFont.truetype(FONT_BOLD, 18)

# Base skies
def make_sunset_sky():
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    y = np.linspace(0, 1, H)
    r = np.zeros(H, dtype=np.float32)
    g = np.zeros(H, dtype=np.float32)
    b = np.zeros(H, dtype=np.float32)
    
    m1 = y <= 0.45
    f1 = y[m1] / 0.45
    r[m1] = 8 * (1-f1) + 40 * f1
    g[m1] = 12 * (1-f1) + 26 * f1
    b[m1] = 30 * (1-f1) + 65 * f1
    
    m2 = (y > 0.45) & (y <= 0.76)
    f2 = (y[m2] - 0.45) / 0.31
    r[m2] = 40 * (1-f2) + 245 * f2
    g[m2] = 26 * (1-f2) + 110 * f2
    b[m2] = 65 * (1-f2) + 40 * f2
    
    m3 = y > 0.76
    f3 = (y[m3] - 0.76) / 0.24
    r[m3] = 245 * (1-f3) + 255 * f3
    g[m3] = 110 * (1-f3) + 190 * f3
    b[m3] = 40 * (1-f3) + 85 * f3
    
    sky[:, :, 0] = np.tile(r[:, None], (1, W))
    sky[:, :, 1] = np.tile(g[:, None], (1, W))
    sky[:, :, 2] = np.tile(b[:, None], (1, W))
    return sky

def make_space_sky():
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    y = np.linspace(0, 1, H)
    earth_glow = np.clip(np.exp((y - 0.65) * 5.5) * 115.0, 0, 240)
    sky[:, :, 0] = np.tile((earth_glow * 0.12)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 1] = np.tile((earth_glow * 0.45)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 2] = np.tile((earth_glow * 0.95)[:, None], (1, W)).astype(np.uint8)
    np.random.seed(101)
    sx = np.random.randint(0, W, 280)
    sy = np.random.randint(0, int(H * 0.72), 280)
    b_val = np.random.randint(120, 255, 280)
    for i in range(280):
        sky[sy[i], sx[i]] = [b_val[i], b_val[i], min(255, b_val[i]+20)]
    return sky

sunset_sky_base = make_sunset_sky()
space_sky_base = make_space_sky()

def draw_hud(draw, x, y, w, h, title, lines):
    # Semi-transparent high-tech info panel
    draw.rectangle([x, y, x + w, y + h], fill=(10, 16, 26, 210), outline=(0, 210, 255, 160), width=2)
    # Corners
    c = 10
    draw.line([(x, y), (x + c, y)], fill=(0, 255, 255, 255), width=3)
    draw.line([(x, y), (x, y + c)], fill=(0, 255, 255, 255), width=3)
    draw.line([(x + w, y), (x + w - c, y)], fill=(0, 255, 255, 255), width=3)
    draw.line([(x + w, y), (x + w, y + c)], fill=(0, 255, 255, 255), width=3)
    draw.line([(x, y + h), (x + c, y + h)], fill=(0, 255, 255, 255), width=3)
    draw.line([(x, y + h), (x, y + h - c)], fill=(0, 255, 255, 255), width=3)
    draw.line([(x + w, y + h), (x + w - c, y + h)], fill=(0, 255, 255, 255), width=3)
    draw.line([(x + w, y + h), (x + w, y + h - c)], fill=(0, 255, 255, 255), width=3)
    
    draw.text((x + 16, y + 14), title, font=f_h3, fill=(0, 235, 255))
    draw.line([(x + 16, y + 42), (x + w - 16, y + 42)], fill=(0, 210, 255, 90), width=1)
    
    curr_y = y + 50
    for l in lines:
        draw.text((x + 16, curr_y), l, font=f_text, fill=(210, 225, 240))
        curr_y += 28

def draw_bottom_caption(draw, text):
    if not text:
        return
    bbox = draw.textbbox((0, 0), text, font=f_caption)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 32, 14
    cx = W // 2
    by = H - 95
    draw.rectangle([cx - tw//2 - pad_x, by - pad_y, cx + tw//2 + pad_x, by + th + pad_y], 
                   fill=(8, 12, 20, 225), outline=(255, 195, 45, 180), width=1)
    # Accent mini notch
    draw.rectangle([cx - tw//2 - pad_x, by - pad_y, cx - tw//2 - pad_x + 6, by + th + pad_y], fill=(255, 195, 45, 255))
    draw.text((cx - tw//2, by - 2), text, font=f_caption, fill=(255, 255, 255))

def draw_top_header(draw, title_str, tag_str="SPACEX STARSHIP V3 PROGRAM"):
    draw.rectangle([60, 45, 60 + 8, 45 + 50], fill=(0, 210, 255, 255))
    draw.text((78, 42), tag_str, font=f_tag, fill=(0, 210, 255))
    draw.text((78, 64), title_str, font=f_title, fill=(255, 255, 255))

print("Render helper functions ready.")
