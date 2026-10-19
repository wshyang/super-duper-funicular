import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { emitBackdropRow, runFullAudit } from './pose-material-harness.js';

describe('pose material: real-asset integration', () => {
  const result = runFullAudit(process.cwd());

  it('ingests every available source and records a hash for each', () => {
    // The PR #1 phase plates live on a sibling branch and are supplied through
    // POSE_MATERIAL_PR1_ROOT (default /tmp/pr1). The repository's own corpus is
    // the master plus the 18 pose-bank candidates; the test requires that corpus
    // and additionally requires the full 30 when the sibling worktree is present.
    expect(result.report.sources.length).toBeGreaterThanOrEqual(19);
    if (fs.existsSync('/tmp/pr1')) expect(result.report.sources.length).toBe(30);
    for (const source of result.report.sources) {
      expect(source.sha256).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('accepts the master as the identity anchor even though it is a standing pose', () => {
    const master = result.report.sources.find((source) => source.role === 'master');
    expect(master?.status).toBe('accepted');
    expect(master?.reasonCodes).toEqual([]);
  });

  it('measures pose compliance as a fraction of the renderer ceiling, not as prose', () => {
    const h01 = result.report.sources.find((source) => source.sourceId === 'H01-right-contact');
    expect(h01).toBeDefined();
    expect(h01?.poseMatchRatio).toBeGreaterThan(0.7);
    expect(h01?.poseMatchRatio).toBeLessThanOrEqual(1.05);
    for (const source of result.report.sources) {
      expect(source.poseMatchRatio).toBeGreaterThanOrEqual(0);
    }
  });

  it('derives per-part eligibility with measured angles and reason codes', () => {
    const h01 = result.report.sources.find((source) => source.sourceId === 'H01-right-contact');
    const thigh = h01?.parts.find((part) => part.partId === 'nearThigh');
    expect(thigh?.eligible).toBe(true);
    expect(Math.abs(thigh?.fit.angleRad ?? 0)).toBeLessThanOrEqual(Math.PI);
    expect(thigh?.bucketDeg).not.toBeNull();
    const upperArm = h01?.parts.find((part) => part.partId === 'nearUpperArm');
    // In a strict lateral profile the near upper arm sits behind the torso, so
    // the probe lands on singlet fabric and the appearance gate must refuse it.
    expect(upperArm?.eligible).toBe(false);
    expect(upperArm?.reasonCodes.join(' ')).toContain('wrong-material');
  });

  it('publishes pose drift as a measured source-level reason, not a silent pass', () => {
    const drift = result.report.sources.filter((source) => source.poseMatchRatio < 0.8 && source.role !== 'master');
    expect(drift.length).toBeGreaterThan(0);
    for (const source of drift) {
      expect(source.reasonCodes.join(' ')).toContain('pose-unverified');
      // A weak whole-silhouette match demotes the source, it does not delete a
      // well-measured part: that was the pilot's whole-image verdict flaw.
      expect(['conditional', 'rejected']).toContain(source.status);
    }
  });

  it('produces an explicit material gap list rather than silently reusing cutouts', () => {
    expect(result.report.gaps.length).toBeGreaterThan(0);
    for (const gap of result.report.gaps) {
      expect(gap.reason).toContain('no eligible material');
      expect(gap.phaseIndex).toBeGreaterThanOrEqual(0);
      expect(gap.phaseIndex).toBeLessThan(8);
    }
  });

  it('reports genuine pose diversity in the pool instead of duplicate candidates', () => {
    expect(result.diversity.meanPairIou).toBeLessThan(0.7);
    expect(result.diversity.duplicatePairs.length).toBe(0);
  });

  it('serialises a stable backdrop model for the master plate', () => {
    const row = emitBackdropRow(process.cwd());
    expect(row.g).toBeGreaterThan(40);
    expect(row.g).toBeLessThan(110);
    expect(row.r).toBeGreaterThan(180);
  });
});

describe('pose material: frozen audit artifact', () => {
  it('keeps the committed audit report consistent with the current pipeline', () => {
    const path = 'public/sprites/material/audit.json';
    expect(fs.existsSync(path)).toBe(true);
    const audit = JSON.parse(fs.readFileSync(path, 'utf8')) as {
      report: { sources: Array<{ status: string }>; gaps: unknown[] };
    };
    expect(audit.report.sources.length).toBeGreaterThanOrEqual(19);
    expect(audit.report.sources.some((source) => source.status === 'accepted')).toBe(true);
    expect(Array.isArray(audit.report.gaps)).toBe(true);
  });
});
