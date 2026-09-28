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

f_title = ImageFont.truetype(FONT_BOLD, 42)
f_h2 = ImageFont.truetype(FONT_BOLD, 26)
f_h3 = ImageFont.truetype(FONT_BOLD, 22)
f_text = ImageFont.truetype(FONT_REG, 20)
f_metric = ImageFont.truetype(FONT_BOLD, 30)
f_caption = ImageFont.truetype(FONT_BOLD, 28)
f_tag = ImageFont.truetype(FONT_BOLD, 16)

# Atmospheric Sunset Sky
def make_sunset_sky():
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    y = np.linspace(0, 1, H)
    r = np.zeros(H, dtype=np.float32)
    g = np.zeros(H, dtype=np.float32)
    b = np.zeros(H, dtype=np.float32)
    
    m1 = y <= 0.42
    f1 = y[m1] / 0.42
    r[m1] = 12 * (1-f1) + 48 * f1
    g[m1] = 16 * (1-f1) + 32 * f1
    b[m1] = 38 * (1-f1) + 75 * f1
    
    m2 = (y > 0.42) & (y <= 0.74)
    f2 = (y[m2] - 0.42) / 0.32
    r[m2] = 48 * (1-f2) + 248 * f2
    g[m2] = 32 * (1-f2) + 118 * f2
    b[m2] = 75 * (1-f2) + 42 * f2
    
    m3 = y > 0.74
    f3 = (y[m3] - 0.74) / 0.26
    r[m3] = 248 * (1-f3) + 255 * f3
    g[m3] = 118 * (1-f3) + 195 * f3
    b[m3] = 42 * (1-f3) + 95 * f3
    
    sky[:, :, 0] = np.tile(r[:, None], (1, W))
    sky[:, :, 1] = np.tile(g[:, None], (1, W))
    sky[:, :, 2] = np.tile(b[:, None], (1, W))
    return sky

# Deep Space with Atmospheric Limb Sky
def make_space_sky():
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    y = np.linspace(0, 1, H)
    earth_glow = np.clip(np.exp((y - 0.62) * 5.8) * 125.0, 0, 240)
    sky[:, :, 0] = np.tile((earth_glow * 0.14)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 1] = np.tile((earth_glow * 0.50)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 2] = np.tile((earth_glow * 1.00)[:, None], (1, W)).astype(np.uint8)
    np.random.seed(101)
    sx = np.random.randint(0, W, 320)
    sy = np.random.randint(0, int(H * 0.70), 320)
    b_val = np.random.randint(120, 255, 320)
    for i in range(320):
        sky[sy[i], sx[i]] = [b_val[i], b_val[i], min(255, b_val[i]+25)]
    return sky

# Deep Space without Earth for Mars Scene
def make_deep_space_sky():
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    np.random.seed(202)
    sx = np.random.randint(0, W, 450)
    sy = np.random.randint(0, H, 450)
    b_val = np.random.randint(130, 255, 450)
    for i in range(450):
        sky[sy[i], sx[i]] = [b_val[i], b_val[i], min(255, b_val[i]+20)]
    return sky

sunset_sky_base = make_sunset_sky()
space_sky_base = make_space_sky()
deep_space_sky_base = make_deep_space_sky()

def draw_hud(draw, x, y, w, h, title, lines):
    # SpaceX Flight Display Card
    draw.rectangle([x, y, x + w, y + h], fill=(10, 16, 26), outline=(0, 210, 255), width=2)
    c = 10
    draw.line([(x, y), (x + c, y)], fill=(0, 255, 255), width=3)
    draw.line([(x, y), (x, y + c)], fill=(0, 255, 255), width=3)
    draw.line([(x + w, y), (x + w - c, y)], fill=(0, 255, 255), width=3)
    draw.line([(x + w, y), (x + w, y + c)], fill=(0, 255, 255), width=3)
    draw.line([(x, y + h), (x + c, y + h)], fill=(0, 255, 255), width=3)
    draw.line([(x, y + h), (x, y + h - c)], fill=(0, 255, 255), width=3)
    draw.line([(x + w, y + h), (x + w - c, y + h)], fill=(0, 255, 255), width=3)
    draw.line([(x + w, y + h), (x + w, y + h - c)], fill=(0, 255, 255), width=3)
    
    draw.text((x + 18, y + 14), title, font=f_h3, fill=(0, 235, 255))
    draw.line([(x + 18, y + 44), (x + w - 18, y + 44)], fill=(0, 180, 230), width=1)
    
    curr_y = y + 54
    for l in lines:
        draw.text((x + 18, curr_y), l, font=f_text, fill=(215, 230, 245))
        curr_y += 30

