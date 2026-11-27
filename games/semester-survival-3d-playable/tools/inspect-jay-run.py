import bpy
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUN_FILE = ROOT / "assets" / "Running.fbx"

def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), use_anim=True, automatic_bone_orientation=False)
    return [obj for obj in bpy.data.objects if obj not in before]

def main():
    reset_scene()
    objects = import_fbx(RUN_FILE)
    rigs = [obj for obj in objects if obj.type == "ARMATURE"]
    if not rigs:
        raise RuntimeError("Running.fbx did not import an armature.")
    rig = max(rigs, key=lambda obj: len(obj.data.bones))
    action = rig.animation_data.action if rig.animation_data else None
    if action is None:
        raise RuntimeError("Running.fbx did not import an active animation action.")

    start, end = action.frame_range
    fcurves = list(action.fcurves)
    root_curves = []
    curve_rows = []
    for fc in fcurves:
        path = fc.data_path
        match = re.search(r'pose\.bones\["([^"]+)"\]\.(location|rotation_euler|rotation_quaternion)', path)
        bone = match.group(1) if match else ("<object>" if path in ("location", "rotation_euler", "rotation_quaternion") else None)
        prop = match.group(2) if match else path
        points = list(fc.keyframe_points)
        if not points:
            continue
        first = float(fc.evaluate(start))
        last = float(fc.evaluate(end))
        values = [float(p.co.y) for p in points]
        row = {
            "path": path,
            "array_index": fc.array_index,
            "bone": bone,
            "property": prop,
            "keys": len(points),
            "first": round(first, 6),
            "last": round(last, 6),
            "min": round(min(values), 6),
            "max": round(max(values), 6),
            "range": round(max(values) - min(values), 6),
        }
        curve_rows.append(row)
        if bone and re.search(r"(hips|pelvis|root|armature|master|motion|trajectory|global|center|centre)", bone, re.I) and prop == "location":
            root_curves.append(row)

    # Find frame pairs whose complete animated pose and approximate velocity
    # agree. This is diagnostic only; it does not alter the source animation.
    sample_step = max(1.0, (end - start) / 120.0)
    frames = []
    f = start
    while f <= end + 1e-5:
        frames.append(min(f, end))
        f += sample_step
    if frames[-1] < end - 1e-5:
        frames.append(end)

    def pose(frame):
        return [float(fc.evaluate(frame)) for fc in fcurves]

    ranges = [max(0.05, max(float(p.co.y) for p in fc.keyframe_points) - min(float(p.co.y) for p in fc.keyframe_points)) for fc in fcurves]
    eps = max(0.5, sample_step * 0.25)
    candidates = []
    for i, a in enumerate(frames):
        for b in frames[i + 2:]:
            duration = b - a
            if duration < 4.0 or duration > 48.0:
                continue
            pa, pb = pose(a), pose(b)
            pose_error = sum(abs(x-y)/r for x,y,r in zip(pa,pb,ranges)) / max(1,len(ranges))
            va0, va1 = pose(max(start,a-eps)), pose(min(end,a+eps))
            vb0, vb1 = pose(max(start,b-eps)), pose(min(end,b+eps))
            vel_error = sum(abs(((x1-x0)/(min(end,a+eps)-max(start,a-eps) or 1))-((y1-y0)/(min(end,b+eps)-max(start,b-eps) or 1)))/r
                            for x0,x1,y0,y1,r in zip(va0,va1,vb0,vb1,ranges)) / max(1,len(ranges))
            score = pose_error + 0.35 * vel_error
            candidates.append((score, pose_error, vel_error, a, b, duration))
    candidates.sort()

    report = {
        "file": RUN_FILE.name,
        "armature": rig.name,
        "bones": len(rig.data.bones),
        "bone_names": [bone.name for bone in rig.data.bones],
        "action": action.name,
        "frame_range": [round(start, 4), round(end, 4)],
        "fps": bpy.context.scene.render.fps,
        "duration_seconds": round((end-start)/bpy.context.scene.render.fps, 4),
        "fcurve_count": len(fcurves),
        "root_translation_curves": root_curves,
        "pose_seam": {
            "normalized_pose_error_start_end": round(sum(abs(x-y)/r for x,y,r in zip(pose(start),pose(end),ranges))/max(1,len(ranges)), 6),
            "best_cycle_candidates_frames": [
                {"score":round(s,6),"pose_error":round(p,6),"velocity_error":round(v,6),
                 "start":round(a,4),"end":round(b,4),"length_frames":round(d,4),
                 "length_seconds":round(d/bpy.context.scene.render.fps,4)}
                for s,p,v,a,b,d in candidates[:12]
            ]
        },
        "largest_motion_curves": sorted(curve_rows,key=lambda x:x["range"],reverse=True)[:30],
    }
    print("JAY_RUN_ANALYSIS_BEGIN")
    print(json.dumps(report, indent=2))
    print("JAY_RUN_ANALYSIS_END")

if __name__ == "__main__":
    main()
