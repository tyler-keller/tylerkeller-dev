#!/usr/bin/env python3
"""
Proof of concept: align progress photos by face.

For each photo:
  1. Detect face landmarks with MediaPipe Face Mesh
  2. Calculate eye-line angle and rotate to level the eyes
  3. Re-detect on the rotated image
  4. Crop a fixed-ratio box: face centered horizontally, forehead at top, torso below
  5. Resize to standard output dimensions

Outputs a GIF of all processed frames.

Install deps (separate from API venv — run once):
    pip install mediapipe opencv-python Pillow

Usage:
    python align_photos.py <photos_dir> [output.gif] [--fps N]

Examples:
    python align_photos.py api/data/media/photos/progress
    python align_photos.py api/data/media/photos/progress aligned.gif --fps 3
"""

import os
import math
import argparse
import urllib.request
import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from PIL import Image

# ── Output dimensions (portrait 3:4) ─────────────────────────────────────────
OUT_W = 400
OUT_H = 533

# ── MediaPipe face_landmarker model (downloaded on first run) ─────────────────
MODEL_URL  = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
MODEL_PATH = os.path.join(os.path.dirname(__file__), "face_landmarker.task")

# ── Landmark indices ──────────────────────────────────────────────────────────
LEFT_EYE_IDX  = [33, 133, 160, 159, 158, 157, 173, 246]
RIGHT_EYE_IDX = [362, 263, 387, 386, 385, 384, 398, 466]


def ensure_model():
    if not os.path.exists(MODEL_PATH):
        print(f"Downloading face landmarker model → {MODEL_PATH}")
        urllib.request.urlretrieve(MODEL_URL, MODEL_PATH)


def eye_centers(landmarks, w, h):
    """Eye centroids from raw MediaPipe landmark objects → (left_in_image, right_in_image)."""
    def centroid(idxs):
        pts = [(landmarks[i].x * w, landmarks[i].y * h) for i in idxs]
        return (sum(p[0] for p in pts) / len(pts),
                sum(p[1] for p in pts) / len(pts))
    return centroid(LEFT_EYE_IDX), centroid(RIGHT_EYE_IDX)


def eye_centers_from_pts(pts):
    """Eye centroids from an already-transformed list of (x, y) tuples."""
    def centroid(idxs):
        selected = [pts[i] for i in idxs]
        return (sum(p[0] for p in selected) / len(selected),
                sum(p[1] for p in selected) / len(selected))
    return centroid(LEFT_EYE_IDX), centroid(RIGHT_EYE_IDX)


def face_bbox(landmarks, w, h):
    """Axis-aligned bounding box of all face mesh landmarks."""
    xs = [l.x * w for l in landmarks]
    ys = [l.y * h for l in landmarks]
    x0, y0 = min(xs), min(ys)
    x1, y1 = max(xs), max(ys)
    return x0, y0, x1 - x0, y1 - y0


def detect(landmarker, img_rgb):
    """Run face landmarker on an RGB numpy array. Returns landmark list or None."""
    mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
    result = landmarker.detect(mp_img)
    if not result.face_landmarks:
        return None
    return result.face_landmarks[0]


def rotate_around(img, angle_deg, cx, cy):
    """Rotate img by angle_deg around (cx, cy), expanding canvas to avoid clipping.
    Returns (rotated_img, affine_matrix) so callers can transform coordinates."""
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((cx, cy), angle_deg, 1.0)
    cos, sin = abs(M[0, 0]), abs(M[0, 1])
    new_w = int(h * sin + w * cos)
    new_h = int(h * cos + w * sin)
    M[0, 2] += (new_w - w) / 2
    M[1, 2] += (new_h - h) / 2
    rotated = cv2.warpAffine(img, M, (new_w, new_h),
                             flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_CONSTANT,
                             borderValue=(0, 0, 0))
    return rotated, M


def transform_point(M, x, y):
    """Apply a 2×3 affine matrix M to point (x, y)."""
    nx = M[0, 0] * x + M[0, 1] * y + M[0, 2]
    ny = M[1, 0] * x + M[1, 1] * y + M[1, 2]
    return nx, ny


def crop_padded(img, x, y, w, h):
    """Crop (x, y, w, h) from img, padding out-of-bounds regions with black."""
    ih, iw = img.shape[:2]
    cw, ch = int(round(w)), int(round(h))
    x0, y0 = int(round(x)), int(round(y))
    x1, y1 = x0 + cw, y0 + ch
    sx0, sy0 = max(x0, 0), max(y0, 0)
    sx1, sy1 = min(x1, iw), min(y1, ih)
    canvas = np.zeros((ch, cw, 3), dtype=np.uint8)
    if sx1 > sx0 and sy1 > sy0:
        dx0, dy0 = sx0 - x0, sy0 - y0
        sw, sh = sx1 - sx0, sy1 - sy0
        # Clamp paste region to canvas size to absorb any rounding drift
        dx1 = min(dx0 + sw, cw)
        dy1 = min(dy0 + sh, ch)
        canvas[dy0:dy1, dx0:dx1] = img[sy0:sy0 + (dy1 - dy0), sx0:sx0 + (dx1 - dx0)]
    return canvas


