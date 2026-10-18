# Concrete v1 Implementation — AI Art to 3D Runner to Sprite Sheet

**This is a selected pilot recipe, not a menu of architectures.** It uses one fictional athletic runner, one AI-generated design, one textured image-to-3D model, one standard run cycle, and a fixed 16-frame sprite output. The 3D work is offline; the final consumer gets PNGs.

## Chosen tools and pilot defaults

| Job | Tool / setting |
|---|---|
| Concept/reference art | Arena image generation; save prompts and outputs under `assets/ai/runner-athletic/source/` |
| Image-to-3D | Tripo AI image-to-3D; export a textured `.glb` |
| Auto-rig and starter motion | Mixamo; upload a cleaned FBX, auto-rig, select a run animation, download FBX with skin |
| Cleanup, foot-contact correction, camera, render | Blender 4.5 LTS; Cycles, 64 samples with denoising; 24 fps |
| Sprite output | 16 RGBA frames, each `220 × 256`; 4 × 4 atlas `880 × 1024`; top-origin ground line `y = 234` |
| Atlas packer | Python 3.11 + Pillow 13; implemented at [`../tools/sprite_pipeline/pack_atlas.py`](../tools/sprite_pipeline/pack_atlas.py) |

Tripo and Mixamo are external authoring steps. The current checkout has neither a `.glb`/`.blend` character nor Blender installed, so it cannot honestly claim a rendered character yet. The packer and its tests are local and reproducible; the external model/animation is the only art-production prerequisite.

## Exact implementation steps

### 1. Generate and approve the character design

Use one fictional adult athletic runner as the pilot. Generate **separate images**, not a turnaround collage:

1. A full-body, three-quarter view in a neutral A-pose for image-to-3D. Keep arms slightly away from the torso, hands visible, legs slightly apart, both shoes fully visible.
2. A strict right-facing side-profile reference for the final sprite silhouette.
3. Optional face, hair, shoe, and clothing-detail references only if the 3D result needs them.

For images 2–3, use image 1 as the identity reference. Reject any image that changes the person, outfit, limb count, view, or proportions. Save the exact prompt and reference-image paths beside each image. Do not use another persona's body as an edit template.

**Prompt for image 1 (draft to use verbatim if accepted):**

> Photorealistic studio reference of one fictional adult athletic runner, full body, neutral anatomical A-pose with arms held slightly away from the torso and legs slightly separated so both limbs are visible, natural adult proportions, standing still, three-quarter front view, entire head and both shoes inside frame. She wears a crimson running singlet with one white side stripe, charcoal running shorts, blue wristbands, white socks, and white running shoes. Plain neutral grey studio background, soft even light, realistic skin and fabric texture, no motion blur, no extra person, no props, no logos, no text, no watermark.

The image is **design input**, not the final sprite. Approve it before spending time on a 3D conversion.

### 2. Convert the approved image to a textured 3D model

1. Upload image 1 to Tripo's image-to-3D flow.
2. Request one complete human character with the full outfit and hair, a neutral A-pose, a single connected character, and a textured model. Do not request an animation or background scene.
3. Export `runner_athletic_v1.glb` with its texture/material files.
4. Save the returned model, texture, service/settings, source image hash, and generation date under `assets/ai/runner-athletic/model-source/`.
5. Reject the model if limbs are fused, the body is incomplete, the front/back is inconsistent, or the costume is not recognizable. Do not “fix” those problems by hoping they disappear at sprite resolution.

### 3. Clean the mesh in Blender before rigging

1. Import `runner_athletic_v1.glb` into Blender 4.5 LTS.
2. Set scene units to Metric; orient the runner so forward is world `+X`, height is `+Z`, and the profile camera will sit on the `-Y` side. Apply object rotation and scale.
3. Set the mesh to stand on `Z = 0`; target a model height of `1.70 m` for this pilot. Keep the generated PBR texture. If it is missing or badly stretched, UV unwrap and project/paint from the approved AI references; inspect the UV seams on the singlet stripe, shorts, skin, hair, and shoes.
4. Inspect deformation topology around shoulders, elbows, hips, knees, and ankles. If the generated mesh has holes, detached islands, or unusable edge flow, repair/retopologize it now. AI image-to-3D output is a starting mesh, not a production-ready rig.
5. Export `runner_athletic_v1.fbx` with mesh and textures for auto-rigging. Keep the cleaned `.blend` and `.fbx` in `assets/ai/runner-athletic/working/`.

### 4. Auto-rig and get a starter run cycle

1. Upload the cleaned FBX to Mixamo.
2. Place the standard chin, wrist, elbow, knee, and groin markers; run auto-rig. Preview the rig in a neutral pose before downloading.
3. Select a **running-in-place** animation. Avoid a clip with large forward root translation; the sprite should stay centered.
4. Download FBX **with skin**. Import it into Blender and rename the action `RunSource` and the armature `RunnerArmature`.
5. Set the cycle to one complete stride. Add a loop endpoint one frame after the last rendered frame and make its pose match the first frame. Render the 16 samples from the cycle interval while excluding that duplicate endpoint.
6. In Blender, correct sliding or sinking feet with IK controls. Add two named sole markers, `CONTACT_L` and `CONTACT_R`, parented to their respective foot bones at the outsole contact point. During a support interval, pin that marker to `Z = 0`; do not measure whichever foot happens to be lowest in the image.
7. Save the deliverable scene as `assets/ai/runner-athletic/runner_athletic_v1.blend`. Save the Mixamo animation name, source frame interval, and support-foot intervals in `run_config.json` beside it.

