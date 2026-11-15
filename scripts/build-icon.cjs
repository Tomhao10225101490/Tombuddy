// Existing Electron image decoder + native macOS icon tools; no new image dependency.
const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'..');
const {readMaster,clearExterior,wrapPNG,MASTER_SHA256}=require('./icon.cjs');
if(process.versions.electron){
 const {app,nativeImage}=require('electron');app.whenReady().then(()=>{
  const source=nativeImage.createFromBuffer(readMaster()),size=source.getSize();if(source.isEmpty()||size.width!==1254||size.height!==1254)throw new Error('Unexpected original logo dimensions');
  const prepared=clearExterior(source.toBitmap(),size.width,size.height);if(prepared.cleared<size.width*size.height*.1||prepared.cleared>size.width*size.height*.5)throw new Error('Unexpected exterior mask; review before shipping');
  const image=nativeImage.createFromBitmap(prepared.bitmap,{width:size.width,height:size.height,scaleFactor:1}).crop(prepared.crop).resize({width:1024,height:1024,quality:'best'});
  fs.writeFileSync(path.join(root,'build/icon.png'),image.toPNG());fs.writeFileSync(path.join(root,'build/logo-provenance.json'),JSON.stringify({masterSha256:MASTER_SHA256,sourceSize:size,operation:'corner-connected exterior only (RGB <= 12); centered crop/padding and native resample; no re-drawing',crop:prepared.crop,bounds:prepared.bounds,exteriorPixels:prepared.cleared,outputSize:image.getSize()},null,2));app.quit();
 }).catch(e=>{console.error(e);app.exit(1)});
}else{
 const {execFileSync}=require('node:child_process');const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;execFileSync(require('electron'),[__filename],{env,stdio:'inherit',timeout:30000});
 const iconset=path.join(root,'build/AppIcon.iconset');fs.mkdirSync(iconset,{recursive:true});
 for(const size of [16,32,128,256,512])for(const scale of [1,2])execFileSync('/usr/bin/sips',['-z',String(size*scale),String(size*scale),path.join(root,'build/icon.png'),'--out',path.join(iconset,`icon_${size}x${size}${scale===2?'@2x':''}.png`)],{stdio:'pipe',timeout:10000});
 execFileSync('/usr/bin/iconutil',['-c','icns',iconset,'-o',path.join(root,'build/icon.icns')],{stdio:'inherit',timeout:10000});const png=fs.readFileSync(path.join(root,'build/icon.png'));fs.copyFileSync(path.join(root,'build/icon.png'),path.join(root,'public/icon.png'));fs.writeFileSync(path.join(root,'public/icon.svg'),wrapPNG(png));console.log('User-provided T/orbit/star logo: local SVG wrapper, transparent 1024px PNG and macOS ICNS generated.');
}
