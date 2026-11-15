// User-provided raster master; never re-draw the T/orbit/star or fetch a remote asset.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const MASTER_SHA256='d4c33c285a714311e47ac1814862e0e88c56f1adb60be03a1dde3f63f8cadf65';
function readMaster(){const bytes=fs.readFileSync(path.join(__dirname,'../build/brand-master.png'));if(crypto.createHash('sha256').update(bytes).digest('hex')!==MASTER_SHA256)throw new Error('Logo master differs from user-supplied original; update provenance deliberately');return bytes}
// BGRA, as returned by Electron nativeImage on macOS. Remove ONLY corner-connected
// near-black exterior; enclosed dark pixels in the artwork are not keyed out.
function clearExterior(input,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||input.length!==width*height*4)throw new Error('Invalid source bitmap');
 const bitmap=Buffer.from(input),seen=new Uint8Array(width*height),queue=new Int32Array(width*height);let head=0,tail=0;
 function add(i){if(seen[i])return;seen[i]=1;const p=i*4;if(Math.max(bitmap[p],bitmap[p+1],bitmap[p+2])>12)return;queue[tail++]=i;bitmap.fill(0,p,p+4)}
 for(let x=0;x<width;x++){add(x);add((height-1)*width+x)}for(let y=0;y<height;y++){add(y*width);add(y*width+width-1)}
 while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(x)add(i-1);if(x<width-1)add(i+1);if(y)add(i-width);if(y<height-1)add(i+width)}
 let x0=width,y0=height,x1=-1,y1=-1;for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(bitmap[(y*width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}
 if(x1<0)throw new Error('Logo has no foreground');
 const span=Math.max(x1-x0+1,y1-y0+1),side=Math.min(width,height,Math.ceil(span/(936/1024)));
 const crop={x:Math.max(0,Math.min(width-side,Math.round((x0+x1+1-side)/2))),y:Math.max(0,Math.min(height-side,Math.round((y0+y1+1-side)/2))),width:side,height:side};
 return {bitmap,crop,cleared:tail,bounds:{x0,y0,x1,y1}};
}
function wrapPNG(png){return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><title>Tombuddy — T, orbit and star · user-provided logo</title><image width="1024" height="1024" href="data:image/png;base64,${png.toString('base64')}"/></svg>`}
module.exports={MASTER_SHA256,readMaster,clearExterior,wrapPNG};
if(require.main===module){readMaster();console.log('User-provided logo master SHA-256 verified; original file is unchanged.')}
