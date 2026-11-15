const fs=require('node:fs/promises');
function createDiagnostics(file,{maxBytes=256000}={}){
 let queue=Promise.resolve();
 const fields=['event','providerId','round','code','category','status','requestId','durationMs','pauseKind','version'];
 return function record(metadata){
  const entry={at:new Date().toISOString()};
  for(const key of fields){const value=metadata[key];if(typeof value==='number'&&Number.isFinite(value))entry[key]=value;else if(typeof value==='string')entry[key]=value.slice(0,128).replace(/[^\p{L}\p{N}_.:/ -]/gu,'');}
  queue=queue.catch(()=>{}).then(async()=>{
   try{if((await fs.stat(file)).size>maxBytes)await fs.rename(file,file+'.previous')}catch(e){if(e.code!=='ENOENT')throw e}
   await fs.appendFile(file,JSON.stringify(entry)+'\n',{mode:0o600});
  }).catch(()=>{});return queue;
 };
}
module.exports={createDiagnostics};
