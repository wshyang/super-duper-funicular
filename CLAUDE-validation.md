# CLAUDE-validation.md — Honest Validation & Provenance (§8–§9)

Adopted from `GREENFIELD.md §8`.

## 8.1 Four provenance categories

Every claim in a report belongs to exactly one category, and the category is
named:

1. **Read** — I read the source and am describing it.
2. **Viewed** — I opened the image/PNG and looked at it.
3. **Executed** — I ran the command locally and am reporting its output.
4. **Reported** — another branch, document, or person claims this; I did not
   reproduce it.

"Tests pass" is a category-3 claim and requires the command and its output.
"The other branch's audit shows zero islands" is category 4 even if it is true.

## 8.2 Say which layer ran

Static checks, unit tests, integration runs, and visual inspection are four
different kinds of evidence. Never let one stand in for another:

- a passing type-check does not mean the image is right;
- a clean numeric gate does not mean the image is right;
- a good-looking image does not mean the geometry is right.

The pipeline therefore requires **both** a numeric report and a viewed output
for any asset that ships.

## 8.3 The validation ledger

`docs/VALIDATION.md` records, per turn: command, exit status, artefact paths,
and what the result proves (and does not prove). It is amended in the same
change as the work.

## 9.1 Audit surfaces

The pipeline must be able to produce, on demand and into a temporary directory:

- a 16-phase contact sheet over a neutral background with a ground line;
- a joint-crop sheet at 2× magnification centred on each solved pivot;
- a silhouette-difference plate: generated frame vs. control plate, with the
  disagreement highlighted;
- a per-frame JSON gate report.

## 9.2 Visual review is mandatory for assets

An asset is not done when the gate passes; it is done when a human (or an agent
using vision) has looked at it and said so. The visual review records *what was
looked at* and *what was seen*, in the generation log's verdict field.

## 9.3 Report the negative results

A rejected candidate, a dead-end architecture, and a measured regression are
first-class results. They are recorded with the same care as successes, because
they are the only defence against re-running the same dead end in three turns.
