import numpy as np
import math
from PIL import Image, ImageDraw, ImageFont

def create_cylinder_mesh(r_top, r_bot, height, segments=36, height_segments=5):
    # vertices: Nx3, faces: Mx4
    verts = []
    # y ranges from -height/2 to height/2
    for h_idx in range(height_segments + 1):
        frac = h_idx / height_segments
        y = -height/2.0 + frac * height
        r = r_bot + frac * (r_top - r_bot)
        for s in range(segments):
            angle = s * 2.0 * math.pi / segments
            x = r * math.cos(angle)
            z = r * math.sin(angle)
            verts.append([x, y, z])
    verts = np.array(verts, dtype=np.float32)
    
    faces = []
    for h_idx in range(height_segments):
        for s in range(segments):
            s_next = (s + 1) % segments
            v1 = h_idx * segments + s
            v2 = h_idx * segments + s_next
            v3 = (h_idx + 1) * segments + s_next
            v4 = (h_idx + 1) * segments + s
            faces.append([v1, v2, v3, v4])
    return verts, faces

v, f = create_cylinder_mesh(4.5, 4.5, 70.0, 24, 4)
print(f"Generated mesh with {len(v)} vertices and {len(f)} quads.")
