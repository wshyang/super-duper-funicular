# Photographic female runner · first implementation

## What was generated
Nine standalone AI images, within the requested ten-image budget. This is **photographic-looking synthesized imagery of a fictional adult Singaporean Chinese woman**, not a photo session with a real person. Identity, skin, hair and kit were guided by the same first reference image; independent generation is not a guarantee of exact anatomical consistency.

| Source | Purpose / camera-facing surface |
|---|---|
| `reference.png` | Full-body identity, lighting, teal singlet / charcoal shorts / light mesh shoe reference |
| `torso.png` | Side torso with obstructing arms removed, reconstructed under-arm fabric, pelvis |
| `head-neck.png` | Left-profile face, hair bun and neck |
| `near-left-arm.png` | Left lateral upper arm and outer forearm |
| `far-right-arm.png` | Right medial upper arm, inner forearm and wrist |
| `near-left-leg-shoe.png` | Left lateral thigh, calf, sock, outside shoe panel |
| `far-right-leg-shoe.png` | Right medial thigh, calf, sock, inside arch shoe panel |
| `near-left-hand.png` | Relaxed running fist viewed dorsally |
| `far-right-hand.png` | Independent relaxed right fist viewed palm-side |

All originals live in `src/images/photo-runner/` and are downloadable in **Asset library → Photographic character kit → Generated source images**. The hand images supplement the original complete-arm images because those first generated hands were open. Original artwork and both pixel personas are preserved. A photographic male kit is not generated in this iteration.

## Why more than a single profile
In a right-facing run viewed from the left, the camera sees the near left limb's lateral surface but the far right limb's medial surface. Mirroring a left lateral shoe doesn't reveal the right shoe's arch panel. Mirroring a dorsal left hand doesn't create the right palm. The pipeline therefore uses distinct source files for each side, with explicit surface descriptions. Unit tests check independent source/hash pairs and positive-determinant transforms (no reflection).

This supplies the needed surfaces for the chosen side-view animation. It does **not** provide front/back/undersole views for an arbitrary turning camera, shoulder axial rotation, foot yaw or a 3D turnaround. Those would need further source coverage or a 3D reconstruction.

## Preprocessing and registration

```sh
.venv/bin/python scripts/prepare_photo_parts.py
.venv/bin/python scripts/test_photo_parts.py
```

`photo_parts.json` stores manually reviewed source-space rectangles, source joint endpoints, feather margins and rounded overlap caps. It creates sixteen RGBA PNGs:

- Torso, pelvis, head, neck.
- Near and far upper arm, forearm, hand.
- Near and far thigh, shin, shoe.

The green key uses a relative green excess, preserving white socks and teal fabric. Largest-component cleanup removes detached background fragments. Edge-only spill correction and rounded, feathered joint overlap reduce green fringes and triangular joint cutoffs. The full-frame generation sources themselves are retained, not destructively altered.

Public URLs: `/photo-runner/<part-name>.png`. Manifest: `/photo-runner/manifest.json`. The manifest records RGBA output dimensions, SHA-256, source image, source crop, surface and crop-local bone endpoints. Original source hashes are in `docs/artwork-inventory.json`.

## Runtime
- Same continuous gait, IK, midfoot-to-toe roll, cervical articulation and forward-lean controls.
- Source bone endpoints map to target bone endpoints with affine rotation/translation/scale. Width calibration is independent of bone length and all transforms preserve orientation.
- Far-side arm/leg → near leg → pelvis/neck/torso → head → near arm. The torso hides the otherwise exposed photographic hip seams; elbows/knees use overlapping rounded textures.
- Image assets load once. Export is disabled until all parts are loaded; errors expose a retry button. No photographic-to-pixel fallback disguises a load failure.
- Photo canvas: 3× backing resolution, smoothing enabled; 1.25× stage inspection zoom. Photo PNG export: **5120×640**, eight **640×640** cells, local ground/origin **(300,552)**, no skeleton. Pixel sheets stay 1280×160.
- Fixed generated teal clothing: shirt-colour controls are disabled for this persona rather than tinting skin or misrepresenting the texture.

## Honest limits / next quality pass
This is a photographic **2D cutout rig prototype**, not photoreal live-action footage. Visible joint joins, lighting/skin/proportion differences between generations, rigid fabric and depth-order limitations remain. The head/torso and limb parts have one calibrated view each; there is no deforming surface mesh, muscle deformation, cloth simulation, occlusion-aware perspective reconstruction or camera rotation. Skin shading doesn't change with bone orientation. For higher fidelity, the next step is consistent multi-view or 3D body capture/reconstruction and deformable joint meshes, rather than just adding more random pose images.

## Rounded hip socket correction
The earlier fixed pelvis crop included a complete static shorts leg, which was painted **over** both moving thighs. The corrected renderer removes that hanging hem with a lower half-ellipse about the hip axis and composites **far leg → pelvis → near leg → torso**. The upper waist remains; the existing thigh cap rotates over the rounded socket. Both the pelvis and overlapping torso tail are masked, without changing the hip pivot or IK.

Select the photographic persona and open the **Hip cut & layer tool** below the stage. It follows the cycle scrubber and provides a magnified original/rounded comparison, cut width/depth, vertical offset and edge feather. The mint arc is the pelvis cut boundary; the yellow cross is the unchanged hip pivot. Controls affect the main runner, thumbnails, onion skins and sheet exports. The original comparison and guides are confined to the inspector.

The cut uses rig-pixel units converted through the part calibration to source pixels. Default radii are 7×4.5, offset 0 and feather 0.6. Cached alpha masks preserve photo texture, not a painted colour substitute. Download a transparent `mei-lin-rounded-pelvis.png` with the same dimensions/anchors as the original crop, and `mei-lin-hip-cut.json` with the session settings and source anchors. Settings are not auto-persisted or auto-imported; source/public crop files remain unchanged. This resolves the large static hem, not every photographic seam or lighting mismatch.

## Rotating element end cutter
Below the hip tool, **Element end cutter** now rounds the moving pieces themselves. Select a near/far thigh, shin, upper arm, forearm or hand, then choose **Start / proximal** or **End / distal**. Each end has its own enabled state, radius and shaft-blend distance; edge feather applies to both.

Unlike the initial beyond-pivot-only crop masks, this cap also constrains the cross-section just inside the pivot. Its rounded shoulder blends into the shaft, eliminating the rectangular corners that can rotate out from behind the socket. Computation uses calibrated bone-local rig pixels, including rendered limb-width compensation; it doesn't relocate pivots or stretch bones.

**Rotation test** draws the selected element on top of a stationary socket, rotating about the chosen pivot. **Assembled joint** follows the real motion cycle and actual painter's layer order. Base-cutout comparison bypasses this new runtime mask only for the selected element: the saved cutout's previous keying/cropping remains. Neither test rotation nor comparison affects the main animation.

The calibrated cuts apply to all three motions, live scene, onion skins, pose strip, hip inspector and PNG sheets. Download the selected element's RGBA PNG with unchanged crop dimensions/pivots, or all endpoint settings and registration metadata as JSON. Settings last for this session; saved JSON is a calibration record, not an automatic import. A 32-entry surface cache avoids repeated pixel processing during playback.

Both thigh and shin ends are rounded by default. Hands retain uncut distal fingers; shoes are excluded because heel/toe anchors describe a sole, not a hinge. The operation only removes pixels. It cannot reconstruct texture already lost in source cropping; enlarging a radius will not grow missing material. Too-small caps can expose gaps, and photo-shading mismatch may still reveal a joint even when its silhouette is smooth.
