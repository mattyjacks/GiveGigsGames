import bpy
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUTPUT = ASSETS / "3d" / "jay" / "jay-unified.glb"
CLIPS = [
    ("Breathing Idle.fbx", "Idle"),
    ("Running.fbx", "Run"),
    ("Running Jump.fbx", "Jump"),
    ("Running Slide.fbx", "Slide"),
    ("Shoulder Hit And Fall.fbx", "Fall"),
]

def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.cameras, bpy.data.lights):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)

def import_fbx(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.fbx(filepath=str(path), use_anim=True, automatic_bone_orientation=False)
    return [obj for obj in bpy.data.objects if obj not in before]

def find_armature(objects, label):
    rigs = [obj for obj in objects if obj.type == "ARMATURE"]
    if not rigs:
        raise RuntimeError(f"{label}: FBX did not import an armature.")
    rigs.sort(key=lambda obj: len(obj.data.bones), reverse=True)
    return rigs[0]

def remove_horizontal_root_drift(action):
    """Convert the Mixamo locomotion clip into an in-place cyclic run.

    Blender uses Y-up, so X and Z are horizontal. Preserve the initial hips
    position and every cyclic bob/rotation, but subtract the linear net travel
    from any horizontal Hips location channel.
    """
    frame_start, frame_end = action.frame_range
    if frame_end <= frame_start:
        raise RuntimeError("Run action has an invalid frame range.")

    hips_path = 'pose.bones["mixamorig:Hips"].location'
    horizontal_curves = [
        fc for fc in action.fcurves
        if fc.data_path == hips_path and fc.array_index in (0, 2)
    ]
    if not horizontal_curves:
        raise RuntimeError("Run action has no horizontal Mixamo Hips location channels.")

    corrected = []
    for fc in horizontal_curves:
        start_value = float(fc.evaluate(frame_start))
        end_value = float(fc.evaluate(frame_end))
        drift = end_value - start_value
        if abs(drift) < 1e-4:
            continue

        duration = frame_end - frame_start
        for point in fc.keyframe_points:
            t = (float(point.co.x) - frame_start) / duration
            point.co.y -= drift * t
            for handle in (point.handle_left, point.handle_right):
                handle_t = (float(handle.x) - frame_start) / duration
                handle.y -= drift * handle_t
        fc.update()

        remaining = float(fc.evaluate(frame_end)) - float(fc.evaluate(frame_start))
        if abs(remaining) > 1e-3:
            raise RuntimeError(
                f"Failed to remove root drift from {fc.data_path}[{fc.array_index}]: "
                f"remaining={remaining:.6f}"
            )
        corrected.append({
            "axis": fc.array_index,
            "removed_drift": round(drift, 6),
            "remaining_drift": round(remaining, 8),
        })

    if not corrected:
        raise RuntimeError("Run action contains no measurable horizontal root drift to remove.")

    return {
        "frame_start": frame_start,
        "frame_end": frame_end,
        "duration_frames": frame_end - frame_start,
        "corrected_channels": corrected,
    }


def main():
    reset_scene()
    base_path = ASSETS / "Aj.fbx"
    if not base_path.is_file():
        raise FileNotFoundError(base_path)
    base_objects = import_fbx(base_path)
    rig = find_armature(base_objects, "Aj.fbx")
    meshes = [obj for obj in base_objects if obj.type == "MESH"]
    if not meshes:
        raise RuntimeError("Aj.fbx imported no character mesh.")
    bone_names = {bone.name for bone in rig.data.bones}
    print(f"BASE rig={rig.name}, bones={len(bone_names)}, meshes={len(meshes)}")

    installed = []
    for filename, clip_name in CLIPS:
        path = ASSETS / filename
        if not path.is_file():
            raise FileNotFoundError(path)
        imported = import_fbx(path)
        source_rig = find_armature(imported, filename)
        action = source_rig.animation_data.action if source_rig.animation_data else None
        if action is None:
            candidates = [a for a in bpy.data.actions if len(a.fcurves) > 0]
            if not candidates:
                raise RuntimeError(f"{filename}: no animation action was imported.")
            action = candidates[-1]
        action = action.copy()
        action.name = clip_name
        action.use_fake_user = True

        if clip_name == "Run":
            # Preserve the supplied root-motion Run clip, and add a second
            # animation with its linear forward travel removed. This new clip
            # is designed for endless runners where the game world moves.
            run_loop = action.copy()
            run_loop.name = "Run_InPlace"
            run_loop.use_fake_user = True
            run_report = remove_horizontal_root_drift(run_loop)
            rig.animation_data_create()
            rig.animation_data.action = run_loop
            installed.append(("Run_InPlace", len(run_loop.fcurves),
                              len({fc.data_path for fc in run_loop.fcurves}), run_report))
            print("RUN_IN_PLACE_VERIFIED", run_report)

        paths = [fc.data_path for fc in action.fcurves]
        animated_bones = {
            p.split('"')[1] for p in paths
            if 'pose.bones["' in p
        }
        missing = sorted(animated_bones - bone_names)
        if missing:
            raise RuntimeError(
                f"{filename}: animation rig is incompatible with Aj.fbx; "
                f"missing bones: {', '.join(missing[:12])}"
            )

        # FBX action channels are bone-name based. Reassign the imported clip
        # to the one production rig, then remove the temporary imported rig.
        rig.animation_data_create()
        rig.animation_data.action = action
        installed.append((clip_name, len(action.fcurves), len(animated_bones)))
        for obj in imported:
            if obj == rig:
                continue
            bpy.data.objects.remove(obj, do_unlink=True)

    # FBX imports leave their original temporary actions in Blender's datablocks.
    # Remove those source actions so only the five production clips are exported.
    production_actions = {"Idle", "Run", "Run_InPlace", "Jump", "Slide", "Fall"}
    for candidate in list(bpy.data.actions):
        if candidate.name not in production_actions:
            bpy.data.actions.remove(candidate)

    # Keep a single skinned character and a single armature in the export.
    bpy.ops.object.select_all(action="DESELECT")
    for obj in base_objects:
        if obj.name in bpy.data.objects:
            obj.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_nla_strips=False,
        export_force_sampling=True,
        export_skins=True,
        export_apply=True,
        export_yup=True,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_image_quality=80,
        export_cameras=False,
        export_lights=False,
    )
    size = OUTPUT.stat().st_size
    print("EXPORTED", OUTPUT, size, "bytes")
    print("CLIPS", installed)
    if size <= 0:
        raise RuntimeError("GLB export produced an empty file.")

    # Validate the actual GLB JSON payload, not merely the existence of a file.
    with OUTPUT.open("rb") as stream:
        magic, version, total_length = struct.unpack("<4sII", stream.read(12))
        if magic != b"glTF" or version != 2 or total_length != size:
            raise RuntimeError("Exported file is not a valid GLB 2.0 container.")
        chunk_length, chunk_type = struct.unpack("<I4s", stream.read(8))
        if chunk_type != b"JSON":
            raise RuntimeError("GLB JSON chunk is missing.")
        document = json.loads(stream.read(chunk_length).decode("utf-8").rstrip(" \\t\\r\\n\\0"))
    if not document.get("skins") or not document.get("meshes"):
        raise RuntimeError("GLB must contain a skinned character mesh.")
    exported_names = [item.get("name") for item in document.get("animations", [])]
    required_names = {"Idle", "Run", "Run_InPlace", "Jump", "Slide", "Fall"}
    if set(exported_names) != required_names or len(exported_names) != len(required_names):
        raise RuntimeError(
            "GLB must contain exactly the five production clips. Exported: "
            + ", ".join(str(name) for name in exported_names)
        )
    print("GLB VERIFIED", {
        "meshes": len(document["meshes"]),
        "skins": len(document["skins"]),
        "animations": sorted(exported_names),
        "animationCount": len(exported_names),
    })

if __name__ == "__main__":
    main()
