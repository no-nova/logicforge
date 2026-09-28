import sys
import os
import subprocess
import time
from generate_video import render_frame, TOTAL_FRAMES, FPS, W, H

def main():
    print(f"Starting pipe render of {TOTAL_FRAMES} frames ({TOTAL_FRAMES/FPS:.1f}s) at {W}x{H} @ {FPS}fps...")
    t0 = time.time()
    
    output_mp4 = "/home/user/logicforge/starship_video/starship_v3_explainer_1080p.mp4"
    audio_path = "/home/user/logicforge/starship_video/music/final_master_audio.mp3"
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{W}x{H}",
        "-pix_fmt", "rgb24",
        "-r", str(FPS),
        "-i", "-", # input from stdin pipe!
        "-i", audio_path,
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        output_mp4
    ]
    
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    
    for i in range(TOTAL_FRAMES):
        img = render_frame(i)
        # tobytes rgb24
        raw_bytes = img.tobytes()
        proc.stdin.write(raw_bytes)
        
        if (i + 1) % 150 == 0 or i == TOTAL_FRAMES - 1:
            elapsed = time.time() - t0
            fps_cur = (i + 1) / elapsed
            eta = (TOTAL_FRAMES - (i + 1)) / fps_cur
            print(f"Frame {i+1}/{TOTAL_FRAMES} ({(i+1)/TOTAL_FRAMES*100:.1f}%) | {fps_cur:.1f} fps | Elapsed: {elapsed:.1f}s | ETA: {eta:.1f}s")
            
    proc.stdin.close()
    proc.wait()
    t1 = time.time()
    print(f"Render completed successfully in {t1 - t0:.1f} seconds!")
    print(f"Output saved to: {output_mp4}")

if __name__ == "__main__":
    main()
