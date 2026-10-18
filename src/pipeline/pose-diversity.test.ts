import { describe, expect, it } from 'vitest';
import { DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC } from '../runner/body-proportions.js';
import { solveArticulatedPose } from '../runner/gait.js';
import {
  armQuadrant,
  checkDuplicateAgainstAccepted,
  checkPoseCompliance,
  elbowBin,
  kneeBin,
  observationFromSolvedPose,
  poseAngularDistance,
  swingBin,
  type PoseAnnotation,
} from './pose-diversity.js';

function annotation(overrides: Partial<PoseAnnotation> = {}): PoseAnnotation {
  return {
    candidateId: 'test-1',
    annotatedBy: 'unit-test',
    annotatedAt: '2026-10-18T00:00:00Z',
    confidence: 'measured',
    nearKneeDeg: 150,
    farKneeDeg: 90,
    nearThighSwingDeg: -10,
    farThighSwingDeg: 30,
    nearElbowDeg: 95,
    farElbowDeg: 100,
    nearShoulderSwingDeg: -20,
    farShoulderSwingDeg: 25,
    nearFootState: 'contact',
    farFootState: 'airborne',
    ...overrides,
  };
}

describe('pose-diversity', () => {
  it('derives target observations from solved rig poses', () => {
    const pose = solveArticulatedPose(0, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC);
    const obs = observationFromSolvedPose(pose);
    expect(obs.nearFootState).toBe('contact');
    expect(obs.nearKneeDeg).toBeGreaterThan(0);
    expect(obs.nearKneeDeg).toBeLessThanOrEqual(180);
    const flight = observationFromSolvedPose(solveArticulatedPose(0.375, DEFAULT_GAIT_CONFIG, DEFAULT_RIG_SPEC));
    expect(flight.nearFootState).toBe('airborne');
    expect(flight.farFootState).toBe('airborne');
  });

  it('measures pairwise joint distance with contact/quadrant flags', () => {
    const a = annotation({ candidateId: 'a' });
    const b = annotation({ candidateId: 'b', farKneeDeg: 140 });
    const d = poseAngularDistance(a, b);
    expect(d.maxJointDeltaDeg).toBe(50);
    expect(d.differingJoints[0]?.joint).toBe('farKneeDeg');
    expect(d.contactStateChanged).toBe(false);
  });

  it('flags duplicates only when all diversity axes collapse', () => {
    const prior = annotation({ candidateId: 'prior' });
    const same = annotation({ candidateId: 'same', nearKneeDeg: 152 });
    expect(checkDuplicateAgainstAccepted(same, [prior]).duplicate).toBe(true);
    const diverseJoint = annotation({ candidateId: 'joint', farKneeDeg: 40 });
    expect(checkDuplicateAgainstAccepted(diverseJoint, [prior]).duplicate).toBe(false);
    const diverseContact = annotation({ candidateId: 'contact', farFootState: 'contact' });
    expect(checkDuplicateAgainstAccepted(diverseContact, [prior]).duplicate).toBe(false);
  });

  it('rejects wrong contact state exactly and tolerates small joint drift', () => {
    const target = annotation({ candidateId: 't' });
    const close = annotation({ candidateId: 'c', nearKneeDeg: 160 });
    expect(checkPoseCompliance(close, target).verdict).toBe('pass');
    const wrongContact = annotation({ candidateId: 'w', nearFootState: 'airborne' });
    const contactCheck = checkPoseCompliance(wrongContact, target);
    expect(contactCheck.verdict).toBe('rejected');
    expect(contactCheck.contactMismatch).toBe(true);
    const wrongPhase = annotation({
      candidateId: 'p',
      nearKneeDeg: 60,
      farKneeDeg: 170,
      nearThighSwingDeg: 60,
    });
    expect(checkPoseCompliance(wrongPhase, target).verdict).toBe('rejected');
    const deviated = annotation({ candidateId: 'd', farKneeDeg: 120 });
    expect(checkPoseCompliance(deviated, target).verdict).toBe('deviated');
  });

  it('bins joint angles for the coverage matrix', () => {
    expect(kneeBin(60)).toBe('tucked');
    expect(kneeBin(120)).toBe('mid');
    expect(kneeBin(170)).toBe('extended');
    expect(elbowBin(70)).toBe('tucked');
    expect(swingBin(-30)).toBe('rear');
    expect(swingBin(0)).toBe('neutral');
    expect(swingBin(40)).toBe('forward');
  });

  it('classifies arm quadrants from shoulder-relative wrist position', () => {
    expect(armQuadrant({ x: 0, y: 0 }, { x: 5, y: -5 })).toBe('forward-up');
    expect(armQuadrant({ x: 0, y: 0 }, { x: 5, y: 5 })).toBe('forward-down');
    expect(armQuadrant({ x: 0, y: 0 }, { x: -5, y: 5 })).toBe('rear-down');
  });
});
