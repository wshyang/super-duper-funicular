import { describe, expect, it } from 'vitest';
import {
  draftRegenerationJustification,
  validateGenerationManifest,
  verifyPromptContract,
  type GenerationManifest,
  type PlateManifestEntry,
} from './generation-manifest.js';
import type { PlateAcceptanceReport } from './cv-acceptance-gates.js';

const BASE_ENTRY: PlateManifestEntry = {
  plateId: 'master-lateral-profile',
  filePath: 'src/images/photoreal-female/01-master-lateral-profile-reference.png',
  prompt:
    'full-body right-facing 90 degree lateral profile studio reference on solid #FF00FF magenta, ONE SINGLE PERSON ONLY',
  requiredPromptTokens: ['90 degree', 'ONE SINGLE PERSON ONLY'],
  plateClass: 'master',
};

const REPORT: PlateAcceptanceReport = {
  plateId: BASE_ENTRY.plateId,
  gates: [
    {
      gateId: 'single-subject',
      pass: false,
      score: 2,
      detail: '2 foreground subjects',
    },
    {
      gateId: 'chroma-background-uniformity',
      pass: true,
      score: 0.99,
      detail: 'border-band magenta coverage 99.0%',
    },
  ],
  overallPass: false,
  failedGateIds: ['single-subject'],
};

function buildManifest(
  entries: readonly PlateManifestEntry[],
): GenerationManifest {
  return { personaId: 'photo-sg-chinese-female', entries };
}

describe('generation manifest harness', () => {
  it('verifies required prompt tokens for the anti-twist and single-subject contracts', () => {
    const contract = verifyPromptContract(BASE_ENTRY);
    expect(contract.pass).toBe(true);
    expect(contract.missingTokens).toHaveLength(0);
  });

  it('flags a prompt missing its anti-camera-twist token', () => {
    const entry: PlateManifestEntry = {
      ...BASE_ENTRY,
      prompt: 'full-body runner on magenta',
    };
    const contract = verifyPromptContract(entry);
    expect(contract.pass).toBe(false);
    expect(contract.missingTokens).toEqual([
      '90 degree',
      'ONE SINGLE PERSON ONLY',
    ]);
  });

  it('validates a clean manifest with no issues', () => {
    const issues = validateGenerationManifest(
      buildManifest([BASE_ENTRY]),
      [BASE_ENTRY.filePath],
    );
    expect(issues).toHaveLength(0);
  });

  it('reports duplicate plate ids, empty prompts, and unknown files', () => {
    const duplicate: PlateManifestEntry = {
      ...BASE_ENTRY,
      filePath: 'src/images/other.png',
    };
    const issues = validateGenerationManifest(
      buildManifest([BASE_ENTRY, duplicate]),
      [BASE_ENTRY.filePath],
    );
    expect(issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining([
        'duplicate-plate-id',
        'unknown-file',
      ]),
    );
  });

  it('rejects an empty prompt and an empty persona id', () => {
    const emptyPrompt: PlateManifestEntry = {
      ...BASE_ENTRY,
      prompt: '   ',
    };
    const issues = validateGenerationManifest(
      buildManifest([emptyPrompt]),
      [BASE_ENTRY.filePath],
    );
    expect(issues.map((issue) => issue.ruleId)).toEqual(
      expect.arrayContaining(['empty-prompt']),
    );
    const emptyPersona = buildManifest([BASE_ENTRY]);
    const personaIssues = validateGenerationManifest(
      { ...emptyPersona, personaId: '  ' },
      [BASE_ENTRY.filePath],
    );
    expect(
      personaIssues.map((issue) => issue.ruleId),
    ).toContain('empty-persona');
  });

  it('drafts a regeneration justification naming every failed gate', () => {
    const justification = draftRegenerationJustification(
      BASE_ENTRY,
      REPORT,
    );
    expect(justification).toContain('single-subject');
    expect(justification).toContain('2 foreground subjects');
    expect(justification).toContain(
      'docs/FDS.md#image-prompt-log',
    );
  });
});
