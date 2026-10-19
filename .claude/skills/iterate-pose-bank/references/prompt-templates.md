# Prompt Templates (proven on Calls #91–#95)

Rules that apply to every template:

- One candidate per call; never request grids, variants or collages.
- Image 1 is always the **base photo being edited**; a solved-joint guide, when used,
  is image 2 and is described as *reference only*.
- Replace the `WARDROBE_LOCK` placeholder with the character's full verbatim wardrobe
  block — never summarize it. For the Athletic SG runner:
  > her identity, face, black high ponytail, crimson singlet with white vertical side
  > stripe, black fitted shorts, sky-blue wristbands on both wrists, white ankle
  > socks, white-and-crimson shoes
- Always end with the framing/background block (strict 90-degree lateral profile, one
  person, no motion blur, perfectly uniform flat matte magenta, no shadow/gradient/
  contact patch).
- ≤ 3 corrections per call. Each correction names a joint, a direction, and an
  angle/landmark ("fold that shin back so the shoe hangs below and slightly behind
  the knee at mid-shin height of the other leg"), never a style word ("more dynamic").

---

## Template A — Pose-delta edit (escaping a wrong pose)

Used by #91 (H03) and #93 (H06).

> Edit image 1, a photorealistic right-facing side-profile studio photo of a female
> runner on a magenta background. Keep WARDROBE_LOCK, plus the camera angle, framing,
> subject scale and lighting exactly as they are. Change only her legs to match the
> joint diagram in image 2 (dark = head and torso centerline, blue = camera-near
> limbs, orange = camera-far limbs, dashed line = ground). {N} corrections:
> 1) {joint correction with direction + angle + landmark}.
> 2) {joint correction}.
> 3) {joint correction}.
> Keep her arms, torso lean and head direction unchanged. Strict 90-degree lateral
> profile, one person only, anatomically plausible frozen running instant, no motion
> blur. Make the entire background one perfectly uniform flat matte magenta with no
> shadow, no gradient, no vignette and no contact patch under the shoes.

## Template B — Repaint-only defect fix (ghosted/spilled part)

Used by #92 (H03 trailing shoe + ground contact) and #94 (H06 tucked shoe); fixed the
defect first try in both cases. The key phrase is **"Do not move any limb."**

> Edit image 1, a photorealistic right-facing side-profile studio photo of a female
> runner on a magenta background. Keep WARDROBE_LOCK, her exact arm, torso and leg
> pose, the camera angle, framing, subject scale and lighting completely unchanged.
> Fix one defect only: the {part, located precisely, e.g. "raised, tucked-up shoe and
> sock behind her left thigh"} has pink and magenta color bleeding on {edges} and does
> not connect cleanly to {adjacent body part}. Repaint that {part} fully solid and
> opaque in {exact materials matching the undamaged counterpart}, make it connect
> seamlessly and continuously to {adjacent part} with no gap and no pink tint, and
> make all of its edges sharp against the background. Do not move any limb. One
> person only, strict 90-degree lateral profile, no motion blur. The entire
> background must be one perfectly uniform flat matte magenta with no shadow, no
> gradient and no contact patch under the shoes.

If the figure also needs a positional nudge (e.g. restore ground contact), add one
clause: "Lower the whole figure very slightly so the toe tip of that same trailing
shoe presses firmly onto the invisible ground, bearing her weight" (#92).

## Template C — Counterpart half-cycle derivation

Used by #95 (H07 from accepted H03). In strict lateral profile, φ and φ+0.5 legs are
near-mirrors; the *visible* half-cycle cues are the arm counter-swing and the
near-limb occlusion order — swap exactly those and nothing else.

> Edit image 1, a photorealistic right-facing side-profile studio photo of a female
> runner on a magenta background, frozen in {concise description of the accepted
> pose}. Keep WARDROBE_LOCK, both legs exactly as posed, the camera angle, framing,
> subject scale and lighting unchanged. This frame is the opposite half of the stride
> cycle, so make two changes: 1) Swap her arm swing: the arm nearest the camera,
> whose full shoulder is visible, now swings {forward/back}, bent about 90 degrees at
> the elbow with {hand landmark}; the far-side arm swings {back/forward} with its
> forearm and {wardrobe cuff detail} partly visible {landmark}. 2) Where the thighs
> meet at the shorts, the {swing/support} leg is the one nearest the camera,
> overlapping in front of the other leg, which sits slightly behind it in depth, very
> subtly less lit. {Repeat flip-prone wardrobe details.} One person only, strict
> 90-degree lateral profile, anatomically plausible, no motion blur. The entire
> background must be one perfectly uniform flat matte magenta with no shadow, no
> gradient and no contact patch under the shoes.
