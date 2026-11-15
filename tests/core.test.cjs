const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs/promises');const os=require('node:os');const path=require('node:path');const http=require('node:http');
const {sse,endpoint,streamTurn,anthropicMessages,geminiMessages}=require('../electron/providers.cjs');
const {resolveSafe,executeTool}=require('../electron/workspace.cjs');
test('SSE supports split UTF-8 and CRLF frames',async()=>{
 const data=Buffer.from('data: {"text":"你好"}\r\n\r\ndata: [DONE]\n\n');
 async function* chunks(){for(let i=0;i<data.length;i++)yield data.subarray(i,i+1)}
 const events=[];for await(const e of sse(chunks()))events.push(e);assert.deepEqual(events,[{text:'你好'}]);
});
test('API URLs require secure transport except loopback',()=>{assert.equal(endpoint('http://localhost:123/v1/','/chat/completions'),'http://localhost:123/v1/chat/completions');assert.throws(()=>endpoint('http://example.com','/messages'));assert.throws(()=>endpoint('file:///tmp/test','/messages'));});
test('tool paths prevent traversal, symlink escape and credential reads',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tombuddy-test-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 await fs.writeFile(path.join(root,'hello.txt'),'hello');await fs.symlink(os.tmpdir(),path.join(root,'outside'));await fs.writeFile(path.join(root,'.env'),'SECRET=test');await fs.symlink(path.join(root,'.env'),path.join(root,'alias.txt'));await assert.rejects(resolveSafe(root,'alias.txt'));
 assert.equal(await executeTool(root,'read_file',{path:'hello.txt'}),'hello');
 await assert.rejects(resolveSafe(root,'../secrets',true));await assert.rejects(resolveSafe(root,'outside/escape.txt',true));await assert.rejects(resolveSafe(root,'.env',true));await assert.rejects(resolveSafe(root,'.git/config',true));
 await executeTool(root,'write_file',{path:'nested/test.txt',content:'ok'});assert.equal(await fs.readFile(path.join(root,'nested/test.txt'),'utf8'),'ok');
 assert.match(await executeTool(root,'run_command',{command:'printf command-ok'},new AbortController().signal),/command-ok/);
});
test('command stop terminates process group',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'tombuddy-abort-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const c=new AbortController();const promise=executeTool(root,'run_command',{command:'sleep 15'},c.signal);setTimeout(()=>c.abort(),60);await assert.rejects(promise,{name:'AbortError'});
});
test('Anthropic and Gemini preserve tool result semantics',()=>{
 const messages=[{role:'user',content:'go'},{role:'assistant',content:'',calls:[{id:'a',name:'read_file',args:{path:'a'},signature:'sig'}]},{role:'tool',callId:'a',name:'read_file',content:'result'}];
 const a=anthropicMessages(messages);assert.equal(a[1].content[0].type,'tool_use');assert.equal(a[2].content[0].tool_use_id,'a');
 const g=geminiMessages(messages);assert.equal(g[1].parts[0].thoughtSignature,'sig');assert.equal(g[2].parts[0].functionResponse.name,'read_file');
});
test('three real HTTP streaming transports against explicitly synthetic local fixture',async t=>{
 const requests=[];const server=http.createServer(async(req,res)=>{
  let raw='';for await(const c of req)raw+=c;requests.push({url:req.url,headers:req.headers,body:JSON.parse(raw)});res.setHeader('Content-Type','text/event-stream');
  const events=req.url==='/messages'?[{type:'content_block_delta',delta:{text:'fixture anthropic'}},{type:'content_block_start',index:1,content_block:{type:'tool_use',id:'t',name:'list_files'}},{type:'content_block_delta',index:1,delta:{partial_json:'{"path":"."}'}}]:req.url.includes('streamGenerateContent')?[{candidates:[{content:{parts:[{text:'fixture gemini'},{functionCall:{name:'list_files',args:{path:'.'}},thoughtSignature:'signature'}]}}]}]:[{choices:[{delta:{content:'fixture openai',reasoning_content:'provider summary',tool_calls:[{index:0,id:'t',function:{name:'list_files',arguments:'{"path":'}}]}}]},{choices:[{delta:{tool_calls:[{index:0,function:{arguments:'"."}'}}]}}]}];
  for(const e of events)res.write('data: '+JSON.stringify(e)+'\n\n');res.end('data: [DONE]\n\n');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 for(const kind of ['openai','anthropic','gemini']){
  const events=[];const turn=await streamTurn({config:{kind,baseUrl:`http://127.0.0.1:${server.address().port}`,model:'fixture-model'},key:'test-key',messages:[{role:'user',content:'fixture'}],tools:true,signal:new AbortController().signal,onEvent:e=>events.push(e)});
  assert.match(turn.text,/fixture/);assert.equal(turn.calls[0].name,'list_files');assert.deepEqual(turn.calls[0].args,{path:'.'});assert.ok(events.length);
 }
 assert.equal(requests[0].headers.authorization,'Bearer test-key');assert.equal(requests[1].headers['x-api-key'],'test-key');assert.equal(requests[2].headers['x-goog-api-key'],'test-key');
});
