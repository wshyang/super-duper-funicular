import type { PlateAcceptanceReport } from './cv-acceptance-gates.js';

/**
 * Manifest-Driven Batch Generation Harness (revised pipeline G5).
 *
 * Generation requests are declared as data (a manifest), executed by a
 * batch job outside the agent turn loop (side-stepping the platform's
 * 10-image-per-turn cap), and accepted or rejected by the automated
 * CV acceptance gates. Only rejected plates escalate to a human, with
 * an auto-drafted regeneration justification that feeds the verbatim
 * prompt-log discipline in `docs/FDS.md#image-prompt-log`.
 */

export type PlateClass =
  | 'master'
  | 'head'
  | 'torso'
  | 'pelvis'
  | 'limb'
  | 'phase-frame';

export interface PlateManifestEntry {
  readonly plateId: string;
  readonly filePath: string;
  readonly prompt: string;
  readonly requiredPromptTokens: readonly string[];
  readonly plateClass: PlateClass;
}

export interface GenerationManifest {
  readonly personaId: string;
  readonly entries: readonly PlateManifestEntry[];
}

export interface PromptContractResult {
  readonly pass: boolean;
  readonly missingTokens: readonly string[];
}

export interface ManifestValidationIssue {
  readonly plateId: string;
  readonly ruleId: string;
  readonly message: string;
}

export function verifyPromptContract(
  entry: PlateManifestEntry,
): PromptContractResult {
  const missingTokens = entry.requiredPromptTokens.filter(
    (token) => !entry.prompt.includes(token),
  );
  return {
    pass: missingTokens.length === 0,
    missingTokens,
  };
}

export function validateGenerationManifest(
  manifest: GenerationManifest,
  existingPlateIds: readonly string[],
): ManifestValidationIssue[] {
  const issues: ManifestValidationIssue[] = [];
  const seenIds = new Set<string>();
  for (const entry of manifest.entries) {
    collectManifestIssues(
      entry,
      manifest,
      seenIds,
      existingPlateIds,
      issues,
    );
  }
  return issues;
}

function collectManifestIssues(
  entry: PlateManifestEntry,
  manifest: GenerationManifest,
  seenIds: Set<string>,
  existingPlateIds: readonly string[],
  issues: ManifestValidationIssue[],
): void {
  if (seenIds.has(entry.plateId)) {
    issues.push({
      plateId: entry.plateId,
      ruleId: 'duplicate-plate-id',
      message: `plateId "${entry.plateId}" appears more than once`,
    });
  }
  seenIds.add(entry.plateId);
  if (!entry.prompt.trim()) {
    issues.push({
      plateId: entry.plateId,
      ruleId: 'empty-prompt',
      message: 'prompt must not be empty',
    });
  }
  const contract = verifyPromptContract(entry);
  if (!contract.pass) {
    issues.push({
      plateId: entry.plateId,
      ruleId: 'prompt-contract',
      message: `missing required prompt tokens: ${contract.missingTokens.join(', ')}`,
    });
  }
  if (!existingPlateIds.includes(entry.filePath)) {
    issues.push({
      plateId: entry.plateId,
      ruleId: 'unknown-file',
      message: `filePath "${entry.filePath}" is not a known plate path`,
    });
  }
  if (manifest.personaId.trim() === '') {
    issues.push({
      plateId: entry.plateId,
      ruleId: 'empty-persona',
      message: 'manifest personaId must not be empty',
    });
  }
}

export function draftRegenerationJustification(
  entry: PlateManifestEntry,
  report: PlateAcceptanceReport,
): string {
  const failedSummaries = report.failedGateIds.map(
    (gateId) => summarizeFailedGate(gateId, report),
  );
  return [
    `Regeneration of ${entry.filePath} (${entry.plateId}) is required:`,
    `the plate failed the automated CV acceptance gates: ${failedSummaries.join('; ')}.`,
    'Prompt adjustments applied per the failure evidence above;',
    'all prior prompts remain preserved in docs/FDS.md#image-prompt-log.',
  ].join(' ');
}

function summarizeFailedGate(
  gateId: string,
  report: PlateAcceptanceReport,
): string {
  const gate = report.gates.find((candidate) => candidate.gateId === gateId);
  if (!gate) {
    return `${gateId} (no score)`;
  }
  return `${gateId} [${gate.detail}]`;
}
