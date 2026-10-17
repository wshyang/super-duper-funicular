# Generated comparison: reference sheet vs procedural runner

Produced by `npm run sprites:analyse`. Numbers are pixels at the reference sheet's own scale
(figure height about 231 px); the procedural runner is sampled at the same scale.

## Reference sheet, row 1 (red)

| Metric | Value |
| --- | --- |
| Frames analysed | 8 |
| Unique poses | **4** |
| Repeated-pose groups | 4 |
| Mean pose distance, frame i vs i+n/2 | **0.016** |
| Mean pose distance, neighbouring frames | 0.238 |
| Head drift across the cycle | 50.6 px (0.22 body heights) |
| Ground line variation | 20.0 px |
| Figure height range | 20.0 px |
| Frames touching the ground | **2 of 8** |
| Mean ground clearance | 13.3 px |
| Maximum ground clearance | 20.0 px |
| Foot separation range | n/a |

## Procedural runner, same 8 samples

| Metric | Value |
| --- | --- |
| Frames analysed | 8 |
| Unique poses | **8** |
| Repeated-pose groups | 0 |
| Mean pose distance, frame i vs i+n/2 | **0.289** |
| Mean pose distance, neighbouring frames | 0.105 |
| Head drift across the cycle | 1.6 px (0.01 body heights) |
| Ground line variation | 12.2 px |
| Figure height range | 3.9 px |
| Frames touching the ground | **6 of 8** |
| Mean ground clearance | 3.1 px |
| Maximum ground clearance | 12.2 px |
| Foot separation range | 45.2 px |

## Duplicate frames by row

- Row 1: 4 unique poses of 8; groups f1=f5, f2=f6, f3=f7, f4=f8
- Row 2: 4 unique poses of 8; groups f1=f5, f2=f6, f3=f7, f4=f8
- Row 3: 4 unique poses of 8; groups f1=f5, f2=f6, f3=f7, f4=f8
- Row 4: 4 unique poses of 8; groups f1=f5, f2=f6, f3=f7, f4=f8
- Row 5: 4 unique poses of 8; groups f1=f5, f2=f6, f3=f7, f4=f8
- Row 6: 4 unique poses of 8; groups f1=f5, f2=f6, f3=f7, f4=f8
