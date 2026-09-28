import numpy as np
import math
import time
from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080
FONT_PATH_BOLD = "/home/user/fonts/NotoSansSC-Bold.otf"
FONT_PATH_REG = "/home/user/fonts/NotoSansSC-Regular.otf"

font_title = ImageFont.truetype(FONT_PATH_BOLD, 46)
font_subtitle = ImageFont.truetype(FONT_PATH_BOLD, 26)
font_body = ImageFont.truetype(FONT_PATH_REG, 22)
font_tech = ImageFont.truetype(FONT_PATH_BOLD, 20)
font_metric_val = ImageFont.truetype(FONT_PATH_BOLD, 36)
font_metric_lbl = ImageFont.truetype(FONT_PATH_REG, 16)
font_subtitles_narration = ImageFont.truetype(FONT_PATH_BOLD, 32)

def rotate_y(pts, angle_rad):
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    rot = np.array([
        [cos_a, 0, sin_a],
        [0, 1, 0],
        [-sin_a, 0, cos_a]
    ], dtype=np.float32)
    return pts @ rot.T

def rotate_x(pts, angle_rad):
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    rot = np.array([
        [1, 0, 0],
        [0, cos_a, -sin_a],
        [0, sin_a, cos_a]
    ], dtype=np.float32)
    return pts @ rot.T

def rotate_z(pts, angle_rad):
    cos_a = math.cos(angle_rad)
    sin_a = math.sin(angle_rad)
    rot = np.array([
        [cos_a, -sin_a, 0],
        [sin_a, cos_a, 0],
        [0, 0, 1]
    ], dtype=np.float32)
    return pts @ rot.T

def project(pts, cam_pos, fov_scale=1100.0, center_x=960, center_y=540):
    # pts: Nx3
    # cam_pos: [cx, cy, cz]
    rel = pts - cam_pos
    # Camera looks along -Z (or positive Z with rel[:, 2])
    # Let's say cam looks towards z=0 from cz
    # Depth d = cam_pos[2] - pts[:, 2]
    # For standard perspective:
    z = rel[:, 2]
    # Avoid div by zero
    z_safe = np.where(z <= 1.0, 1.0, z)
    sx = center_x + (rel[:, 0] / z_safe) * fov_scale
    sy = center_y - (rel[:, 1] / z_safe) * fov_scale
    return sx, sy, z

print("Camera and projection math ready.")
