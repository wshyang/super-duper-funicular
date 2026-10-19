/**
 * Enforces the Agent Skills format on every skill in `.claude/skills/`.
 *
 * Rules come from the published format and authoring guidance:
 *  - `SKILL.md` exists and its YAML frontmatter starts on line 1;
 *  - `name` matches the directory, is kebab-case, <= 64 chars;
 *  - `description` is present, <= 1024 chars, states what and when, has no XML;
 *  - the body stays under 500 lines (progressive disclosure);
 *  - every relative reference in the body resolves to a real file.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();
const skillsRoot = path.join(repoRoot, '.claude/skills');

interface SkillFile {
  readonly directory: string;
  readonly name: string;
  readonly description: string;
  readonly body: string;
  readonly bodyLines: number;
}

function parseFrontmatter(text: string): { fields: Record<string, string>; body: string } | null {
  const lines = text.split('\n');
  if ((lines[0] ?? '').trim() !== '---') return null;
  const close = lines.indexOf('---', 1);
  if (close < 0) return null;
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1, close)) {
    const match = /^([a-z][a-z0-9-]*):\s*(.*)$/.exec(line);
    if (match) fields[match[1] ?? ''] = (match[2] ?? '').trim();
  }
  return { fields, body: lines.slice(close + 1).join('\n') };
}

function loadSkills(): SkillFile[] {
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const directory = entry.name;
      const skillPath = path.join(skillsRoot, directory, 'SKILL.md');
      const text = fs.readFileSync(skillPath, 'utf8');
      const parsed = parseFrontmatter(text);
      return {
        directory,
        name: parsed?.fields['name'] ?? '',
        description: parsed?.fields['description'] ?? '',
        body: parsed?.body ?? '',
        bodyLines: text.split('\n').length,
      };
    });
}

/** Markdown links and inline paths that point at skill-local files. */
function collectLocalReferences(body: string): string[] {
  const references = new Set<string>();
  for (const match of body.matchAll(/`((?:references|assets|scripts)\/[A-Za-z0-9._/-]+)`/g)) {
    references.add(match[1] ?? '');
  }
  for (const match of body.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1] ?? '';
    if (!target.startsWith('http') && !target.startsWith('#')) references.add(target);
  }
  return [...references].filter((reference) => reference.length > 0);
}

describe('Agent Skills format', () => {
  const skills = loadSkills();

  it('finds at least one skill and every skill has SKILL.md', () => {
    expect(skills.length).toBeGreaterThan(0);
    for (const skill of skills) {
      expect(fs.existsSync(path.join(skillsRoot, skill.directory, 'SKILL.md'))).toBe(true);
    }
  });

  it('declares frontmatter that starts on line 1 with a matching kebab-case name', () => {
    for (const skill of skills) {
      expect(skill.name, `${skill.directory}: missing name`).not.toBe('');
      expect(skill.name, `${skill.directory}: name must match directory`).toBe(skill.directory);
      expect(skill.name.length, `${skill.directory}: name too long`).toBeLessThanOrEqual(64);
      expect(skill.name, `${skill.directory}: name must be kebab-case`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('writes a description that says what the skill does and when to use it', () => {
    for (const skill of skills) {
      const description = skill.description;
      expect(description.length, `${skill.directory}: empty description`).toBeGreaterThan(40);
      expect(description.length, `${skill.directory}: description over 1024 chars`).toBeLessThanOrEqual(1024);
      expect(description, `${skill.directory}: XML in description`).not.toMatch(/[<>]/);
      expect(description.toLowerCase(), `${skill.directory}: description lacks a trigger`).toContain('use when');
    }
  });

  it('keeps every skill body under 500 lines', () => {
    for (const skill of skills) {
      expect(skill.bodyLines, `${skill.directory}: body too long`).toBeLessThanOrEqual(500);
    }
  });

  it('resolves every skill-local file reference', () => {
    for (const skill of skills) {
      const skillDir = path.join(skillsRoot, skill.directory);
      for (const reference of collectLocalReferences(skill.body)) {
        expect(fs.existsSync(path.join(skillDir, reference)), `${skill.directory}: broken reference ${reference}`).toBe(
          true,
        );
      }
    }
  });

  it('keeps the harvest skill self-contained with the documented workflow', () => {
    const skill = skills.find((entry) => entry.directory === 'harvest-pose-material');
    expect(skill).toBeDefined();
    const body = skill?.body ?? '';
    for (const section of ['## When to use', '## Workflow', '## Hard rules', '## Anti-patterns', '## Output format']) {
      expect(body, `missing section ${section}`).toContain(section);
    }
    for (let step = 1; step <= 8; step++) {
      expect(body, `missing workflow step ${step}`).toContain(`### Step ${step}`);
    }
  });
});
