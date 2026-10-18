import { solveArticulatedPose } from '../src/runner/gait.js';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../src/runner/body-proportions.js';
import { observationFromSolvedPose } from '../src/pipeline/pose-diversity.js';
const KEYS = ['H01','H02','H03','H04','H05','H06','H07','H08'];
for (let f = 0; f < 8; f++) {
  const o = observationFromSolvedPose(solveArticulatedPose(f / 8, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC));
  console.log(`${KEYS[f]} nearKnee=${o.nearKneeDeg}(${o.nearFootState}) farKnee=${o.farKneeDeg}(${o.farFootState}) nearThigh=${o.nearThighSwingDeg} farThigh=${o.farThighSwingDeg} nearSh=${o.nearShoulderSwingDeg} farSh=${o.farShoulderSwingDeg} nearEl=${o.nearElbowDeg} farEl=${o.farElbowDeg} torso=${o.torsoLeanDeg}`);
}
