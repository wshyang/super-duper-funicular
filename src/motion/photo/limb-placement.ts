import { getArm, type Pose } from "../gait";
import { getLimbGeometry, type RoundablePart } from "./end-cuts";
export function getLimbPlacement(name: RoundablePart, pose: Pose) {
  const side = name.startsWith("near-") ? "near" : "far";
  const leg = pose[side],
    width = getLimbGeometry(name).width;
  if (name.endsWith("thigh")) return { start: pose.hip, end: leg.knee, width };
  if (name.endsWith("shin")) return { start: leg.knee, end: leg.foot, width };
  const [shoulder, elbow, wrist] = getArm(
    pose,
    pose.phase + (side === "near" ? 0.5 : 0),
  );
  if (name.endsWith("upper-arm")) return { start: shoulder, end: elbow, width };
  if (name.endsWith("forearm")) return { start: elbow, end: wrist, width };
  return {
    start: wrist,
    end: {
      x: wrist.x + (wrist.x - elbow.x) * 0.28,
      y: wrist.y + (wrist.y - elbow.y) * 0.28,
    },
    width,
  };
}
