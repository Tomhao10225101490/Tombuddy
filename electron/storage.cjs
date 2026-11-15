const fs=require('node:fs/promises');
function recoverMessage(message){
 if(message?.role!=='assistant')return message;let m=message;
 if(m.error==='已达到单次 12 轮工具执行上限。请确认结果后继续。')m={...m,legacyError:m.error,error:undefined,paused:{kind:'tool_budget',message:'已完成本批 12 轮工具调用，进度已保存。不是 API 断开，可手动继续下一批。'}};
 else if(m.error==='模型未返回文本或工具调用，请检查模型、推理预算与内容限制。' && m.warnings?.some(w=>w.includes('输出上限')))m={...m,legacyError:m.error,error:undefined,paused:{kind:'output_limit',message:'上次推理达到单轮输出上限，尚未生成完整正文。配置仍保留，可用均衡模式继续。'}};
 if(m.startedAt&&!m.endedAt)m={...m,interrupted:true,stopped:true,endedAt:m.trace?.at(-1)?.at || m.startedAt,tools:m.tools?.map(t=>t.status==='running'?{...t,status:'error',result:'应用重启：上次操作未确认完成，请检查实际文件与结果。'}:t)};
 return m;
}
async function loadState(file,defaults){
 let raw;try{raw=await fs.readFile(file,'utf8')}catch(e){if(e.code==='ENOENT')return {state:structuredClone(defaults)};throw e;}
 try{
  const parsed=JSON.parse(raw);
  if(!parsed || !['providers','sessions','projects'].every(k=>Array.isArray(parsed[k])))throw new Error('Invalid saved state schema');
  for(const session of parsed.sessions){
   if(!Array.isArray(session?.messages))continue;
   session.messages=session.messages.map(recoverMessage);
  }
  return {state:{...structuredClone(defaults),...parsed}};
 }catch{
  const backup=file.replace(/\.json$/, '')+`.recovery-${Date.now()}.json`;
  await fs.copyFile(file,backup);await fs.chmod(backup,0o600);
  return {state:structuredClone(defaults),backup};
 }
}
module.exports={loadState,recoverMessage};
