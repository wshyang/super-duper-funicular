## 7. Function design and module structure (decide on day one)

Establish these rules before the first line of application code ships; retrofitting
them into an existing codebase is expensive.

### Function size and extraction
- **≤ 20 lines** target per function body; **50 lines hard limit**.
- If you need a comment to explain a block, extract the block as a named function.
- A function does one thing at one level of abstraction — no orchestration code
  mixed with implementation detail inside the same function.

### Guard clauses over nesting
- Exit early with guard clauses at the top; never nest `if/if` for the happy path.
- Maximum nesting depth: **3 levels**. Beyond 3, extract to a function.

### Parameter discipline
- **≤ 3 parameters**. Beyond 3, introduce a Parameter Object (typed interface).
- No boolean/flag parameters — split into two named functions.
- Preserve Whole Object: pass the domain object, not extracted fields.

### Naming
- Names reveal intent. Rename liberally as understanding evolves.
- Booleans: `is`, `has`, `should`, `can` prefix.
- Functions: verb + noun (`getUser`, `validateEmail`).
- No abbreviations in domain code.

### Encapsulation and mutation
- **Never mutate in place** — always produce a new object (`{ ...old, field: value }`).
- Separate Query from Modifier: a function either returns a value OR has a side
  effect, never both.
- Encapsulate Variable: mutable state lives behind a function boundary, not exposed
  as raw mutable fields.

### Frontend: a component renders, a hook decides

Decide this before the first component ships — retrofitting it across a
codebase costs weeks (we spent 22 extractions getting there).

- **Split along the server boundary, not the "looks like state" boundary.**
  The component owns layout/JSX, view-only state, event *wiring*, and DOM-only
  side effects. The hook owns anything calling the API layer, any computation
  over server data, any validation, and any fetching effect.
- **The hook returns a plain object; the component destructures it.** No JSX in
  the hook, and no API import in the component — that import is the checkable
  signal: `grep -c "lib/api" <Component>.tsx` must be `0`.
- **Hooks live beside their tests** (`lib/hooks/use<Feature>.ts` +
  `use<Feature>.test.ts` using `renderHook`) and must not import from
  `components/`.
- **Move bodies, don't rewrite them.** A separation refactor has to be
  verifiable by diffing the extracted function against the original with
  whitespace normalised. Anything not byte-identical is a behaviour change
  wearing a refactor's clothes.

**And keep the JSX interior presentation-only.** This is the half that gets
missed, because a component can satisfy every rule above and still compute
domain rules per render — and most static gates never look inside the `return`.

- Between `return (` and its closing `)`: only markup, bindings already computed
  above the return, and wiring.
- No `.filter()` / `.reduce()` / `.sort()` / `.find()` / `.some()` / `.every()`
  in JSX. A bare `.map()` that renders a list is fine.
- **Compute a derivation once.** `{xs.filter(p).length === 0 ? <Empty/> :
  xs.filter(p).map(…)}` runs the predicate twice and reads as two rules that
  happen to agree.
- Inline handlers are wiring only — a setter, a navigation, a `.focus()`. The
  moment one needs a branch or a computation, name it above the return.
- No inline `new Date()` / `.toFixed()` / `JSON.parse` — use a formatter helper.

A derivation inside JSX cannot be unit-tested without rendering; computed twice
it can drift; and a cascade rule buried in an `onChange` is domain logic no test
can reach.

### Module and directory structure
- **Group by domain feature, not by type** (`routes-requests/`, `db/entities/`,
  not `controllers/`, `models/`, `services/`).
- Files ≤ 400 LOC typical; **800 LOC hard limit**. Files above 800 must be split
  before merge.
- When a file must be split, use the **barrel pattern**: extract per-domain files,
  replace the original with `export * from './sub/index.tsx'` — zero call-site churn.
- No circular dependencies between peer-domain files.
- One concern per file; file names are the contract.

### Code smell → remedy (quick reference)

| Smell | Remedy |
|---|---|
| Long Function (> 50 lines) | Extract Function |
| Deep Nesting (> 3 levels) | Guard Clauses |
| Long Parameter List (> 3) | Introduce Parameter Object |
| Boolean parameter | Remove Flag Argument |
| Feature Envy | Move Function |
| Message Chain | Hide Delegate |
| God Module (> 800 lines) | Per-domain split + barrel |
| Mutable Data | Encapsulate Variable, Separate Query from Modifier |
| Duplicated Code | Extract Function |
| Logic inside JSX (`filter`/`reduce` in the `return`) | Extract to a named binding above the return, or into the hook |
| Same derivation computed twice in one expression | Introduce Explaining Variable |
| Fat inline `onChange`/`onClick` carrying a branch or a computation | Extract Function (or move to the hook if it touches server data) |
| Speculative Generality | Remove (YAGNI) |

Source: Martin Fowler's *Refactoring* (2nd ed.) via
[5-minutes-or-less-refactoring](https://github.com/mikaelvesavuori/5-minutes-or-less-refactoring).
For full details, see `CLAUDE-function-design.md` in project repos that carry this template.

