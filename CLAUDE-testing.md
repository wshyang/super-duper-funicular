# Testing

- Vitest for unit and component tests.
- Gait, IK, chroma, hashing run on real functions — no mocked math.
- Sheet extraction tests decode real JPEG bytes when the extractor is exercised.
- Frontend may mock the canvas 2d context only if jsdom lacks it; prefer real canvas when available.
- Add tests in the same change as the code.
- No database: IDOR matrix is N/A until a backend exists.