### 5. Set the sprite camera and render settings

In the saved Blender scene:

- Camera: orthographic, looking from world `-Y` toward the runner; the character faces screen-right (`+X`). No camera rotation or zoom changes across frames.
- Output: `220 × 256`, 100%, PNG, RGBA, transparent film/background. Use a shadow-catcher floor only if the shadow is deliberately wanted in the sprite; otherwise render no floor.
- Render: Cycles, 64 samples, denoising enabled, fixed color-management settings and fixed lights for the whole cycle.
- Scale/placement: with a 1.70 m model and a 2.00 m orthographic vertical span, center the camera so the outsole baseline lands at image row `234` (row numbering from the top) and the head stays inside the canvas. Adjust once on the neutral pose, then lock it.
- Animation: render exactly 16 evenly spaced samples from the chosen stride. Do not add root drift to make the cycle appear to run; the legs/body animate in place and the consumer controls translation.

Render to:

```text
build/runner-athletic-v1/frames/frame_00.png
...
build/runner-athletic-v1/frames/frame_15.png
```

Review `RunSource` in Blender first and record one state per rendered frame in `build/runner-athletic-v1/contacts.json`. Use the `CONTACT_L` / `CONTACT_R` sole markers and image coordinates (origin at top-left):

```json
{
  "coordinateOrigin": "top-left",
  "groundLineYFromTop": 234,
  "frames": [
    {"index": 0, "state": "support", "supportFoot": "R", "solePointPx": [110, 234]},
    {"index": 1, "state": "support", "supportFoot": "R", "solePointPx": [111, 235]},
    {"index": 2, "state": "flight", "supportFoot": null, "solePointPx": null}
  ]
}
```

The example shows the format only; the real file must contain exactly 16 entries, indices `0..15`, with the observed support state and marker position for each frame. This makes the contact claim specific to the expected foot rather than whichever foot is lowest.

### 6. Pack the frames with the repository's atlas tool

Install the pinned atlas dependency and run the tested packer:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r tools/sprite_pipeline/requirements.txt
python -m unittest discover -s tools/sprite_pipeline/tests -t .

python tools/sprite_pipeline/pack_atlas.py \
  build/runner-athletic-v1/frames \
  build/runner-athletic-v1/runner-athletic-run-16.png \
  --frame-count 16 --columns 4 --fps 24 --ground-y 234 \
  --contacts build/runner-athletic-v1/contacts.json --max-contact-error-px 1
```

The packer requires consecutive files `frame_00.png` through `frame_15.png`, identical dimensions, an alpha channel, and transparent background pixels. It does not resize or recolor the frames. It writes the `880 × 1024` atlas and a JSON manifest containing per-frame and atlas hashes, cell rectangles, alpha bounds, frame rate, loop duration, contact state, expected support foot, sole coordinates, and ground error. The contact gate passes only when every named support sole is within the configured tolerance; the manifest still leaves visual approval pending. The output remains a **candidate** until the human review is signed off.

### 7. Run the acceptance review

Accept the pilot only when all of these pass:

1. **Technical:** exactly 16 PNG frames; every frame is `220 × 256` RGBA; packer unit tests pass; atlas is `880 × 1024`; manifest hashes match; no frame is blank or unexpectedly opaque.
2. **Framing:** same camera/scale across all frames; head, hands, and shoes are not clipped; subject remains centered; baseline does not jump.
3. **Motion:** left/right support alternates; no exact repeated pose unless intentional; loop frame 16→frame 0 has no visible pop; run cycle has readable contact, pass, flight, and opposite contact.
4. **Foot contact:** for every support frame, check the **expected** `CONTACT_L` or `CONTACT_R` marker against the ground. Starting tolerance is ±1 px; more than 2 px of penetration is a failure. Flight clearance is recorded separately.
5. **Visual:** view the 4×4 sheet at native size and magnified. Reject visible identity/texture changes, clothing flicker, broken limbs, foot sliding, and obvious deformation at joints. Zero alpha islands does not override a visible defect.
6. **Provenance:** archive the approved AI references, prompt logs, Tripo model/texture, Mixamo animation identity, Blender file hash, render settings, contact table, and final atlas manifest. Keep working renders and large 3D intermediates out of normal Git history; store them in project artifact storage or LFS if they must be shared.

If the mesh/texture fails, regenerate or repair the **source/model** before adjusting the renderer. If the model passes neutral review but fails only during deformation, fix the rig/weights/IK. If the sprite passes at target size, promote the atlas and manifest as one reviewed release.

## What this implements now, and what blocks the first render

The atlas packer is implemented and tested in this repository. The original checkout has no 3D model, and this sandbox has no Blender executable or connected Tripo/Mixamo service. Therefore the model-generation, auto-rig, and Blender-render steps cannot be truthfully reported as executed here. The first required input to proceed past Step 2 is the approved textured `.glb`; once supplied, the remaining steps have fixed names, settings, output paths, and acceptance checks.
