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
f_metric = ImageFont.truetype(FONT_BOLD, 32)
f_caption = ImageFont.truetype(FONT_BOLD, 28)
f_tag = ImageFont.truetype(FONT_BOLD, 16)
f_quote = ImageFont.truetype(FONT_REG, 24)

# Precompute skies
def make_sunset_sky():
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    y = np.linspace(0, 1, H)
    r = np.zeros(H, dtype=np.float32)
    g = np.zeros(H, dtype=np.float32)
    b = np.zeros(H, dtype=np.float32)
    
    m1 = y <= 0.45
    f1 = y[m1] / 0.45
    r[m1] = 10 * (1-f1) + 42 * f1
    g[m1] = 14 * (1-f1) + 28 * f1
    b[m1] = 32 * (1-f1) + 68 * f1
    
    m2 = (y > 0.45) & (y <= 0.76)
    f2 = (y[m2] - 0.45) / 0.31
    r[m2] = 42 * (1-f2) + 242 * f2
    g[m2] = 28 * (1-f2) + 112 * f2
    b[m2] = 68 * (1-f2) + 42 * f2
    
    m3 = y > 0.76
    f3 = (y[m3] - 0.76) / 0.24
    r[m3] = 242 * (1-f3) + 255 * f3
    g[m3] = 112 * (1-f3) + 188 * f3
    b[m3] = 42 * (1-f3) + 82 * f3
    
    sky[:, :, 0] = np.tile(r[:, None], (1, W))
    sky[:, :, 1] = np.tile(g[:, None], (1, W))
    sky[:, :, 2] = np.tile(b[:, None], (1, W))
    return sky

def make_space_sky():
    sky = np.zeros((H, W, 3), dtype=np.uint8)
    y = np.linspace(0, 1, H)
    earth_glow = np.clip(np.exp((y - 0.65) * 5.5) * 120.0, 0, 240)
    sky[:, :, 0] = np.tile((earth_glow * 0.12)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 1] = np.tile((earth_glow * 0.48)[:, None], (1, W)).astype(np.uint8)
    sky[:, :, 2] = np.tile((earth_glow * 0.98)[:, None], (1, W)).astype(np.uint8)
    np.random.seed(101)
    sx = np.random.randint(0, W, 300)
    sy = np.random.randint(0, int(H * 0.72), 300)
    b_val = np.random.randint(120, 255, 300)
    for i in range(300):
        sky[sy[i], sx[i]] = [b_val[i], b_val[i], min(255, b_val[i]+20)]
    return sky

sunset_sky_base = make_sunset_sky()
space_sky_base = make_space_sky()

