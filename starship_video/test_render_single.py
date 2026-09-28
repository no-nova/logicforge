import numpy as np
import math
import time
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080

def get_sunset_sky(W, H):
    # Vectorized gradient
    y = np.linspace(0, 1, H)
    
    r = np.zeros(H, dtype=np.float32)
    g = np.zeros(H, dtype=np.float32)
    b = np.zeros(H, dtype=np.float32)
    
    # 0 to 0.45: space to twilight
    m1 = y <= 0.45
    f1 = y[m1] / 0.45
    r[m1] = 8 * (1-f1) + 40 * f1
    g[m1] = 12 * (1-f1) + 25 * f1
    b[m1] = 28 * (1-f1) + 65 * f1
    
    # 0.45 to 0.75: twilight to magenta/amber
    m2 = (y > 0.45) & (y <= 0.75)
    f2 = (y[m2] - 0.45) / 0.30
    r[m2] = 40 * (1-f2) + 235 * f2
    g[m2] = 25 * (1-f2) + 95 * f2
    b[m2] = 65 * (1-f2) + 45 * f2
    
    # 0.75 to 1.0: amber to bright golden horizon
    m3 = y > 0.75
    f3 = (y[m3] - 0.75) / 0.25
    r[m3] = 235 * (1-f3) + 255 * f3
    g[m3] = 95 * (1-f3) + 185 * f3
    b[m3] = 45 * (1-f3) + 90 * f3
    
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    sky[:, :, 0] = np.tile(r[:, None], (1, W))
    sky[:, :, 1] = np.tile(g[:, None], (1, W))
    sky[:, :, 2] = np.tile(b[:, None], (1, W))
    return sky

t0 = time.time()
sky_img = get_sunset_sky(W, H)
t1 = time.time()
print(f"Sky generation took: {t1-t0:.4f}s")
im = Image.fromarray(sky_img)
im.save("/home/user/logicforge/starship_video/test_sky.jpg", quality=90)
print("Saved test_sky.jpg")
