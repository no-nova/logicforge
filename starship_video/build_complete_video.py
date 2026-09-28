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

f_title = ImageFont.truetype(FONT_BOLD, 44)
f_h2 = ImageFont.truetype(FONT_BOLD, 28)
f_sub = ImageFont.truetype(FONT_BOLD, 30)
f_tag = ImageFont.truetype(FONT_BOLD, 18)
f_tech = ImageFont.truetype(FONT_REG, 20)
f_mono = ImageFont.truetype(FONT_BOLD, 22)
f_quote = ImageFont.truetype(FONT_REG, 26)

# Precompute Base Sunset & Space skies
def make_sky_sunset():
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    y = np.linspace(0, 1, H)
    r = np.zeros(H, dtype=np.float32)
    g = np.zeros(H, dtype=np.float32)
    b = np.zeros(H, dtype=np.float32)
    
    m1 = y <= 0.42
    f1 = y[m1] / 0.42
    r[m1] = 8 * (1-f1) + 40 * f1
    g[m1] = 12 * (1-f1) + 26 * f1
    b[m1] = 32 * (1-f1) + 65 * f1
    
    m2 = (y > 0.42) & (y <= 0.72)
    f2 = (y[m2] - 0.42) / 0.30
    r[m2] = 40 * (1-f2) + 240 * f2
    g[m2] = 26 * (1-f2) + 105 * f2
    b[m2] = 65 * (1-f2) + 45 * f2
    
    m3 = y > 0.72
    f3 = (y[m3] - 0.72) / 0.28
    r[m3] = 240 * (1-f3) + 255 * f3
    g[m3] = 105 * (1-f3) + 195 * f3
    b[m3] = 45 * (1-f3) + 85 * f3
    
    sky[:, :, 0] = np.tile(r[:, None], (1, W))
    sky[:, :, 1] = np.tile(g[:, None], (1, W))
    sky[:, :, 2] = np.tile(b[:, None], (1, W))
    
    # Ground & Sea at bottom 20%
    sea_h = int(H * 0.18)
    sea_y_start = H - sea_h
    sy = np.linspace(0, 1, sea_h)[:, None]
    sea_r = (30 * (1-sy) + 15 * sy).astype(np.uint8)
    sea_g = (45 * (1-sy) + 25 * sy).astype(np.uint8)
    sea_b = (65 * (1-sy) + 40 * sy).astype(np.uint8)
    sky[sea_y_start:, :, 0] = sea_r
    sky[sea_y_start:, :, 1] = sea_g
    sky[sea_y_start:, :, 2] = sea_b
    return sky

def make_sky_space():
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    # Earth limb curvature at bottom
    y = np.linspace(0, 1, H)
    earth_glow = np.clip(np.exp((y - 0.65) * 5.5) * 110.0, 0, 240)
    sky[:, :, 0] = np.tile((earth_glow * 0.12)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 1] = np.tile((earth_glow * 0.45)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 2] = np.tile((earth_glow * 0.95)[:, None], (1, W)).astype(np.uint8)
    # Stars
    np.random.seed(101)
    sx = np.random.randint(0, W, 260)
    sy = np.random.randint(0, int(H * 0.72), 260)
    b_val = np.random.randint(120, 255, 260)
    for i in range(260):
        sky[sy[i], sx[i]] = [b_val[i], b_val[i], min(255, b_val[i]+20)]
    return sky

print("Skies generated.")
