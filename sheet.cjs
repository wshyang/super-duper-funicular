const {PNG}=require('pngjs');const fs=require('fs');
const dir=process.argv[2]; const out=process.argv[3];
const files=fs.readdirSync(dir).filter(f=>f.endsWith('.png')).sort();
const frames=files.map(f=>PNG.sync.read(fs.readFileSync(dir+'/'+f)));
const W=220,H=256, cols=4;
const sheet=new PNG({width:W*cols,height:H*Math.ceil(frames.length/cols)});
for(let i=0;i<sheet.width*sheet.height;i++){sheet.data[i*4]=226;sheet.data[i*4+1]=230;sheet.data[i*4+2]=238;sheet.data[i*4+3]=255;}
frames.forEach((f,i)=>{const ox=(i%cols)*W, oy=Math.floor(i/cols)*H;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const si=(y*W+x)*4, a=f.data[si+3]/255;
const di=((oy+y)*sheet.width+ox+x)*4;
for(let c=0;c<3;c++) sheet.data[di+c]=Math.round(f.data[si+c]*a+sheet.data[di+c]*(1-a));}});
fs.writeFileSync(out,PNG.sync.write(sheet));
console.log('ok');
