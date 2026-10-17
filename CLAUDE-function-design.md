# Function design

- Target ≤ 20 lines, hard ≤ 50.
- ≤ 3 parameters; otherwise a typed object. No boolean flag parameters.
- Guard clauses; nesting ≤ 3.
- Never mutate domain state in place. Canvas pixel buffers are an explicit I/O exception.
- Components render; hooks/modules decide. No `.filter`/`.reduce`/`.sort` inside JSX `return`.
- Files typical ≤ 400 LOC, hard 800.
