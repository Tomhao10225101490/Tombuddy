const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn,execFile}=require('node:child_process');
const {StringDecoder}=require('node:string_decoder');
async function resolveSafe(root,relative='.',write=false) {
  if(!root)throw new Error('请先选择项目目录');
  const realRoot=await fs.realpath(root);const target=path.resolve(realRoot,relative);
  const inside=p=>p===realRoot || p.startsWith(realRoot+path.sep);
  const sensitive=p=>path.relative(realRoot,p).split(path.sep).some(x=>x==='.git' || x==='.env' || x.startsWith('.env.') || x==='.ssh');
  if(!inside(target))throw new Error('禁止访问项目目录之外的路径');
  let current=target;
  while(true){
    try { const real=await fs.realpath(current);if(!inside(real))throw new Error('符号链接指向项目之外');if(sensitive(real))throw new Error('禁止通过符号链接访问凭据或仓库元数据');break; }
    catch(e){if(e.code!=='ENOENT' || !write)throw e;const parent=path.dirname(current);if(parent===current)throw e;current=parent;}
  }
  const rel=path.relative(realRoot,target);
  if(rel.split(path.sep).some(p=>p==='.git' || p==='.env' || p.startsWith('.env.') || p==='.ssh'))throw new Error('为保护凭据和仓库元数据，禁止工具访问该路径');
  return target;
}
async function previewWrite(root,args){
 const p=await resolveSafe(root,args.path,true);if(typeof args.content!=='string'||Buffer.byteLength(args.content)>1000000)throw new Error('文件内容无效或超过 1 MB');
 try{const stat=await fs.stat(p);if(!stat.isFile()||stat.size>100000||Buffer.byteLength(args.content)>100000)return {unavailable:'文件过大或不是普通文本，未生成差异预览'};const before=await fs.readFile(p,'utf8');if(before.includes('\0')||before.includes('\uFFFD'))return {unavailable:'原文件不是有效 UTF-8 文本，未生成差异预览'};return {before,after:args.content,existed:true};}catch(e){if(e.code==='ENOENT')return Buffer.byteLength(args.content)<=100000?{before:'',after:args.content,existed:false}:{unavailable:'新文件超过 100 KB，未生成差异预览'};throw e;}
}
async function executeTool(root,name,args,signal,onProgress,onOutcome){
  if(signal?.aborted)throw new DOMException('已停止','AbortError');
  if(name==='list_files') {
    const entries=await fs.readdir(await resolveSafe(root,args.path || '.'),{withFileTypes:true});
    return entries.filter(e=>!e.name.startsWith('.') && e.name!=='node_modules').slice(0,400).map(e=>`${e.isDirectory()?'📁':'📄'} ${e.name}`).join('\n') || '（空目录）';
  }
  if(name==='read_file') {
    const p=await resolveSafe(root,args.path);const stat=await fs.stat(p);
    if(stat.size>100000)throw new Error('文件超过 100 KB，请缩小读取范围');
    return await fs.readFile(p,'utf8');
  }
  if(name==='write_file') {
    if(typeof args.content!=='string' || Buffer.byteLength(args.content)>1000000)throw new Error('文件内容无效或超过 1 MB');
    const p=await resolveSafe(root,args.path,true);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,args.content,'utf8');return `已写入 ${args.path}`;
  }
  if(name==='run_command') {
    if(typeof args.command!=='string' || !args.command.trim())throw new Error('命令不能为空');
    return new Promise((resolve,reject)=>{
      if(signal?.aborted)return reject(new DOMException('已停止','AbortError'));
      const isWin=process.platform==='win32';
      const env=Object.fromEntries((isWin?['PATH','Path','USERPROFILE','USERNAME','TEMP','TMP','SystemRoot','ComSpec','APPDATA','LOCALAPPDATA','HOME','LANG']:['PATH','HOME','TMPDIR','LANG','USER','SHELL']).filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
      const child=isWin?spawn(process.env.ComSpec||'cmd.exe',['/d','/s','/c',args.command],{cwd:root,env,stdio:['ignore','pipe','pipe'],windowsHide:true}):spawn('/bin/zsh',['-c',args.command],{cwd:root,detached:true,env,stdio:['ignore','pipe','pipe']});
      let output='',truncated=false,timedOut=false,progressTimer,lastSent=0,lastProgress='';
      const publish=()=>{clearTimeout(progressTimer);progressTimer=undefined;const text=output.slice(0,40000);if(text!==lastProgress){lastProgress=text;lastSent=Date.now();onProgress?.(text)}};
      const progress=()=>{if(!onProgress)return;if(Date.now()-lastSent>=80)publish();else if(!progressTimer)progressTimer=setTimeout(publish,80-(Date.now()-lastSent))};
      const kill=isWin?()=>{try{execFile('taskkill',['/pid',String(child.pid),'/T','/F'],()=>{})}catch{try{child.kill('SIGKILL')}catch{}}}:()=>{try{process.kill(-child.pid,'SIGKILL')}catch{child.kill('SIGKILL')}};
      const timer=setTimeout(()=>{timedOut=true;kill()},30000);
      const append=text=>{if(truncated)return;output+=text;if(Buffer.byteLength(output)>200000){truncated=true;output=output.slice(0,40000);kill()}progress()};
      for(const stream of [child.stdout,child.stderr]){const decoder=new StringDecoder('utf8');stream.on('data',data=>append(decoder.write(data)));stream.on('end',()=>{const tail=decoder.end();if(tail)append(tail)});}signal?.addEventListener('abort',kill,{once:true});
      const cleanup=()=>{clearTimeout(timer);clearTimeout(progressTimer);if(onProgress)publish();signal?.removeEventListener('abort',kill)};
      child.on('error',e=>{cleanup();reject(e)});
      child.on('close',code=>{cleanup();if(signal?.aborted)return reject(new DOMException('已停止','AbortError'));onOutcome?.({exitCode:code,timedOut,truncated});resolve((output.slice(0,40000)+(timedOut?'\n[30 秒超时，进程组已终止]':truncated?'\n[输出超过限制，进程已终止]':code?'\n[exit] '+code:'')) || '命令完成，无输出')});
    });
  }
  throw new Error(`未知工具: ${name}`);
}
module.exports={resolveSafe,executeTool,previewWrite};
