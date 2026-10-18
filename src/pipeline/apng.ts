import zlib from 'node:zlib';
import type { RasterImage } from '../shared/types.js';

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DEFAULT_DELAY_NUM = 42;
const DEFAULT_DELAY_DEN = 1000;

export function encodeApng(frames: readonly RasterImage[], delayMs = DEFAULT_DELAY_NUM): Buffer {
  const chunks: Buffer[] = [PNG_SIGNATURE];
  chunks.push(makeChunk('IHDR', makeIhdr(frames[0])));
  chunks.push(makeChunk('acTL', makeActl(frames.length)));
  let sequence = 0;
  frames.forEach((frame, frameIndex) => {
    chunks.push(makeChunk('fcTL', makeFctl(sequence, frame, delayMs)));
    sequence++;
    if (frameIndex === 0) {
      chunks.push(makeChunk('IDAT', deflateFrame(frame)));
      return;
    }
    chunks.push(makeChunk('fdAT', makeFdat(sequence, frame)));
    sequence++;
  });
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function makeIhdr(frame: RasterImage): Buffer {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(frame.width, 0);
  header.writeUInt32BE(frame.height, 4);
  header.writeUInt8(8, 8);
  header.writeUInt8(6, 9);
  return header;
}

function makeActl(frameCount: number): Buffer {
  const actl = Buffer.alloc(8);
  actl.writeUInt32BE(frameCount, 0);
  actl.writeUInt32BE(0, 4);
  return actl;
}

function makeFctl(sequence: number, frame: RasterImage, delayMs: number): Buffer {
  const fctl = Buffer.alloc(26);
  fctl.writeUInt32BE(sequence, 0);
  fctl.writeUInt32BE(frame.width, 4);
  fctl.writeUInt32BE(frame.height, 8);
  fctl.writeUInt32BE(0, 12);
  fctl.writeUInt32BE(0, 16);
  fctl.writeUInt16BE(delayMs, 20);
  fctl.writeUInt16BE(DEFAULT_DELAY_DEN, 22);
  fctl.writeUInt8(0, 24);
  fctl.writeUInt8(0, 25);
  return fctl;
}

function makeFdat(sequence: number, frame: RasterImage): Buffer {
  const sequencePrefix = Buffer.alloc(4);
  sequencePrefix.writeUInt32BE(sequence, 0);
  return Buffer.concat([sequencePrefix, deflateFrame(frame)]);
}

function deflateFrame(frame: RasterImage): Buffer {
  const stride = frame.width * 4;
  const raw = Buffer.alloc((stride + 1) * frame.height);
  for (let y = 0; y < frame.height; y++) {
    raw[y * (stride + 1)] = 0;
    frame.data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return zlib.deflateSync(raw, { level: 6 });
}

const CRC_TABLE = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(bytes: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([length, typeAndData, crc]);
}
