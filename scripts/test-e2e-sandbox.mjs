// Linux x64 fallback for environments that allow npm but block Playwright's CDN.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawnSync} from 'node:child_process';
import chromium from '@sparticuz/chromium';

const cache=path.resolve('.cache/browser-tools');
fs.mkdirSync(cache,{recursive:true});
const archive=path.join(cache,'libraries.tar');
fs.writeFileSync(archive,zlib.brotliDecompressSync(fs.readFileSync('node_modules/@sparticuz/chromium/bin/al2023.tar.br')));
const extract=spawnSync('tar',['xf',archive,'-C',cache],{stdio:'inherit'});
if(extract.status!==0)process.exit(1);
const registry=JSON.parse(fs.readFileSync('node_modules/playwright-core/browsers.json','utf8'));
const revision=registry.browsers.find(browser=>browser.name==='ffmpeg').revision;
const browsers=path.join(cache,'playwright');
const ffmpeg=path.join(browsers,`ffmpeg-${revision}`,'ffmpeg-linux');
fs.mkdirSync(path.dirname(ffmpeg),{recursive:true});
fs.copyFileSync('node_modules/@ffmpeg-installer/linux-x64/ffmpeg',ffmpeg);
fs.chmodSync(ffmpeg,0o755);
const env={...process.env,CHROMIUM_PATH:await chromium.executablePath(),
 PLAYWRIGHT_BROWSERS_PATH:browsers,LD_LIBRARY_PATH:`${cache}/lib:${process.env.LD_LIBRARY_PATH??''}`};
const result=spawnSync('node',['node_modules/@playwright/test/cli.js','test'],{env,stdio:'inherit'});
process.exit(result.status??1);
