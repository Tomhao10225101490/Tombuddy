const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const {loadState,recoverMessage}=require('../electron/storage.cjs');
const defaults={providers:[],sessions:[],projects:[],theme:'light'};
test('missing state initializes without mutating defaults; valid data survives restart',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tombuddy-storage-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const file=path.join(root,'state.json');
 const first=await loadState(file,defaults);first.state.sessions.push({id:'test'});assert.equal(defaults.sessions.length,0);
 await fs.writeFile(file,JSON.stringify({...defaults,theme:'dark'}));assert.equal((await loadState(file,defaults)).state.theme,'dark');
});
test('interrupted responses recover as stopped, not fabricated successful completions',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tombuddy-interrupted-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const file=path.join(root,'state.json');
 const message={id:'m',role:'assistant',content:'partial',startedAt:100,trace:[{at:140,label:'request'}],tools:[{id:'tool',status:'running'}],wireOrigin:'account-1',wire:[{role:'assistant',content:'previous completed round'}]};
 await fs.writeFile(file,JSON.stringify({...defaults,sessions:[{id:'s',messages:[message]}]}));const recovered=(await loadState(file,defaults)).state.sessions[0].messages[0];assert.equal(recovered.stopped,true);assert.equal(recovered.interrupted,true);assert.equal(recovered.endedAt,140);assert.match(recovered.tools[0].result,/未确认完成/);assert.deepEqual(recovered.wire,message.wire);assert.ok(!(JSON.parse(await fs.readFile(file,'utf8')).sessions[0].messages[0].stopped));
});
test('known 0.2 budget failures migrate to resumable pauses without deleting evidence or wire context',()=>{
 const original={role:'assistant',content:'partial',endedAt:123,wire:[{role:'tool',content:'completed result'}],error:'已达到单次 12 轮工具执行上限。请确认结果后继续。'};const recovered=recoverMessage(original);assert.equal(recovered.paused.kind,'tool_budget');assert.equal(recovered.error,undefined);assert.equal(recovered.legacyError,original.error);assert.deepEqual(recovered.wire,original.wire);assert.ok(original.error);
 const exhausted=recoverMessage({...original,content:'',error:'模型未返回文本或工具调用，请检查模型、推理预算与内容限制。',warnings:['模型达到输出上限，结果可能不完整；这不代表任务已验证完成。']});assert.equal(exhausted.paused.kind,'output_limit');assert.equal(exhausted.error,undefined);
 const auth={...original,error:'API 401: denied'};assert.deepEqual(recoverMessage(auth),auth);
});
test('corrupt or structurally invalid state is preserved in a private recovery backup',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tombuddy-recovery-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const file=path.join(root,'state.json');
 for(const raw of ['{broken','{"providers":null}']){
  await fs.writeFile(file,raw);const result=await loadState(file,defaults);assert.ok(result.backup);assert.equal(await fs.readFile(result.backup,'utf8'),raw);assert.equal(await fs.readFile(file,'utf8'),raw);assert.equal((await fs.stat(result.backup)).mode&0o777,0o600);assert.deepEqual(result.state,defaults);
 }
});
