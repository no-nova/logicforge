import numpy as np
import math
import time
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080

def get_sunset_sky(W, H, sun_boost=0.0):
    y = np.linspace(0, 1, H)
    r = np.zeros(H, dtype=np.float32)
    g = np.zeros(H, dtype=np.float32)
    b = np.zeros(H, dtype=np.float32)
    
    m1 = y <= 0.45
    f1 = y[m1] / 0.45
    r[m1] = 6 * (1-f1) + 35 * f1
    g[m1] = 10 * (1-f1) + 22 * f1
    b[m1] = 25 * (1-f1) + 55 * f1
    
    m2 = (y > 0.45) & (y <= 0.75)
    f2 = (y[m2] - 0.45) / 0.30
    r[m2] = 35 * (1-f2) + 230 * f2
    g[m2] = 22 * (1-f2) + 90 * f2
    b[m2] = 55 * (1-f2) + 38 * f2
    
    m3 = y > 0.75
    f3 = (y[m3] - 0.75) / 0.25
    r[m3] = 230 * (1-f3) + 255 * f3
    g[m3] = 90 * (1-f3) + 180 * f3
    b[m3] = 38 * (1-f3) + 80 * f3
    
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    sky[:, :, 0] = np.tile(r[:, None], (1, W))
    sky[:, :, 1] = np.tile(g[:, None], (1, W))
    sky[:, :, 2] = np.tile(b[:, None], (1, W))
    return sky

def get_space_sky(W, H):
    # Deep space with blue atmospheric curvature edge
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    y = np.linspace(0, 1, H)
    # Earth curvature glow at the bottom
    earth_glow = np.clip(np.exp((y - 0.7) * 6.0) * 120.0, 0, 220)
    sky[:, :, 0] = np.tile((earth_glow * 0.15)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 1] = np.tile((earth_glow * 0.50)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 2] = np.tile((earth_glow * 1.00)[:, None], (1, W)).astype(np.uint8)
    # Add starfield
    np.random.seed(42)
    sx = np.random.randint(0, W, 200)
    sy = np.random.randint(0, int(H * 0.75), 200)
    b_val = np.random.randint(140, 255, 200)
    for i in range(200):
        sky[sy[i], sx[i]] = [b_val[i], b_val[i], b_val[i]]
    return sky

def create_cylinder_mesh(r_top, r_bot, height, segments=24, y_offset=0.0):
    verts = []
    faces = []
    # 2 rings: bottom and top
    for s in range(segments):
        ang = s * 2.0 * math.pi / segments
        verts.append([r_bot * math.cos(ang), y_offset - height/2.0, r_bot * math.sin(ang)])
    for s in range(segments):
        ang = s * 2.0 * math.pi / segments
        verts.append([r_top * math.cos(ang), y_offset + height/2.0, r_top * math.sin(ang)])
    
    verts = np.array(verts, dtype=np.float32)
    for s in range(segments):
        s_next = (s + 1) % segments
        faces.append([s, s_next, segments + s_next, segments + s])
    return verts, faces

def create_nosecone_mesh(r_base, height, segments=24, y_offset=0.0):
    verts = []
    faces = []
    # 3 intermediate rings for smooth ogive curve
    levels = 4
    for lvl in range(levels):
        frac = lvl / float(levels) # 0 to 0.75
        y = y_offset - height/2.0 + frac * height
        r = r_base * math.sqrt(max(0.0, 1.0 - (frac)**1.6))
        for s in range(segments):
            ang = s * 2.0 * math.pi / segments
            verts.append([r * math.cos(ang), y, r * math.sin(ang)])
    # Apex tip vertex
    apex_idx = len(verts)
    verts.append([0.0, y_offset + height/2.0, 0.0])
    verts = np.array(verts, dtype=np.float32)
    
    for lvl in range(levels - 1):
        for s in range(segments):
            s_next = (s + 1) % segments
            v1 = lvl * segments + s
            v2 = lvl * segments + s_next
            v3 = (lvl + 1) * segments + s_next
            v4 = (lvl + 1) * segments + s
            faces.append([v1, v2, v3, v4])
    # Apex triangles
    top_ring = (levels - 1) * segments
    for s in range(segments):
        s_next = (s + 1) % segments
        faces.append([top_ring + s, top_ring + s_next, apex_idx])
        
    return verts, faces

print("Mesh generators defined successfully.")
