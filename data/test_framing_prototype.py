import os
import cv2
import numpy as np
from ultralytics import YOLO
from scenedetect import detect, ContentDetector
from pathlib import Path

video_path = "data/cache/downloads/5jlDBdjz_3w.mp4"
start_time = 1612.08
end_time = 1642.08 # test on first 30 seconds of clip 1

print("1. Testing Scene Detect on 30s segment...")
try:
    scenes = detect(video_path, ContentDetector(threshold=27.0), start_time=start_time, end_time=end_time)
    print(f"Detected {len(scenes)} scenes:")
    for s, e in scenes:
        print(f"  Scene: {s.get_seconds():.2f}s -> {e.get_seconds():.2f}s (dur: {(e.get_seconds()-s.get_seconds()):.2f}s)")
except Exception as e:
    print("Scene detect fallback:", e)
    scenes = []

print("\n2. Testing YOLOv8 person detection on sampled frames...")
model = YOLO('yolov8n.pt')
cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS) or 60.0
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1920
H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 1080
print(f"Source video dimensions: {W}x{H} @ {fps} fps")

# Sample 5 frames across this 30s segment
sample_times = [start_time + i * 6.0 for i in range(5)]
for idx, t in enumerate(sample_times):
    frame_no = int(t * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
    ret, frame = cap.read()
    if not ret:
        continue
    results = model(frame, verbose=False, classes=[0], conf=0.35)
    boxes = results[0].boxes
    print(f"  Frame at t={t:.1f}s (frame {frame_no}): detected {len(boxes)} people")
    for b_idx, box in enumerate(boxes):
        xyxy = box.xyxy[0].cpu().numpy()
        conf = float(box.conf[0])
        bw, bh = xyxy[2] - xyxy[0], xyxy[3] - xyxy[1]
        cx, cy = (xyxy[0] + xyxy[2]) / 2, (xyxy[1] + xyxy[3]) / 2
        print(f"    Person #{b_idx+1}: conf={conf:.2f}, bbox=[{xyxy[0]:.0f}, {xyxy[1]:.0f}, {xyxy[2]:.0f}, {xyxy[3]:.0f}], size={bw:.0f}x{bh:.0f}, center=({cx:.0f}, {cy:.0f})")

cap.release()
print("\nDone testing scene detection and person detection!")