def draw_bottom_caption(draw, text):
    if not text:
        return
    bbox = draw.textbbox((0, 0), text, font=f_caption)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pad_x, pad_y = 32, 14
    cx = W // 2
    by = H - 92
    draw.rectangle([cx - tw//2 - pad_x, by - pad_y, cx + tw//2 + pad_x, by + th + pad_y], 
                   fill=(8, 12, 20), outline=(255, 195, 45), width=1)
    draw.rectangle([cx - tw//2 - pad_x, by - pad_y, cx - tw//2 - pad_x + 6, by + th + pad_y], fill=(255, 195, 45))
    draw.text((cx - tw//2, by - 2), text, font=f_caption, fill=(255, 255, 255))

def draw_top_header(draw, title_str, tag_str="SPACEX STARSHIP V3 PROGRAM"):
    draw.rectangle([60, 45, 60 + 8, 45 + 50], fill=(0, 210, 255))
    draw.text((78, 42), tag_str, font=f_tag, fill=(0, 210, 255))
    draw.text((78, 64), title_str, font=f_title, fill=(255, 255, 255))

# High-Detail Rocket Renderer Helper
def draw_detailed_rocket_stack(draw, rx, base_y, scale=1.0):
    # scale 1.0: height ~760px
    # base_y is where the booster engines sit
    bw = int(36 * scale) # booster half-width
    sh_h = int(410 * scale) # booster height
    sh_top = base_y - sh_h
    
    # 1. Booster Raptor Engines at bottom
    for ex in range(rx - bw + 6, rx + bw - 4, int(10 * scale)):
        draw.polygon([(ex, base_y), (ex + int(8*scale), base_y), (ex + int(6*scale), base_y - int(14*scale)), (ex + int(2*scale), base_y - int(14*scale))], fill=(60, 65, 75))
    
    # 2. Super Heavy Booster Tank Body (Stainless Steel 304L with 3D gradient shading)
    # Body
    for col in range(rx - bw, rx + bw):
        norm = (col - (rx - bw)) / (2.0 * bw) # 0 to 1
        # Cylindrical lighting cosine highlight near center-left (norm ~ 0.35)
        bright = 160 + int(90 * math.cos((norm - 0.35) * math.pi))
        draw.line([col, sh_top, col, base_y], fill=(bright, bright + 5, bright + 12), width=1)
    draw.rectangle([rx - bw, sh_top, rx + bw, base_y], outline=(100, 110, 125), width=2)
    
    # Weld Rings along Booster
    weld_step = int(35 * scale)
    for wy in range(sh_top + weld_step, base_y, weld_step):
        draw.line([rx - bw, wy, rx + bw, wy], fill=(120, 130, 145), width=1)
        
    # Grid Fins (4 welded titanium grid fins near top)
    g_w = int(22 * scale)
    g_h = int(24 * scale)
    # Left grid fin
    draw.rectangle([rx - bw - g_w, sh_top + int(12*scale), rx - bw, sh_top + int(12*scale) + g_h], fill=(45, 50, 60), outline=(20, 22, 28), width=2)
    draw.line([rx - bw - g_w//2, sh_top + int(12*scale), rx - bw - g_w//2, sh_top + int(12*scale) + g_h], fill=(80, 85, 95), width=1)
    # Right grid fin
    draw.rectangle([rx + bw, sh_top + int(12*scale), rx + bw + g_w, sh_top + int(12*scale) + g_h], fill=(45, 50, 60), outline=(20, 22, 28), width=2)
    draw.line([rx + bw + g_w//2, sh_top + int(12*scale), rx + bw + g_w//2, sh_top + int(12*scale) + g_h], fill=(80, 85, 95), width=1)
    
    # Catch Pins (Hard points for chopsticks)
    draw.rectangle([rx - bw - int(10*scale), sh_top + int(42*scale), rx - bw, sh_top + int(52*scale)], fill=(255, 205, 30))
    draw.rectangle([rx + bw, sh_top + int(42*scale), rx + bw + int(10*scale), sh_top + int(52*scale)], fill=(255, 205, 30))
    
    # 3. Hot-Staging Interstage Ring (Vented)
    ring_h = int(30 * scale)
    ring_top = sh_top - ring_h
    draw.rectangle([rx - bw, ring_top, rx + bw, sh_top], fill=(55, 60, 70), outline=(160, 170, 185), width=2)
    # Vents
    vent_step = int(8 * scale)
    for vx in range(rx - bw + int(6*scale), rx + bw - int(4*scale), vent_step):
        draw.line([vx, ring_top + int(5*scale), vx, sh_top - int(5*scale)], fill=(20, 24, 30), width=int(3*scale))
        
    # 4. Starship Upper Stage (Ship V3)
    ship_h = int(340 * scale)
    ship_top = ring_top - ship_h
    ship_cyl_h = int(200 * scale)
    ship_cyl_top = ring_top - ship_cyl_h
    
    # Ship Cylindrical Section (Left half stainless steel, Right half Hexagonal Heat Shield)
    # Left Steel side
    for col in range(rx - bw, rx):
        norm = (col - (rx - bw)) / float(bw)
        bright = 175 + int(75 * math.cos((norm - 0.6) * math.pi * 0.5))
        draw.line([col, ship_cyl_top, col, ring_top], fill=(bright, bright + 5, bright + 10), width=1)
    # Right TPS side (Black ceramic tiles)
    draw.rectangle([rx, ship_cyl_top, rx + bw, ring_top], fill=(24, 26, 30))
    # Tile seam highlights
    for ty in range(ship_cyl_top, ring_top, int(20*scale)):
        draw.line([rx, ty, rx + bw, ty], fill=(42, 45, 52), width=1)
    draw.rectangle([rx - bw, ship_cyl_top, rx + bw, ring_top], outline=(100, 110, 125), width=2)
    
    # Ship Nosecone (Aerodynamic Ogive)
    # Steel side
    nose_pts_steel = [(rx - bw, ship_cyl_top), (rx, ship_cyl_top), (rx, ship_top)]
    draw.polygon(nose_pts_steel, fill=(220, 228, 238), outline=(130, 140, 155))
    # TPS side
    nose_pts_tps = [(rx, ship_cyl_top), (rx + bw, ship_cyl_top), (rx, ship_top)]
    draw.polygon(nose_pts_tps, fill=(24, 26, 30), outline=(130, 140, 155))
    
    # 5. Starship Aerodynamic Control Flaps
    # Forward Flaps (V3 redesigned forward flaps - shifted leeward and more compact)
    ff_y = ship_cyl_top + int(25 * scale)
    draw.polygon([(rx - bw - int(18*scale), ff_y + int(15*scale)), (rx - bw, ff_y), (rx - bw, ff_y + int(45*scale))], fill=(40, 45, 55), outline=(20, 24, 30), width=1)
    draw.polygon([(rx + bw + int(18*scale), ff_y + int(15*scale)), (rx + bw, ff_y), (rx + bw, ff_y + int(45*scale))], fill=(24, 26, 30), outline=(15, 18, 22), width=1)
    
    # Aft Flaps (Large bottom control fins)
    af_y = ring_top - int(60 * scale)
    draw.polygon([(rx - bw - int(28*scale), af_y + int(45*scale)), (rx - bw, af_y), (rx - bw, ring_top - int(10*scale))], fill=(40, 45, 55), outline=(20, 24, 30), width=1)
    draw.polygon([(rx + bw + int(28*scale), af_y + int(45*scale)), (rx + bw, af_y), (rx + bw, ring_top - int(10*scale))], fill=(24, 26, 30), outline=(15, 18, 22), width=1)

def render_frame_v2(frame_idx):
    t_sec = frame_idx / float(FPS)
    
    if 21.0 <= t_sec < 41.8:
        base_arr = space_sky_base.copy()
    elif t_sec >= 52.88:
        base_arr = deep_space_sky_base.copy()
    else:
        base_arr = sunset_sky_base.copy()
        
    img = Image.fromarray(base_arr)
    draw = ImageDraw.Draw(img)
    
    # ====================================================
    # SCENE 1: Pad & Architecture (0.0s - 10.1s)
    # ====================================================
    if t_sec < 10.1:
        # Sea & Coastline
        sea_h = int(H * 0.16)
        draw.rectangle([0, H - sea_h, W, H], fill=(16, 26, 44))
        draw.line([0, H - sea_h, W, H - sea_h], fill=(245, 185, 95), width=2)
        # Pad Berm & Concrete Ground
        draw.polygon([(360, H), (580, H - sea_h), (1340, H - sea_h), (1560, H)], fill=(24, 30, 38))
        
        # Mechazilla Launch Tower
        tower_x = 760
        tower_bot = H - sea_h
        tower_top = 110
        draw.rectangle([tower_x - 34, tower_top, tower_x + 34, tower_bot], fill=(42, 46, 56), outline=(18, 22, 28), width=2)
        # Detailed lattice trusses
        for ty in range(tower_top, tower_bot, 40):
            draw.line([tower_x - 34, ty, tower_x + 34, ty + 40], fill=(68, 74, 86), width=2)
            draw.line([tower_x + 34, ty, tower_x - 34, ty + 40], fill=(68, 74, 86), width=2)
            draw.line([tower_x - 34, ty, tower_x + 34, ty], fill=(55, 60, 72), width=1)
            
        # Chopsticks Carriage and Arms resting beside rocket
        carriage_y = 360
        draw.rectangle([tower_x - 40, carriage_y, tower_x + 40, carriage_y + 110], fill=(28, 32, 40), outline=(0, 210, 255), width=2)
        draw.polygon([(tower_x + 36, carriage_y + 15), (tower_x + 195, carriage_y + 40), (tower_x + 195, carriage_y + 55), (tower_x + 36, carriage_y + 35)], fill=(35, 38, 46), outline=(0, 190, 240), width=1)
        draw.polygon([(tower_x + 36, carriage_y + 65), (tower_x + 195, carriage_y + 90), (tower_x + 195, carriage_y + 105), (tower_x + 36, carriage_y + 85)], fill=(32, 35, 42), outline=(0, 190, 240), width=1)
        
        # Orbital Launch Mount (OLM)
        rx = 980
        olm_bot = tower_bot
        olm_top = olm_bot - 45
        draw.polygon([(rx - 65, olm_bot), (rx - 48, olm_top), (rx + 48, olm_top), (rx + 65, olm_bot)], fill=(40, 44, 52), outline=(15, 18, 22), width=2)
        
        # Draw Rocket Stack sitting right on OLM!
        draw_detailed_rocket_stack(draw, rx=rx, base_y=olm_top, scale=1.0)
        
        # Dimension Bracket
        nose_apex = olm_top - int(780)
        draw.line([rx + 85, nose_apex, rx + 130, nose_apex], fill=(0, 220, 255), width=2)
        draw.line([rx + 85, olm_top, rx + 130, olm_top], fill=(0, 220, 255), width=2)
        draw.line([rx + 108, nose_apex, rx + 108, olm_top], fill=(0, 220, 255), width=2)
        draw.text((rx + 124, (nose_apex + olm_top)//2 - 16), "150 METERS (V3)", font=f_metric, fill=(0, 240, 255))
        
        draw_top_header(draw, "STARBASE BOKA CHIKA // 星舰基地全景", "SPACEX STARSHIP V3 • ORBITAL LAUNCH SYSTEM")
        draw_hud(draw, 70, 150, 440, 280, "V3 架构技术规范", [
            "• 组合体总高: 近 150 米 (人类史上最高)",
            "• 起飞质量: ~5,200 吨",
            "• 发动机配置: 33台 Raptor 3 猛禽引擎",
            "• 海平面推力: ~10,000+ 吨级 (近Saturn V三倍)",
            "• 主体材质: 冷轧 304L 高强度不锈钢",
            "• 任务定位: 快速完全可重复使用 / 火星殖民"
        ])
        draw_hud(draw, 1410, 150, 440, 210, "发射工位核心设施", [
            "• Mechazilla 机械臂发射捕获塔",
            "• 零下 196 度 液氧/液甲烷深冷加注",
            "• 水冷钢板火焰分流反冲系统",
            "• 快速周转目标: 数小时内再次飞行"
        ])
        draw_bottom_caption(draw, "星舰基地，总高近一百五十米的星舰V3傲立在傍晚地平线，人类文明通往火星的巨型天梯正蓄势待发。")

    # ====================================================
    # SCENE 2: Liftoff & Atmospheric Ascent (10.1s - 21.0s)
    # ====================================================
    elif t_sec < 21.0:
        rel_t = t_sec - 10.1
        frac = rel_t / 10.9
        
        rx = 960
        ry = int(840 - frac * 560) # rocket base climbs
        scale = 0.95
        
        # Super Heavy Raptor 3 Exhaust Plume (Epic mach diamond flame)
        flame_len = int(240 + 25 * math.sin(t_sec * 32))
        flame_w = int(45 * scale)
        # Orange glow
        draw.polygon([(rx - flame_w*1.8, ry + flame_len*0.8), (rx - flame_w, ry), (rx + flame_w, ry), (rx + flame_w*1.8, ry + flame_len*0.8), (rx, ry + flame_len + 30)], fill=(255, 105, 20))
        # Amber inner
        draw.polygon([(rx - flame_w, ry + flame_len*0.5), (rx - flame_w*0.8, ry), (rx + flame_w*0.8, ry), (rx + flame_w, ry + flame_len*0.5), (rx, ry + flame_len)], fill=(255, 205, 50))
        # Cyan-white hot plasma core
        draw.polygon([(rx - flame_w*0.4, ry), (rx + flame_w*0.4, ry), (rx, ry + flame_len*0.4)], fill=(230, 245, 255))
        # Mach shock diamonds
        for sd in range(1, 6):
            sdy = ry + int(sd * 38 * scale)
            draw.ellipse([rx - 12, sdy - 7, rx + 12, sdy + 7], fill=(255, 255, 255))
            
        # Draw the rocket!
        draw_detailed_rocket_stack(draw, rx=rx, base_y=ry, scale=scale)
        
        # Max-Q condensation vapor cone
        if 0.35 <= frac <= 0.75:
            cone_alpha = math.sin((frac - 0.35) / 0.40 * math.pi)
            draw.line([rx - 210, ry - int(240*scale), rx - int(36*scale), ry - int(480*scale)], fill=(255, 255, 255), width=3)
            draw.line([rx + 210, ry - int(240*scale), rx + int(36*scale), ry - int(480*scale)], fill=(255, 255, 255), width=3)
            draw.text((rx + int(36*scale) + 40, ry - int(480*scale)), "TRANSONIC // MAX-Q 动压极值", font=f_tag, fill=(0, 240, 255))
            
        alt_km = frac * 62.0
        vel_kmh = frac * 5800.0
        thrust_tf = 9800.0 - frac * 600.0
        
        draw_top_header(draw, "BOOSTER ASCENT // 超重助推升空加速", "FLIGHT PROFILE • LIFTOFF TO MAX-Q")
        draw_hud(draw, 70, 150, 420, 260, "实时遥测数据 (TELEMETRY)", [
            f"• 飞行高度 (ALT): {alt_km:.1f} KM",
            f"• 飞行速度 (VEL): {vel_kmh:.0f} KM/H (Mach {vel_kmh/1225.0:.1f})",
            f"• 实时推力 (THRUST): {thrust_tf:.0f} TON-FORCE",
            f"• 点火引擎: 33 / 33 全工况运转",
            f"• 燃烧室压力: 350 bar (Raptor 3 全流量)",
            f"• 结构加速度: {1.2 + frac*2.1:.2f} G"
        ])
        draw_hud(draw, 1430, 150, 420, 200, "全流量分级燃烧循环", [
            "• 甲烷富燃涡轮泵 + 氧富氧涡轮泵",
            "• 内部一体化3D打印冷却通道",
            "• 无外露导管，极佳空气动力学阻力",
            "• 比冲达到惊人的 350s (海平面)"
        ])
        draw_bottom_caption(draw, "三十三台猛禽三代引擎怒吼点火，超万吨推力撕裂黄昏苍穹，不锈钢巨兽以排山倒海之势直刺天际。")

    # ====================================================
    # SCENE 3: Hot-Staging Separation (21.0s - 30.25s)
    # ====================================================
    elif t_sec < 30.25:
        rel_t = t_sec - 21.0
        frac = rel_t / 9.25
        
        cx = 960
        cy = 500
        sep_gap = int(frac * 250)
        scale = 0.90
        
        # Ship Upper Stage (Top part)
        ship_base_y = cy - int(30 * scale) - sep_gap
        bw = int(36 * scale)
        ship_cyl_h = int(200 * scale)
        ship_top = ship_base_y - int(340 * scale)
        ship_cyl_top = ship_base_y - ship_cyl_h
        
        # Ship Raptor Engine Flame (6 engines blazing purple-blue vacuum exhaust)
        s_flame_len = int(180 + 15 * math.sin(t_sec * 28))
        draw.polygon([(cx - bw*0.7, ship_base_y), (cx + bw*0.7, ship_base_y), (cx + bw*1.4, ship_base_y + s_flame_len*0.8), (cx, ship_base_y + s_flame_len + 35), (cx - bw*1.4, ship_base_y + s_flame_len*0.8)], fill=(75, 145, 255))
        draw.polygon([(cx - bw*0.4, ship_base_y), (cx + bw*0.4, ship_base_y), (cx, ship_base_y + s_flame_len*0.6)], fill=(225, 240, 255))
        
        # Ship body
        for col in range(cx - bw, cx):
            norm = (col - (cx - bw)) / float(bw)
            bright = 175 + int(75 * math.cos((norm - 0.6) * math.pi * 0.5))
            draw.line([col, ship_cyl_top, col, ship_base_y], fill=(bright, bright + 5, bright + 10), width=1)
        draw.rectangle([cx, ship_cyl_top, cx + bw, ship_base_y], fill=(24, 26, 30))
        for ty in range(ship_cyl_top, ship_base_y, int(20*scale)):
            draw.line([cx, ty, cx + bw, ty], fill=(42, 45, 52), width=1)
        draw.rectangle([cx - bw, ship_cyl_top, cx + bw, ship_base_y], outline=(100, 110, 125), width=2)
        
        # Nosecone
        draw.polygon([(cx - bw, ship_cyl_top), (cx, ship_cyl_top), (cx, ship_top)], fill=(220, 228, 238), outline=(130, 140, 155))
        draw.polygon([(cx, ship_cyl_top), (cx + bw, ship_cyl_top), (cx, ship_top)], fill=(24, 26, 30), outline=(130, 140, 155))
        
        # Flaps
        ff_y = ship_cyl_top + int(25 * scale)
        draw.polygon([(cx - bw - int(18*scale), ff_y + int(15*scale)), (cx - bw, ff_y), (cx - bw, ff_y + int(45*scale))], fill=(40, 45, 55), outline=(20, 24, 30), width=1)
        draw.polygon([(cx + bw + int(18*scale), ff_y + int(15*scale)), (cx + bw, ff_y), (cx + bw, ff_y + int(45*scale))], fill=(24, 26, 30), outline=(15, 18, 22), width=1)
        af_y = ship_base_y - int(60 * scale)
        draw.polygon([(cx - bw - int(28*scale), af_y + int(45*scale)), (cx - bw, af_y), (cx - bw, ship_base_y - int(10*scale))], fill=(40, 45, 55), outline=(20, 24, 30), width=1)
        draw.polygon([(cx + bw + int(28*scale), af_y + int(45*scale)), (cx + bw, af_y), (cx + bw, ship_base_y - int(10*scale))], fill=(24, 26, 30), outline=(15, 18, 22), width=1)
        
        # Booster (Below, pitching and vented ring glowing)
        b_top = cy + int(60 * scale) + int(frac * 40)
        ring_h = int(32 * scale)
        # Hot stage ring glowing orange from ship engine blast
        draw.rectangle([cx - bw, b_top, cx + bw, b_top + ring_h], fill=(245, 125, 30), outline=(255, 215, 90), width=2)
        # Side vent plasma streams
        if frac < 0.65:
            vent_glow = int(140 * (1.0 - frac/0.65))
            draw.polygon([(cx - bw, b_top + ring_h//2), (cx - bw - vent_glow, b_top + ring_h//2 - 15), (cx - bw - vent_glow - 20, b_top + ring_h//2), (cx - bw - vent_glow, b_top + ring_h//2 + 15)], fill=(255, 150, 40))
            draw.polygon([(cx + bw, b_top + ring_h//2), (cx + bw + vent_glow, b_top + ring_h//2 - 15), (cx + bw + vent_glow + 20, b_top + ring_h//2), (cx + bw + vent_glow, b_top + ring_h//2 + 15)], fill=(255, 150, 40))
            
        # Booster body below ring
        b_body_top = b_top + ring_h
        b_bot = b_body_top + int(380 * scale)
        for col in range(cx - bw, cx + bw):
            norm = (col - (cx - bw)) / (2.0 * bw)
            bright = 160 + int(90 * math.cos((norm - 0.35) * math.pi))
            draw.line([col, b_body_top, col, b_bot], fill=(bright, bright + 5, bright + 12), width=1)
        draw.rectangle([cx - bw, b_body_top, cx + bw, b_bot], outline=(100, 110, 125), width=2)
        
        # Grid Fins
        g_w = int(22 * scale)
        g_h = int(24 * scale)
        draw.rectangle([cx - bw - g_w, b_body_top + int(12*scale), cx - bw, b_body_top + int(12*scale) + g_h], fill=(45, 50, 60), outline=(20, 22, 28), width=2)
        draw.rectangle([cx + bw, b_body_top + int(12*scale), cx + bw + g_w, b_body_top + int(12*scale) + g_h], fill=(45, 50, 60), outline=(20, 22, 28), width=2)
        
        draw_top_header(draw, "HOT-STAGING RING SEPARATION // 轨道热分离", "ALTITUDE: 67 KM • MECO & SECOND STAGE IGNITION")
        draw_hud(draw, 70, 150, 440, 250, "热分离原理深度剖析", [
            "• 革命性设计: 飞船发动机在未脱离时直接点火",
            "• 镂空排气环: 耐高温不锈钢导流侧向喷出",
            "• 动力零损失: 无需无动力滑行，增加运载能力超10吨",
            "• 助推器仅保留中心3台引擎微推维持姿态",
            "• 随后助推器执行剧烈翻转并启动返场点火 (RTLS)"
        ])
        draw_hud(draw, 1410, 150, 440, 210, "分离后任务剖面", [
            "• 第二级星舰: 持续加速至入轨速度 (7.8 km/s)",
            "• 超重助推器: 翻转 180度 执行 Boostback Burn",
            "• 目标轨迹: 毫米级高精度弹道直指发射场",
            "• 空气动力控制: 4枚网格舵超音速姿态调整"
        ])
        draw_bottom_caption(draw, "穿透云层热分离环点火，第二级飞船无缝点火脱离，完成人类航天史上最大规模的轨道热分离。")

    # ====================================================
    # SCENE 4: Starship V3 Architecture & Raptor 3 (30.25s - 41.8s)
    # ====================================================
    elif t_sec < 41.8:
        # Technical CAD Exploded View
        draw_top_header(draw, "STARSHIP V3 ARCHITECTURAL CAD // 星舰V3核心解构", "ENGINEERING BREAKTHROUGHS • RAPTOR 3 & MARS PAYLOAD")
        
        # Grid lines
        for gx in range(500, 1420, 50):
            draw.line([gx, 150, gx, 920], fill=(18, 32, 50), width=1)
        for gy in range(150, 920, 50):
            draw.line([500, gy, 1420, gy], fill=(18, 32, 50), width=1)
            
        # Draw 3D Cross-Section Cylinder Model of Starship V3
        cx = 960
        rw = 55
        
        # Section 1: Payload Fairing & Forward Nose
        draw.polygon([(cx - rw, 340), (cx + rw, 340), (cx, 200)], fill=(30, 48, 72), outline=(0, 220, 255), width=2)
        draw.text((cx + rw + 25, 260), "加压前锥段 / 航电与推进剂微调", font=f_h3, fill=(0, 220, 255))
        draw.line([cx + rw//2, 280, cx + rw + 18, 280], fill=(0, 220, 255), width=2)
        
        # Section 2: Huge Unpressurized Cargo Bay (>200t Mars payload)
        draw.rectangle([cx - rw, 350, cx + rw, 490], fill=(22, 42, 65), outline=(0, 210, 255), width=2)
        draw.text((cx + rw + 25, 410), "巨大无阻隔货舱 (运载量 > 200 吨)", font=f_h3, fill=(0, 240, 255))
        draw.line([cx + rw, 420, cx + rw + 18, 420], fill=(0, 210, 255), width=2)
        
        # Section 3: Liquid Methane Tank (CH4)
        draw.rectangle([cx - rw, 500, cx + rw, 630], fill=(18, 48, 75), outline=(0, 190, 235), width=2)
        draw.text((cx + rw + 25, 555), "液甲烷燃料储箱 (Cryogenic Liquid CH4)", font=f_h3, fill=(0, 210, 240))
        draw.line([cx + rw, 565, cx + rw + 18, 565], fill=(0, 190, 235), width=2)
        
        # Section 4: Liquid Oxygen Tank (LOX)
        draw.rectangle([cx - rw, 640, cx + rw, 770], fill=(16, 55, 85), outline=(0, 170, 215), width=2)
        draw.text((cx + rw + 25, 695), "液氧氧化剂储箱 (Liquid Oxygen LOX)", font=f_h3, fill=(0, 180, 220))
        draw.line([cx + rw, 705, cx + rw + 18, 705], fill=(0, 170, 215), width=2)
        
        # Section 5: Engine Thrust Puck & Raptor 3 Cluster
        draw.rectangle([cx - rw, 780, cx + rw, 850], fill=(48, 32, 25), outline=(255, 140, 30), width=2)
        draw.text((cx + rw + 25, 805), "3台海平面 + 3台真空猛禽3 (280tf推力/台)", font=f_h3, fill=(255, 160, 50))
        draw.line([cx + rw, 815, cx + rw + 18, 815], fill=(255, 140, 30), width=2)
        
        # 6 Engine Bells
        for eb in [-40, -24, -8, 8, 24, 40]:
            draw.polygon([(cx + eb - 6, 850), (cx + eb + 6, 850), (cx + eb + 9, 875), (cx + eb - 9, 875)], fill=(70, 75, 85), outline=(255, 150, 40), width=1)
            
        draw_hud(draw, 70, 150, 410, 420, "RAPTOR 3 终极技术演进", [
            "• 燃烧室压力: 350 bar (打破世界纪录)",
            "• 单台推力: 280 吨级 (推重比突破 170+)",
            "• 极简革命: 取消所有二次流外置管道",
            "• 一体化增材制造 (内部微米级冷却通道)",
            "• 自带防热屏蔽层，省去沉重防热罩",
            "• 点火无需复杂地面脐带缆接口支持",
            "• 专为火星现场原位资源利用 (ISRU) 设计"
        ])
        
        draw_hud(draw, 1440, 150, 410, 380, "V3 关键经济与运力指标", [
            "• 近地轨道 (LEO) 运力: 200+ 吨 (完全复用)",
            "• 一次性构型最大运力: 400 吨",
            "• 每公斤发射成本预估: < 100 美元",
            "• 飞船总高度: 约 70 米",
            "• 助推器高度: 约 80 米",
            "• 新一代防热瓦: 环氧次级粘接强化防脱落"
        ])
        draw_bottom_caption(draw, "深度解构V3：全流量分级燃烧猛禽三代无外置管路，运载超两百吨，彻底重构人类入轨质量成本。")

    # ====================================================
    # SCENE 5: Mechazilla Chopsticks Catch (41.8s - 52.88s)
    # ====================================================
    elif t_sec < 52.88:
        rel_t = t_sec - 41.8
        frac = rel_t / 11.08
        
        sea_h = int(H * 0.16)
        draw.rectangle([0, H - sea_h, W, H], fill=(16, 26, 44))
        draw.line([0, H - sea_h, W, H - sea_h], fill=(245, 185, 95), width=2)
        draw.polygon([(360, H), (580, H - sea_h), (1340, H - sea_h), (1560, H)], fill=(24, 30, 38))
        
        # Tower on the left
        tx = 760
        t_bot = H - sea_h
        t_top = 110
        draw.rectangle([tx - 34, t_top, tx + 34, t_bot], fill=(42, 46, 56), outline=(18, 22, 28), width=2)
        for ty in range(t_top, t_bot, 40):
            draw.line([tx - 34, ty, tx + 34, ty + 40], fill=(68, 74, 86), width=2)
            draw.line([tx + 34, ty, tx - 34, ty + 40], fill=(68, 74, 86), width=2)
            
        # Returning Super Heavy Booster position
        bx = 980
        scale = 0.95
        bw = int(36 * scale)
        b_h = int(410 * scale)
        
        # Vertical descent interpolation
        # Descent from sky (150px) down to catch carriage level (base_y ~ 730px)
        if frac < 0.65:
            descent_f = frac / 0.65
            base_y = int(420 + descent_f * 330)
        else:
            base_y = 750 # firmly locked in chopsticks!
            
        b_top = base_y - b_h
        pin_y = b_top + int(47 * scale)
        
        # Landing Burn Plume (Center 3 Raptor engines throttled down, gimballing)
        if frac < 0.80:
            flame_len = int(170 + 20 * math.sin(t_sec * 35))
            draw.polygon([(bx - 18, base_y), (bx + 18, base_y), (bx + 26, base_y + flame_len*0.8), (bx, base_y + flame_len + 25), (bx - 26, base_y + flame_len*0.8)], fill=(255, 115, 20))
            draw.polygon([(bx - 10, base_y), (bx + 10, base_y), (bx, base_y + flame_len*0.5)], fill=(255, 220, 80))
            
        # Booster Body
        for col in range(bx - bw, bx + bw):
            norm = (col - (bx - bw)) / (2.0 * bw)
            bright = 160 + int(90 * math.cos((norm - 0.35) * math.pi))
            draw.line([col, b_top, col, base_y], fill=(bright, bright + 5, bright + 12), width=1)
        draw.rectangle([bx - bw, b_top, bx + bw, base_y], outline=(100, 110, 125), width=2)
        
        # Hot stage ring at top
        draw.rectangle([bx - bw, b_top - int(30*scale), bx + bw, b_top], fill=(55, 60, 70), outline=(160, 170, 185), width=2)
        # Grid fins
        g_w = int(22 * scale)
        g_h = int(24 * scale)
        draw.rectangle([bx - bw - g_w, b_top + int(12*scale), bx - bw, b_top + int(12*scale) + g_h], fill=(45, 50, 60), outline=(20, 22, 28), width=2)
        draw.rectangle([bx + bw, b_top + int(12*scale), bx + bw + g_w, b_top + int(12*scale) + g_h], fill=(45, 50, 60), outline=(20, 22, 28), width=2)
        # Catch Pins (Lifting points)
        draw.rectangle([bx - bw - int(10*scale), pin_y - int(5*scale), bx - bw, pin_y + int(5*scale)], fill=(255, 210, 30))
        draw.rectangle([bx + bw, pin_y - int(5*scale), bx + bw + int(10*scale), pin_y + int(5*scale)], fill=(255, 210, 30))
        
        # Mechazilla Chopstick Arms (Moving on carriage to catch the pins)
        carriage_y = 315
        draw.rectangle([tx - 40, carriage_y, tx + 40, carriage_y + 115], fill=(28, 32, 40), outline=(0, 210, 255), width=2)
        
        arm_target_y = 360 # exactly where pins meet at base_y = 750
        if frac < 0.65:
            arm_open = int(60 * (1.0 - frac / 0.65))
        else:
            arm_open = 0
            
        # Left Chopstick Arm (supporting left pin)
        draw.polygon([(tx + 36, carriage_y + 18), (bx - bw - int(12*scale) - arm_open, arm_target_y - 12), (bx - bw - int(12*scale) - arm_open, arm_target_y + 12), (tx + 36, carriage_y + 40)], fill=(38, 42, 50), outline=(0, 220, 255), width=2)
        # Right Chopstick Arm (reaching around rocket to support right pin)
        draw.polygon([(tx + 36, carriage_y + 70), (bx + bw + int(14*scale) + arm_open, arm_target_y + 18), (bx + bw + int(14*scale) + arm_open, arm_target_y + 42), (tx + 36, carriage_y + 92)], fill=(32, 35, 42), outline=(0, 220, 255), width=2)
        
        # Catch confirmation HUD effect
        if frac >= 0.65:
            draw.ellipse([bx - 80, arm_target_y - 25, bx + 80, arm_target_y + 55], outline=(0, 255, 120), width=3)
            draw.line([bx - 100, arm_target_y + 15, bx + 100, arm_target_y + 15], fill=(0, 255, 120), width=1)
            draw.text((bx + 95, arm_target_y), "MECHAZILLA CATCH SECURED!", font=f_h3, fill=(0, 255, 120))
            
        draw_top_header(draw, "MECHAZILLA CHOPSTICK RECOVERY // 筷子机械臂极限捕获", "PINPOINT TOWER CATCH • FULL REUSABILITY REALIZED")
        draw_hud(draw, 70, 150, 430, 260, "筷子空中捕获技术奇迹", [
            "• 取消着陆腿: 节省助推器结构干重超数吨",
            "• 发射塔机械臂 (筷子) 高度: 约 140 米",
            "• 悬停对准: 毫米级光学传感器与雷达闭环控制",
            "• 承力捕获销 (Catch Pins): 承受千吨级冲击力",
            "• 气动减速: 纯依靠大气减速与最后3秒逆喷反推",
            "• 成果: 航天器不再落海，实现发射台即时重装"
        ])
        draw_hud(draw, 1420, 150, 430, 210, "完全快速复用经济学", [
            "• 传统火箭: 航行即遗弃 / 海上漫长打捞",
            "• 星舰目标: 捕获后直接就位装配第二级",
            "• 周转时间: 目标压缩至 1 小时内",
            "• 真正让航天发射实现'民航客机化运行'"
        ])
        draw_bottom_caption(draw, "史诗级回收！超重助推器逆推精准减速，机械臂筷子空中雷霆闭合，百米级巨塔完成终极捕获！")

    # ====================================================
    # SCENE 6: Outro & Mars Vision Romanticism (52.88s - 62.0s)
    # ====================================================
    else:
        rel_t = t_sec - 52.88
        frac = rel_t / 9.12
        
        # Mars Realistic Textured Sphere with Atmospheric Haze
        mars_x = 1360
        mars_y = 350
        mars_r = 230
        
        # High quality gradient globe
        for mr in range(mars_r, 0, -4):
            factor = mr / float(mars_r)
            cr = int(225 * factor + 120 * (1-factor))
            cg = int(65 * factor + 30 * (1-factor))
            cb = int(35 * factor + 18 * (1-factor))
            draw.ellipse([mars_x - mr, mars_y - mr, mars_x + mr, mars_y + mr], fill=(cr, cg, cb))
        # Atmospheric rim glow
        draw.ellipse([mars_x - mars_r - 14, mars_y - mars_r - 14, mars_x + mars_r + 14, mars_y + mars_r + 14], outline=(255, 125, 75), width=3)
        draw.ellipse([mars_x - mars_r - 20, mars_y - mars_r - 20, mars_x + mars_r + 20, mars_y + mars_r + 20], outline=(255, 80, 40), width=1)
        
        # Starship V3 flying towards Mars (Larger, beautifully rendered Ship)
        # Position glides smoothly
        sx = int(480 + frac * 260)
        sy = int(650 - frac * 140)
        
        # Vacuum Raptor Plume (Glowing crystalline cyan-violet)
        flame_len = int(140 + 15 * math.sin(t_sec * 25))
        draw.polygon([(sx - 80, sy + 32), (sx - 80 - flame_len, sy + 48), (sx - 80, sy + 40)], fill=(70, 150, 255))
        draw.polygon([(sx - 80, sy + 34), (sx - 80 - flame_len*0.6, sy + 44), (sx - 80, sy + 38)], fill=(225, 245, 255))
        
        # Starship 3D Silhouette angled towards Mars
        # Stainless steel hull
        hull_pts = [(sx - 80, sy + 25), (sx + 80, sy - 20), (sx + 130, sy - 35), (sx + 95, sy - 6), (sx - 80, sy + 45)]
        draw.polygon(hull_pts, fill=(225, 232, 242), outline=(130, 140, 155), width=2)
        # Black Heat Shield belly
        tps_pts = [(sx - 80, sy + 36), (sx + 95, sy - 6), (sx + 130, sy - 35), (sx - 80, sy + 45)]
        draw.polygon(tps_pts, fill=(24, 26, 30), outline=(15, 18, 22), width=1)
        # Flap details
        draw.polygon([(sx + 50, sy - 12), (sx + 65, sy - 32), (sx + 80, sy - 20)], fill=(40, 45, 55))
        draw.polygon([(sx - 70, sy + 40), (sx - 60, sy + 65), (sx - 40, sy + 36)], fill=(40, 45, 55))
        
        draw_top_header(draw, "THE MULTI-PLANETARY HORIZON // 走向多行星物种", "SPACEX MANIFEST • THE NEXT GIANT LEAP FOR HUMANITY")
        
        # Poetic Quote Box
        qx = 110
        qy = 180
        draw.rectangle([qx, qy, qx + 640, qy + 370], fill=(10, 16, 26), outline=(255, 195, 45), width=2)
        draw.rectangle([qx, qy, qx + 640, qy + 8], fill=(255, 195, 45))
        
        draw.text((qx + 32, qy + 35), "“生命不应只是解决问题，", font=f_h2, fill=(255, 255, 255))
        draw.text((qx + 32, qy + 75), "生命还应该充满激励人心的梦想。”", font=f_h2, fill=(255, 255, 255))
        draw.text((qx + 32, qy + 125), "— 埃隆·马斯克 (Elon Musk)", font=f_text, fill=(0, 220, 255))
        draw.line([(qx + 32, qy + 160), (qx + 608, qy + 160)], fill=(0, 220, 255), width=1)
        
        draw.text((qx + 32, qy + 182), "• 目标: 2026-2028 首批无人星舰飞往火星", font=f_text, fill=(220, 230, 245))
        draw.text((qx + 32, qy + 218), "• 终极愿景: 在火星建立拥有百万人口的自给自足城市", font=f_text, fill=(220, 230, 245))
        draw.text((qx + 32, qy + 254), "• 文明保障: 让意识的光芒在宇宙中永久延续", font=f_text, fill=(220, 230, 245))
        draw.text((qx + 32, qy + 290), "• 星舰V3: 从这枚火箭开始，人类正式成为星际文明", font=f_text, fill=(255, 210, 60))
        
        draw_hud(draw, 1400, 640, 440, 180, "未来展望里程碑", [
            "• 轨道加注演练 (Propellant Depot)",
            "• NASA Artemis III 月球着陆人选载具",
            "• 每年量产 100+ 枚星舰舰队",
            "• 开启人类大航海时代的星际篇章"
        ])
        
        draw_bottom_caption(draw, "马斯克说，生命应当充满开拓的浪漫。星舰V3，正将群星变成人类的下一站故乡。星辰万丈，即刻启航。")

    return img

print("generate_video_v2 ready.")
