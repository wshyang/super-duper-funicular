import { runPipeline, summarizePipeline } from '../src/pipeline/run-pipeline';

const result = runPipeline();
process.stdout.write(`${summarizePipeline(result)}\n`);