def draw_hud(draw, x, y, w, h, title, lines):
    # Dark panel
    draw.rectangle([x, y, x + w, y + h], fill=(12, 18, 28), outline=(0, 210, 255), width=2)
    # Tech corners
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
    pad_x, pad_y = 30, 12
    cx = W // 2
    by = H - 90
    draw.rectangle([cx - tw//2 - pad_x, by - pad_y, cx + tw//2 + pad_x, by + th + pad_y], 
                   fill=(8, 12, 20), outline=(255, 195, 45), width=1)
    draw.rectangle([cx - tw//2 - pad_x, by - pad_y, cx - tw//2 - pad_x + 6, by + th + pad_y], fill=(255, 195, 45))
    draw.text((cx - tw//2, by - 2), text, font=f_caption, fill=(255, 255, 255))

def draw_top_header(draw, title_str, tag_str="SPACEX STARSHIP V3 PROGRAM"):
    draw.rectangle([60, 45, 60 + 8, 45 + 50], fill=(0, 210, 255))
    draw.text((78, 42), tag_str, font=f_tag, fill=(0, 210, 255))
    draw.text((78, 64), title_str, font=f_title, fill=(255, 255, 255))

# Render function for each scene
def render_frame(frame_idx):
    t_sec = frame_idx / float(FPS)
    
    # Create base image
    if 21.0 <= t_sec < 41.8:
        base_arr = space_sky_base.copy()
    else:
        base_arr = sunset_sky_base.copy()
        
    img = Image.fromarray(base_arr)
    draw = ImageDraw.Draw(img)
    
    # ----------------------------------------------------
    # SCENE 1: Pad & Architecture (0.0s - 10.1s)
    # ----------------------------------------------------
    if t_sec < 10.1:
        frac = t_sec / 10.1
        # Draw Sea & Coastline
        sea_h = int(H * 0.18)
        draw.rectangle([0, H - sea_h, W, H], fill=(16, 28, 48))
        draw.line([0, H - sea_h, W, H - sea_h], fill=(240, 180, 100), width=2)
        # Pad Ground
        draw.polygon([(400, H), (650, H - sea_h), (1270, H - sea_h), (1520, H)], fill=(25, 32, 40))
        
        # Mechazilla Launch Tower on the Left of Rocket
        tower_x = 760
        tower_top = 220
        tower_bot = H - sea_h
        draw.rectangle([tower_x - 30, tower_top, tower_x + 30, tower_bot], fill=(45, 50, 60), outline=(20, 24, 30), width=2)
        # Truss diagonals
        for ty in range(tower_top, tower_bot, 45):
            draw.line([tower_x - 30, ty, tower_x + 30, ty + 45], fill=(70, 75, 85), width=2)
            draw.line([tower_x + 30, ty, tower_x - 30, ty + 45], fill=(70, 75, 85), width=2)
        
        # Catch Arms (Chopsticks)
        draw.polygon([(tower_x + 28, 380), (tower_x + 160, 400), (tower_x + 160, 415), (tower_x + 28, 405)], fill=(30, 32, 36))
        draw.polygon([(tower_x + 28, 420), (tower_x + 160, 440), (tower_x + 160, 455), (tower_x + 28, 445)], fill=(30, 32, 36))
        
        # STARSHIP V3 FULL STACK on Launch Mount
        rx = 980
        # Super Heavy Booster (71m tall)
        sh_bot = tower_bot - 40
        sh_top = sh_bot - 410
        rw = 34
        # Stainless steel gradient body
        draw.rectangle([rx - rw, sh_top, rx + rw, sh_bot], fill=(210, 218, 228), outline=(130, 140, 155), width=2)
        # Vertical metallic reflection line
        draw.line([rx - 10, sh_top, rx - 10, sh_bot], fill=(245, 250, 255), width=4)
        # Booster Grid Fins (4 titanium / stainless grid fins)
        draw.rectangle([rx - rw - 18, sh_top + 10, rx - rw, sh_top + 28], fill=(50, 55, 65))
        draw.rectangle([rx + rw, sh_top + 10, rx + rw + 18, sh_top + 28], fill=(50, 55, 65))
        
        # Hot-Staging Interstage Ring (V3 vented ring)
        draw.rectangle([rx - rw, sh_top - 24, rx + rw, sh_top], fill=(60, 65, 75), outline=(180, 190, 205), width=2)
        for vx in range(rx - rw + 6, rx + rw - 4, 8):
            draw.line([vx, sh_top - 20, vx, sh_top - 4], fill=(25, 28, 35), width=3)
            
        # Starship Upper Stage (Ship V3: 70m+ tall)
        ship_bot = sh_top - 24
        ship_body_top = ship_bot - 230
        draw.rectangle([rx - rw, ship_body_top, rx + rw, ship_bot], fill=(225, 232, 240), outline=(140, 150, 165), width=2)
        draw.line([rx - 10, ship_body_top, rx - 10, ship_bot], fill=(250, 252, 255), width=4)
        # Black Heat Shield side
        draw.rectangle([rx, ship_body_top, rx + rw, ship_bot], fill=(25, 28, 32))
        
        # Starship Nosecone
        nose_top = ship_body_top - 140
        draw.polygon([(rx - rw, ship_body_top), (rx + rw, ship_body_top), (rx, nose_top)], fill=(225, 232, 240), outline=(140, 150, 165))
        draw.polygon([(rx, ship_body_top), (rx + rw, ship_body_top), (rx, nose_top)], fill=(25, 28, 32))
        
        # Forward Flaps & Aft Flaps
        draw.polygon([(rx - rw - 16, ship_body_top + 25), (rx - rw, ship_body_top + 10), (rx - rw, ship_body_top + 45)], fill=(30, 32, 38))
        draw.polygon([(rx + rw + 16, ship_body_top + 25), (rx + rw, ship_body_top + 10), (rx + rw, ship_body_top + 45)], fill=(30, 32, 38))
        draw.polygon([(rx - rw - 24, ship_bot - 15), (rx - rw, ship_bot - 65), (rx - rw, ship_bot - 10)], fill=(30, 32, 38))
        draw.polygon([(rx + rw + 24, ship_bot - 15), (rx + rw, ship_bot - 65), (rx + rw, ship_bot - 10)], fill=(30, 32, 38))
        
        # Height Dimension Marker Bracket
        draw.line([rx + 75, nose_top, rx + 115, nose_top], fill=(0, 220, 255), width=2)
        draw.line([rx + 75, sh_bot, rx + 115, sh_bot], fill=(0, 220, 255), width=2)
        draw.line([rx + 95, nose_top, rx + 95, sh_bot], fill=(0, 220, 255), width=2)
        draw.text((rx + 110, (nose_top + sh_bot)//2 - 15), "150 METERS (V3)", font=f_metric, fill=(0, 240, 255))
        
        # HUD overlays
        draw_top_header(draw, "STARBASE BOKA CHIKA // 星舰基地全景", "SPACEX STARSHIP V3 • ORBITAL LAUNCH SYSTEM")
        draw_hud(draw, 70, 160, 440, 280, "V3 架构技术规范", [
            "• 组合体总高: 近 150 米 (人类史上最高)",
            "• 起飞质量: ~5,200 吨",
            "• 发动机配置: 33台 Raptor 3 猛禽引擎",
            "• 海平面推力: ~10,000+ 吨级 (近Saturn V三倍)",
            "• 主体材质: 冷轧 304L 高强度不锈钢",
            "• 任务定位: 快速完全可重复使用 / 火星殖民"
        ])
        draw_hud(draw, 1410, 160, 440, 210, "发射工位核心设施", [
            "• Mechazilla 机械臂发射捕获塔",
            "• 零下196℃ 液氧/液甲烷深冷加注",
            "• 水冷钢板火焰分流反冲系统",
            "• 快速周转目标: 数小时内再次飞行"
        ])
        draw_bottom_caption(draw, "星舰基地，总高近一百五十米的星舰V3傲立在傍晚地平线，人类文明通往火星的巨型天梯正蓄势待发。")

    # ----------------------------------------------------
    # SCENE 2: Liftoff & Atmospheric Ascent (10.1s - 21.0s)
    # ----------------------------------------------------
    elif t_sec < 21.0:
        rel_t = t_sec - 10.1
        frac = rel_t / 10.9
        
        # Ascending position
        rx = 960
        # Rocket climbs upward
        ry = int(820 - frac * 540)
        rw = 26
        
        # Liftoff Exhaust Plume (Violent Raptor 3 Diamond Shock Flame)
        flame_len = int(220 + 20 * math.sin(t_sec * 30))
        flame_w = rw + 8
        # Outer flame (cyan-amber shock diamonds)
        draw.polygon([(rx - flame_w, ry + 240), (rx + flame_w, ry + 240), (rx + flame_w*1.8, ry + 240 + flame_len*0.7), (rx, ry + 240 + flame_len), (rx - flame_w*1.8, ry + 240 + flame_len*0.7)], fill=(255, 110, 20))
        # Mid intense flame (bright golden)
        draw.polygon([(rx - flame_w*0.8, ry + 240), (rx + flame_w*0.8, ry + 240), (rx + flame_w, ry + 240 + flame_len*0.5), (rx, ry + 240 + flame_len*0.8), (rx - flame_w, ry + 240 + flame_len*0.5)], fill=(255, 210, 60))
        # Inner Raptor core (high temp cyan-white plasma)
        draw.polygon([(rx - flame_w*0.4, ry + 240), (rx + flame_w*0.4, ry + 240), (rx, ry + 240 + flame_len*0.4)], fill=(220, 245, 255))
        # Shock diamonds
        for sd in range(1, 5):
            sdy = ry + 240 + sd * 35
            draw.ellipse([rx - 10, sdy - 6, rx + 10, sdy + 6], fill=(255, 255, 255))
            
        # Rocket Body
        # Booster
        draw.rectangle([rx - rw, ry, rx + rw, ry + 240], fill=(215, 222, 230), outline=(130, 140, 155), width=2)
        draw.line([rx - 8, ry, rx - 8, ry + 240], fill=(250, 252, 255), width=3)
        # Hot-staging ring
        draw.rectangle([rx - rw, ry - 18, rx + rw, ry], fill=(60, 65, 75))
        # Ship
        draw.rectangle([rx - rw, ry - 160, rx + rw, ry - 18], fill=(225, 232, 240), outline=(130, 140, 155), width=2)
        draw.rectangle([rx, ry - 160, rx + rw, ry - 18], fill=(25, 28, 32))
        # Nosecone
        draw.polygon([(rx - rw, ry - 160), (rx + rw, ry - 160), (rx, ry - 250)], fill=(225, 232, 240))
        draw.polygon([(rx, ry - 160), (rx + rw, ry - 160), (rx, ry - 250)], fill=(25, 28, 32))
        # Flaps
        draw.polygon([(rx - rw - 14, ry - 140), (rx - rw, ry - 150), (rx - rw, ry - 125)], fill=(35, 38, 42))
        draw.polygon([(rx + rw + 14, ry - 140), (rx + rw, ry - 150), (rx + rw, ry - 125)], fill=(35, 38, 42))
        draw.polygon([(rx - rw - 18, ry - 30), (rx - rw, ry - 70), (rx - rw, ry - 20)], fill=(35, 38, 42))
        draw.polygon([(rx + rw + 18, ry - 30), (rx + rw, ry - 70), (rx + rw, ry - 20)], fill=(35, 38, 42))
        
        # Condensation cloud & Mach Cone (Aerodynamic shockwave at Max-Q)
        if 0.35 <= frac <= 0.75:
            mach_alpha = int(180 * math.sin((frac - 0.35) / 0.40 * math.pi))
            draw.line([rx - 180, ry + 40, rx - rw, ry - 160], fill=(255, 255, 255), width=3)
            draw.line([rx + 180, ry + 40, rx + rw, ry - 160], fill=(255, 255, 255), width=3)
            draw.text((rx + rw + 40, ry - 160), "TRANSONIC // MAX-Q 动压极值", font=f_tag, fill=(0, 240, 255))
            
        # Flight telemetry
        alt_km = frac * 62.0
        vel_kmh = frac * 5800.0
        thrust_tf = 9800.0 - frac * 600.0
        
        draw_top_header(draw, "BOOSTER ASCENT // 超重助推升空加速", "FLIGHT PROFILE • LIFTOFF TO MAX-Q")
        draw_hud(draw, 70, 160, 420, 260, "实时遥测数据 (TELEMETRY)", [
            f"• 飞行高度 (ALT): {alt_km:.1f} KM",
            f"• 飞行速度 (VEL): {vel_kmh:.0f} KM/H (Mach {vel_kmh/1225.0:.1f})",
            f"• 实时推力 (THRUST): {thrust_tf:.0f} TON-FORCE",
            f"• 点火引擎: 33 / 33 全工况运转",
            f"• 燃烧室压力: 350 bar (Raptor 3 全流量)",
            f"• 结构加速度: {1.2 + frac*2.1:.2f} G"
        ])
        draw_hud(draw, 1430, 160, 420, 200, "全流量分级燃烧循环", [
            "• 甲烷富燃涡轮泵 + 氧富氧涡轮泵",
            "• 内部一体化3D打印冷却通道",
            "• 无外露导管，极佳空气动力学阻力",
            "• 比冲达到惊人的 350s (海平面)"
        ])
        draw_bottom_caption(draw, "三十三台猛禽三代引擎怒吼点火，超万吨推力撕裂黄昏苍穹，不锈钢巨兽以排山倒海之势直刺天际。")

    # ----------------------------------------------------
    # SCENE 3: Hot-Staging Separation (21.0s - 30.25s)
    # ----------------------------------------------------
    elif t_sec < 30.25:
        rel_t = t_sec - 21.0
        frac = rel_t / 9.25
        
        # Rocket separation in space / upper atmosphere
        # Ship pulls ahead, booster cuts engines and begins pitch maneuver
        sep_gap = int(frac * 240)
        
        # Center in screen
        cx = 960
        cy = 500
        
        # Ship Upper Stage (Top part, moving forward)
        ship_y = cy - 70 - sep_gap
        rw = 24
        
        # Ship Engine Exhaust (Raptor Vac + SeaLevel full ignition)
        ship_flame_len = int(160 + 15 * math.sin(t_sec * 25))
        draw.polygon([(cx - 18, ship_y + 110), (cx + 18, ship_y + 110), (cx + 28, ship_y + 110 + ship_flame_len), (cx, ship_y + 110 + ship_flame_len + 30), (cx - 28, ship_y + 110 + ship_flame_len)], fill=(80, 160, 255))
        draw.polygon([(cx - 10, ship_y + 110), (cx + 10, ship_y + 110), (cx, ship_y + 110 + ship_flame_len * 0.7)], fill=(230, 245, 255))
        
        # Ship body
        draw.rectangle([cx - rw, ship_y - 80, cx + rw, ship_y + 110], fill=(225, 232, 240), outline=(130, 140, 155), width=2)
        draw.rectangle([cx, ship_y - 80, cx + rw, ship_y + 110], fill=(25, 28, 32))
        # Nosecone
        draw.polygon([(cx - rw, ship_y - 80), (cx + rw, ship_y - 80), (cx, ship_y - 170)], fill=(225, 232, 240))
        draw.polygon([(cx, ship_y - 80), (cx + rw, ship_y - 80), (cx, ship_y - 170)], fill=(25, 28, 32))
        # Flaps
        draw.polygon([(cx - rw - 14, ship_y - 65), (cx - rw, ship_y - 75), (cx - rw, ship_y - 50)], fill=(35, 38, 42))
        draw.polygon([(cx + rw + 14, ship_y - 65), (cx + rw, ship_y - 75), (cx + rw, ship_y - 50)], fill=(35, 38, 42))
        draw.polygon([(cx - rw - 18, ship_y + 45), (cx - rw, ship_y + 5), (cx - rw, ship_y + 55)], fill=(35, 38, 42))
        draw.polygon([(cx + rw + 18, ship_y + 45), (cx + rw, ship_y + 5), (cx + rw, ship_y + 55)], fill=(35, 38, 42))
        
        # Booster (Below, decelerating/pitching)
        booster_y = cy + 130 + int(frac * 40)
        # Hot staging vented ring at booster top (glowing orange with engine wash!)
        draw.rectangle([cx - rw, booster_y, cx + rw, booster_y + 26], fill=(240, 120, 30), outline=(255, 200, 80), width=2)
        # Booster Body
        draw.rectangle([cx - rw, booster_y + 26, cx + rw, booster_y + 260], fill=(215, 222, 230), outline=(130, 140, 155), width=2)
        draw.line([cx - 8, booster_y + 26, cx - 8, booster_y + 260], fill=(250, 252, 255), width=3)
        # Booster Grid Fins
        draw.rectangle([cx - rw - 16, booster_y + 36, cx - rw, booster_y + 52], fill=(50, 55, 65))
        draw.rectangle([cx + rw, booster_y + 36, cx + rw + 16, booster_y + 52], fill=(50, 55, 65))
        
        # Ring plasma blast gas vents
        if frac < 0.6:
            draw.line([cx - rw - 60, booster_y + 13, cx - rw, booster_y + 13], fill=(255, 160, 40), width=4)
            draw.line([cx + rw, booster_y + 13, cx + rw + 60, booster_y + 13], fill=(255, 160, 40), width=4)
            
        draw_top_header(draw, "HOT-STAGING RING SEPARATION // 轨道热分离", "ALTITUDE: 67 KM • MECO & SECOND STAGE IGNITION")
        draw_hud(draw, 70, 160, 440, 250, "热分离原理深度剖析", [
            "• 革命性设计: 飞船发动机在未脱离时直接点火",
            "• 镂空排气环: 耐高温不锈钢导流侧向喷出",
            "• 动力零损失: 无需无动力滑行，增加运载能力超10吨",
            "• 助推器仅保留中心3台引擎微推维持姿态",
            "• 随后助推器执行剧烈翻转并启动返场点火 (RTLS)"
        ])
        draw_hud(draw, 1410, 160, 440, 210, "分离后任务剖面", [
            "• 第二级星舰: 持续加速至入轨速度 (7.8 km/s)",
            "• 超重助推器: 翻转 180° 执行 Boostback Burn",
            "• 目标轨迹: 毫米级高精度弹道直指发射场",
            "• 空气动力控制: 4枚网格舵超音速姿态调整"
        ])
        draw_bottom_caption(draw, "穿透云层热分离环点火，第二级飞船无缝点火脱离，完成人类航天史上最大规模的轨道热分离。")

    # ----------------------------------------------------
    # SCENE 4: Starship V3 Architecture & Raptor 3 (30.25s - 41.8s)
    # ----------------------------------------------------
    elif t_sec < 41.8:
        rel_t = t_sec - 30.25
        frac = rel_t / 11.55
        
        # Center 3D-like technical CAD exploded diagram
        cx = 960
        cy = 540
        
        # Left exploded view: Raptor 3 Engine close-up diagram
        # Right view: Starship V3 Payload & Tiles diagram
        draw_top_header(draw, "STARSHIP V3 ARCHITECTURAL CAD // 星舰V3核心解构", "ENGINEERING BREAKTHROUGHS • RAPTOR 3 & MARS PAYLOAD")
        
        # Tech Blueprint Grid in the background
        for gx in range(520, 1400, 60):
            draw.line([gx, 150, gx, 920], fill=(20, 35, 55), width=1)
        for gy in range(150, 920, 60):
            draw.line([520, gy, 1400, gy], fill=(20, 35, 55), width=1)
            
        # Draw 3D Schematic of Starship V3 Hull (Sectioned CAD)
        rx = 780
        # Cargo Bay
        draw.rectangle([rx - 45, 230, rx + 45, 360], fill=(25, 40, 60), outline=(0, 220, 255), width=2)
        draw.text((rx + 60, 280), "巨大无阻隔货舱 (运载量 > 200 吨)", font=f_h3, fill=(0, 240, 255))
        draw.line([rx + 45, 290, rx + 55, 290], fill=(0, 220, 255), width=2)
        
        # Methane Tank (CH4)
        draw.rectangle([rx - 45, 370, rx + 45, 500], fill=(20, 48, 70), outline=(0, 200, 240), width=2)
        draw.text((rx + 60, 425), "液甲烷燃料储箱 (Cryogenic Liquid CH4)", font=f_h3, fill=(0, 220, 240))
        draw.line([rx + 45, 435, rx + 55, 435], fill=(0, 200, 240), width=2)
        
        # Oxygen Tank (LOX)
        draw.rectangle([rx - 45, 510, rx + 45, 680], fill=(18, 55, 80), outline=(0, 180, 220), width=2)
        draw.text((rx + 60, 585), "液氧储箱 (Liquid Oxygen LOX)", font=f_h3, fill=(0, 180, 220))
        draw.line([rx + 45, 595, rx + 55, 595], fill=(0, 180, 220), width=2)
        
        # Engine Compartment (Raptor 3 cluster)
        draw.rectangle([rx - 45, 690, rx + 45, 770], fill=(45, 30, 25), outline=(255, 140, 30), width=2)
        draw.text((rx + 60, 720), "3台海平面 + 3台真空猛禽3 (280tf推力/台)", font=f_h3, fill=(255, 160, 50))
        draw.line([rx + 45, 730, rx + 55, 730], fill=(255, 140, 30), width=2)
        
        # Raptor 3 Detail Box
        draw_hud(draw, 70, 160, 410, 420, "RAPTOR 3 终极技术演进", [
            "• 燃烧室压力: 350 bar (打破世界纪录)",
            "• 单台推力: 280 吨级 (推重比突破 170+)",
            "• 极简革命: 取消所有二次流外置管道",
            "• 一体化增材制造 (内部微米级冷却通道)",
            "• 自带防热屏蔽层，省去沉重防热罩",
            "• 点火无需复杂地面脐带缆接口支持",
            "• 专为火星现场原位资源利用 (ISRU) 设计"
        ])
        
        draw_hud(draw, 1440, 160, 410, 380, "V3 关键经济与运力指标", [
            "• 近地轨道 (LEO) 运力: 200+ 吨 (完全复用)",
            "• 一次性构型最大运力: 400 吨",
            "• 每公斤发射成本预估: < 100 美元",
            "• 飞船总高度: 约 70 米",
            "• 助推器高度: 约 80 米",
            "• 新一代防热瓦: 环氧次级粘接强化防脱落"
        ])
        draw_bottom_caption(draw, "深度解构V3：全流量分级燃烧猛禽三代无外置管路，运载超两百吨，彻底重构人类入轨质量成本。")

    # ----------------------------------------------------
    # SCENE 5: Mechazilla Chopsticks Catch (41.8s - 52.88s)
    # ----------------------------------------------------
    elif t_sec < 52.88:
        rel_t = t_sec - 41.8
        frac = rel_t / 11.08
        
        # Return to sunset launch site for the historic catch
        sea_h = int(H * 0.18)
        draw.rectangle([0, H - sea_h, W, H], fill=(16, 28, 48))
        draw.line([0, H - sea_h, W, H - sea_h], fill=(240, 180, 100), width=2)
        draw.polygon([(400, H), (650, H - sea_h), (1270, H - sea_h), (1520, H)], fill=(25, 32, 40))
        
        # Launch Tower
        tx = 960 - 180
        t_top = 180
        t_bot = H - sea_h
        draw.rectangle([tx - 32, t_top, tx + 32, t_bot], fill=(42, 46, 55), outline=(20, 24, 30), width=2)
        for ty in range(t_top, t_bot, 42):
            draw.line([tx - 32, ty, tx + 32, ty + 42], fill=(68, 72, 82), width=2)
            draw.line([tx + 32, ty, tx - 32, ty + 42], fill=(68, 72, 82), width=2)
            
        # Booster Landing descent: coming down from sky
        # Rocket position
        bx = tx + 180
        # Descent curve: rapidly descends, hovers right between chopsticks
        if frac < 0.70:
            sub_f = frac / 0.70
            by = int(120 + sub_f * (430 - 120))
        else:
            by = 430 # hovering / caught!
            
        bw = 28
        
        # Landing burn flame (Center 3 engines gimballing furiously)
        if frac < 0.85:
            flame_len = int(140 + 20 * math.sin(t_sec * 35))
            draw.polygon([(bx - 14, by + 230), (bx + 14, by + 230), (bx + 20, by + 230 + flame_len), (bx, by + 230 + flame_len + 25), (bx - 20, by + 230 + flame_len)], fill=(255, 120, 25))
            draw.polygon([(bx - 7, by + 230), (bx + 7, by + 230), (bx, by + 230 + flame_len * 0.6)], fill=(255, 235, 120))
            
        # Booster Body
        draw.rectangle([bx - bw, by, bx + bw, by + 230], fill=(200, 208, 218), outline=(120, 130, 145), width=2)
        draw.line([bx - 8, by, bx - 8, by + 230], fill=(245, 250, 255), width=3)
        # Hot stage ring
        draw.rectangle([bx - bw, by - 16, bx + bw, by], fill=(55, 60, 70))
        # Grid fins
        draw.rectangle([bx - bw - 14, by + 12, bx - bw, by + 28], fill=(45, 50, 60))
        draw.rectangle([bx + bw, by + 12, bx + bw + 14, by + 28], fill=(45, 50, 60))
        # Catch Pins (lifting lugs on booster below grid fins)
        draw.rectangle([bx - bw - 8, by + 34, bx - bw, by + 42], fill=(255, 210, 40))
        draw.rectangle([bx + bw, by + 34, bx + bw + 8, by + 42], fill=(255, 210, 40))
        
        # Mechazilla Chopsticks Arms!
        # Arms close around booster catch pins
        # Chopstick 1 (Left arm) & Chopstick 2 (Right arm)
        arm_base_y = 445
        # Before catch (frac < 0.65), arms are open wider; then close firmly
        if frac < 0.65:
            arm_open = int(55 * (1.0 - frac / 0.65))
        else:
            arm_open = 0
            
        # Left chopstick
        draw.polygon([(tx + 30, arm_base_y - 20), (bx - bw - 2 - arm_open, arm_base_y - 8), (bx - bw - 2 - arm_open, arm_base_y + 12), (tx + 30, arm_base_y + 8)], fill=(32, 35, 42), outline=(0, 210, 255), width=2)
        # Right chopstick (extended past rocket)
        draw.polygon([(tx + 30, arm_base_y + 18), (bx + bw + 14 + arm_open, arm_base_y + 28), (bx + bw + 14 + arm_open, arm_base_y + 44), (tx + 30, arm_base_y + 38)], fill=(28, 30, 36), outline=(0, 210, 255), width=2)
        
        # Catch Confirmation Flash & Reticle
        if frac >= 0.70:
            draw.ellipse([bx - 60, arm_base_y - 20, bx + 60, arm_base_y + 50], outline=(0, 255, 120), width=3)
            draw.text((bx + 75, arm_base_y), "MECHAZILLA CATCH SECURED!", font=f_h3, fill=(0, 255, 120))
            draw.line([bx - 80, arm_base_y + 15, bx + 80, arm_base_y + 15], fill=(0, 255, 120), width=1)
            
        draw_top_header(draw, "MECHAZILLA CHOPSTICK RECOVERY // 筷子机械臂极限捕获", "PINPOINT TOWER CATCH • FULL REUSABILITY REALIZED")
        draw_hud(draw, 70, 160, 430, 260, "筷子空中捕获技术奇迹", [
            "• 取消着陆腿: 节省助推器结构干重超数吨",
            "• 发射塔机械臂 (筷子) 高度: 约 140 米",
            "• 悬停对准: 毫米级光学传感器与雷达闭环控制",
            "• 承力捕获销 (Catch Pins): 承受千吨级冲击力",
            "• 气动减速: 纯依靠大气减速与最后3秒逆喷反推",
            "• 成果: 航天器不再落海，实现发射台即时重装"
        ])
        draw_hud(draw, 1420, 160, 430, 210, "完全快速复用经济学", [
            "• 传统火箭: 航行即遗弃 / 海上漫长打捞",
            "• 星舰目标: 捕获后直接就位装配第二级",
            "• 周转时间: 目标压缩至 1 小时内",
            "• 真正让航天发射实现'民航客机化运行'"
        ])
        draw_bottom_caption(draw, "史诗级回收！超重助推器逆推精准减速，机械臂筷子空中雷霆闭合，百米级巨塔完成终极捕获！")

    # ----------------------------------------------------
    # SCENE 6: Outro & Mars Vision Romanticism (52.88s - 62.0s)
    # ----------------------------------------------------
    else:
        rel_t = t_sec - 52.88
        frac = rel_t / 9.12
        
        # Dramatic cinematic shot: Starship V3 flying towards glowing Red Planet Mars
        # Sky: Deep space with red martian atmosphere horizon
        cx = 960
        cy = 520
        
        # Mars sphere on top right
        mars_x = 1350
        mars_y = 360
        mars_r = 210
        # Martian texture circles
        for mr in range(mars_r, 0, -5):
            factor = mr / float(mars_r)
            cr = int(220 * factor + 140 * (1-factor))
            cg = int(60 * factor + 35 * (1-factor))
            cb = int(35 * factor + 20 * (1-factor))
            draw.ellipse([mars_x - mr, mars_y - mr, mars_x + mr, mars_y + mr], fill=(cr, cg, cb))
        # Atmospheric haze rim
        draw.ellipse([mars_x - mars_r - 12, mars_y - mars_r - 12, mars_x + mars_r + 12, mars_y + mars_r + 12], outline=(255, 120, 80), width=3)
        
        # Starship V3 in cruise (angled toward Mars)
        sx = int(450 + frac * 280)
        sy = int(620 - frac * 140)
        
        # Glowing Raptor plume in vacuum
        draw.polygon([(sx - 80, sy + 30), (sx - 160, sy + 45), (sx - 80, sy + 40)], fill=(70, 150, 255))
        draw.polygon([(sx - 80, sy + 32), (sx - 130, sy + 42), (sx - 80, sy + 38)], fill=(220, 240, 255))
        
        # Ship body horizontal / angled
        draw.polygon([(sx - 75, sy + 25), (sx + 75, sy - 20), (sx + 120, sy - 34), (sx + 85, sy - 6), (sx - 75, sy + 45)], fill=(225, 232, 240))
        # Black TPS belly
        draw.polygon([(sx - 75, sy + 35), (sx + 85, sy - 6), (sx + 120, sy - 34), (sx - 75, sy + 45)], fill=(25, 28, 32))
        
        # Musk romantic quote box
        draw_top_header(draw, "THE MULTI-PLANETARY HORIZON // 走向多行星物种", "SPACEX MANIFEST • THE NEXT GIANT LEAP FOR HUMANITY")
        
        # Center poetic card
        qx = 120
        qy = 200
        draw.rectangle([qx, qy, qx + 620, qy + 360], fill=(10, 16, 26), outline=(255, 195, 45), width=2)
        draw.rectangle([qx, qy, qx + 620, qy + 8], fill=(255, 195, 45))
        
        draw.text((qx + 30, qy + 35), "“生命不应只是解决问题，", font=f_h2, fill=(255, 255, 255))
        draw.text((qx + 30, qy + 75), "生命还应该充满激励人心的梦想。”", font=f_h2, fill=(255, 255, 255))
        draw.text((qx + 30, qy + 125), "— 埃隆·马斯克 (Elon Musk)", font=f_text, fill=(0, 220, 255))
        draw.line([(qx + 30, qy + 160), (qx + 590, qy + 160)], fill=(0, 220, 255), width=1)
        
        draw.text((qx + 30, qy + 180), "• 目标: 2026-2028 首批无人星舰飞往火星", font=f_text, fill=(220, 230, 245))
        draw.text((qx + 30, qy + 215), "• 终极愿景: 在火星建立拥有百万人口的自给自足城市", font=f_text, fill=(220, 230, 245))
        draw.text((qx + 30, qy + 250), "• 文明保障: 让意识的光芒在宇宙中永久延续", font=f_text, fill=(220, 230, 245))
        draw.text((qx + 30, qy + 285), "• 星舰V3: 从这枚火箭开始，人类正式成为星际文明", font=f_text, fill=(255, 210, 60))
        
        draw_hud(draw, 1400, 650, 440, 180, "未来展望里程碑", [
            "• 轨道加注演练 (Propellant Depot)",
            "• NASA Artemis III 月球着陆人选载具",
            "• 每年量产 100+ 枚星舰舰队",
            "• 开启人类大航海时代的星际篇章"
        ])
        
        draw_bottom_caption(draw, "马斯克说，生命应当充满开拓的浪漫。星舰V3，正将群星变成人类的下一站故乡。星辰万丈，即刻启航。")

    # Film grain & Subtle vignette overlay
    # Save frame as JPEG for maximum speed
    return img

print("Render logic defined.")
