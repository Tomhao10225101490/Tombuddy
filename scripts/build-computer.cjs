const {execFileSync}=require('node:child_process');
const fs=require('node:fs');const path=require('node:path');
if(process.platform!=='darwin')throw new Error('Computer use helper requires macOS');
const root=path.resolve(__dirname,'..');fs.mkdirSync(path.join(root,'electron','bin'),{recursive:true});
execFileSync('/usr/bin/clang',['-O2','-fobjc-arc',path.join(root,'native','ComputerUse.m'),'-o',path.join(root,'electron','bin','tombuddy-computer'),'-framework','AppKit','-framework','ApplicationServices','-framework','Carbon','-framework','Vision'],{stdio:'inherit',timeout:120000});
