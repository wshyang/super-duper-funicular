# Motion profiles

Select **Running**, **Walking** or **Brisk walking** above the stage. All work with Wei Ming, Mei Lin and Mei Lin · Photo, including neck articulation, foot roll, hip masking, skeleton/onion overlays and export.

| Profile | Default steps/min | Foot travel (rig px) | Lift (rig px) | Lean | Stance per leg |
|---|---:|---:|---:|---:|---:|
| Running | 168 | 36 | 25 | 10° | 36% |
| Walking | 108 | 28 | 7 | 2° | 62% |
| Brisk walking | 132 | 32 | 9 | 4° | 56% |

## How walking differs
- **No airborne interval:** the feet are still half a cycle apart, but each stays in support more than 50% of the cycle. Regular walking has two 12%-of-cycle double-support windows; brisk walking has two 6% windows.
- **Heel → flat → toe:** −15° heel-strike pitch settles flat in early stance. Later stance raises the heel toward a 40° toe-off. Support pivots remain stationary relative to the travelling ground. In swing, position and pitch recover smoothly into the next heel contact.
- **Less clearance:** the foot swings near the ground, unlike the higher running recovery.
- **Taller posture:** a higher pelvis and small mid-stance rise produce straighter supporting legs; reduced lean and upper-body sway avoid the compressed running pose.
- **Relaxed arms:** smaller opposed swings with slightly bent, downward forearms instead of running's strongly flexed elbows. Brisk walking has a stronger swing than regular walking.
- **Same rig:** segment lengths, near/far surfaces, photographic depth order and hip-cut calibration are preserved. No new generated photos were needed.

## Controls and output
Each profile has its own tested parameter ranges and remembers edits within the session. Switching motion preserves phase, playback, character and hip settings, but is an immediate pose change—not a blended transition. Reset applies to the selected profile only. The source sheet remains a running-only comparison.

The eight-frame strip labels the near leg's walking phase; the stage support indicator reports either near foot, far foot or double support. Some eight-frame samples share a label because physiological intervals don't all have equal duration. Ground movement uses the selected stance duty rather than running's fixed duty.

PNG exports retain their existing dimensions (1280×160 pixel characters, 5120×640 photographic character) and use `running-cycle`, `walking-cycle` or `brisk-walking-cycle` in the filename. Thumbnails have extra vertical padding for the taller walking posture. Photographic hands retain their generated relaxed-fist shape; they are not newly reconstructed open walking hands.

## Limits
These are stylized planar kinematic gait profiles, not clinical biomechanics, terrain adaptation, inverse dynamics or speed-driven transitions. Stride and lift are rig pixels, not metres. Existing photographic joint seams and fixed-camera limitations remain. New motion families can share the profile/renderer contracts, but substantially different motions will need their own contact and pose models.
