import cv2
from ultralytics import YOLO

video_path = "data/cache/downloads/5jlDBdjz_3w.mp4"
model = YOLO('yolov8n.pt')
cap = cv2.VideoCapture(video_path)
fps = cap.get(cv2.CAP_PROP_FPS) or 60.0

# Scan every 30 seconds for 10 minutes to find a two-person shot
found_two_shot = []
for sec in range(60, 600, 25):
    frame_no = int(sec * fps)
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
    ret, frame = cap.read()
    if not ret:
        continue
    res = model(frame, verbose=False, classes=[0], conf=0.35)
    boxes = res[0].boxes
    if len(boxes) >= 2:
        print(f"Two people detected at t={sec}s (boxes={len(boxes)})")
        found_two_shot.append(sec)
        if len(found_two_shot) >= 3:
            break

cap.release()
print("Two shot timestamps:", found_two_shot)