def process(path, landmarker):
    img_bgr = cv2.imread(path)
    if img_bgr is None:
        return None, "could not read file"

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    h, w = img_rgb.shape[:2]

    lm = detect(landmarker, img_rgb)
    if lm is None:
        return None, "no face detected"

    le, re = eye_centers(lm, w, h)

    # Angle of the eye line; rotate to make it horizontal
    dx, dy = re[0] - le[0], re[1] - le[1]
    angle  = math.degrees(math.atan2(dy, dx))

    cx = (le[0] + re[0]) / 2
    cy = (le[1] + re[1]) / 2
    rotated, M = rotate_around(img_bgr, angle, cx, cy)

    # Transform all landmarks through the rotation matrix (avoids re-running detection)
    t_pts = [transform_point(M, lm[i].x * w, lm[i].y * h) for i in range(len(lm))]

    # Second pass: measure any residual tilt in the transformed landmarks and fix it
    le2, re2 = eye_centers_from_pts(t_pts)
    residual = math.degrees(math.atan2(re2[1] - le2[1], re2[0] - le2[0]))
    if abs(residual) > 0.3:
        cx2, cy2 = (le2[0] + re2[0]) / 2, (le2[1] + re2[1]) / 2
        rotated, M2 = rotate_around(rotated, residual, cx2, cy2)
        t_pts = [transform_point(M2, p[0], p[1]) for p in t_pts]
        angle += residual

    # Face bounding box from transformed landmarks
    xs = [p[0] for p in t_pts]; ys = [p[1] for p in t_pts]
    fx, fy = min(xs), min(ys)
    fw, fh = max(xs) - fx, max(ys) - fy

    # Crop geometry:
    #   - 0.5 × face height of forehead above face top
    #   - 4.5 × face height total → more torso room
    #   - width from output aspect ratio, centered on face
    pad_top = fh * 0.5
    crop_h  = fh * 4.5
    crop_w  = crop_h * (OUT_W / OUT_H)
    crop_x  = (fx + fw / 2) - crop_w / 2
    crop_y  = fy - pad_top

    cropped = crop_padded(rotated, crop_x, crop_y, crop_w, crop_h)
    out = cv2.resize(cropped, (OUT_W, OUT_H), interpolation=cv2.INTER_AREA)
    return cv2.cvtColor(out, cv2.COLOR_BGR2RGB), f"angle={angle:+.1f}°  face=({fw:.0f}×{fh:.0f})"


def main():
    parser = argparse.ArgumentParser(description="Align progress photos by face → GIF or in-place")
    parser.add_argument("photos_dir", help="Directory of input photos, or a single photo path")
    parser.add_argument("output", nargs="?", default="aligned.gif", help="Output GIF path (ignored with --in-place)")
    parser.add_argument("--fps", type=float, default=2, help="Frames per second for GIF (default 2)")
    parser.add_argument("--in-place", action="store_true",
                        help="Overwrite each source image with the aligned version instead of producing a GIF")
    args = parser.parse_args()

    exts = {".jpg", ".jpeg", ".png", ".webp"}

    # Accept either a single file or a directory
    if os.path.isfile(args.photos_dir):
        files_full = [args.photos_dir]
    else:
        files_full = sorted(
            os.path.join(args.photos_dir, f)
            for f in os.listdir(args.photos_dir)
            if os.path.splitext(f.lower())[1] in exts
        )

    if not files_full:
        print("No images found.")
        return

    ensure_model()
    frames = []

    opts = mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_faces=1,
    )
    with mp_vision.FaceLandmarker.create_from_options(opts) as landmarker:
        for path in files_full:
            fname = os.path.basename(path)
            frame, info = process(path, landmarker)
            if frame is None:
                print(f"  ✗  {fname}  {info}")
                continue

            if args.in_place:
                # Save back as JPEG over the original, preserving the extension
                ext = os.path.splitext(path)[1].lower()
                fmt = "PNG" if ext == ".png" else "JPEG"
                Image.fromarray(frame).save(path, fmt, quality=92)
                print(f"  ✓  {fname}  {info}  → overwritten")
            else:
                frames.append(Image.fromarray(frame))
                print(f"  ✓  {fname}  {info}")

    if args.in_place:
        return

    if not frames:
        print("No frames to write.")
        return

    duration_ms = int(1000 / args.fps)
    frames[0].save(
        args.output,
        save_all=True,
        append_images=frames[1:],
        duration=duration_ms,
        loop=0,
        optimize=False,
    )
    print(f"\n→ {args.output}  ({len(frames)} frames, {args.fps} fps)")


if __name__ == "__main__":
    main()
