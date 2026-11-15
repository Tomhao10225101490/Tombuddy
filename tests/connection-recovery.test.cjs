const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const {streamTurn,reasoningOptions}=require('../electron/providers.cjs');
async function fixture(t,handler){let requests=0;const server=http.createServer(async(req,res)=>{for await(const c of req){}requests++;res.setHeader('Content-Type','text/event-stream');await handler(res,event=>res.write('data: '+JSON.stringify(event)+'\n\n'))});await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(async()=>{server.closeAllConnections();await new Promise(r=>server.close(r))});return {baseUrl:`http://127.0.0.1:${server.address().port}`,count:()=>requests}}
const args=(f,kind='anthropic')=>({config:{kind,baseUrl:f.baseUrl,model:'fixture'},key:'fixture-secret-keep-private',messages:[{role:'user',content:'fixture'}],tools:true,signal:new AbortController().signal,onEvent:()=>{}});
test('reasoning-only output exhaustion preserves usage and pauses, not a credential error',async t=>{
 const f=await fixture(t,(res,send)=>{send({type:'message_start',message:{usage:{input_tokens:12}}});send({type:'content_block_start',index:0,content_block:{type:'thinking',thinking:'public API fixture summary',signature:'fixture-signature'}});send({type:'message_delta',delta:{stop_reason:'max_tokens'},usage:{output_tokens:8192}});send({type:'message_stop'});res.end()});
 const turn=await streamTurn(args(f));assert.equal(turn.outcome,'output_limit');assert.equal(turn.text,'');assert.match(turn.reasoning,/fixture summary/);assert.equal(turn.usage.output_tokens,8192);assert.equal(turn.calls.length,0);assert.equal(f.count(),1);
});
test('truncated tool JSON at max_tokens is never parsed into an executable call',async t=>{
 const f=await fixture(t,(res,send)=>{send({type:'content_block_start',index:0,content_block:{type:'tool_use',id:'a',name:'write_file',input:{}}});send({type:'content_block_delta',index:0,delta:{partial_json:'{"path":"a","content":"unfinished'}});send({type:'message_delta',delta:{stop_reason:'max_tokens'}});send({type:'message_stop'});res.end()});const turn=await streamTurn(args(f));assert.equal(turn.outcome,'output_limit');assert.deepEqual(turn.calls,[]);assert.ok(!turn.wire.calls.length);assert.ok(!turn.wire.anthropicContent?.some(b=>b.type==='tool_use'));assert.equal(f.count(),1);
});
test('EOF without any terminal marker is a stream failure, not successful partial output',async t=>{
 const f=await fixture(t,(res,send)=>{send({choices:[{delta:{content:'partial fixture response'}}]});res.end()});await assert.rejects(streamTurn(args(f,'openai')),e=>e.code==='STREAM_INTERRUPTED' && e.category==='network');assert.equal(f.count(),1);
});
test('complete-looking tool calls without a finish marker must not execute',async t=>{
 const f=await fixture(t,(res,send)=>{send({choices:[{delta:{tool_calls:[{index:0,id:'x',function:{name:'write_file',arguments:'{"path":"a","content":"do not write"}'}}]}}]});res.end()});await assert.rejects(streamTurn(args(f,'openai')),e=>e.code==='STREAM_INTERRUPTED');assert.equal(f.count(),1);
});
test('malformed SSE does not disappear as an empty-model error; missing trailing blank line is tolerated',async t=>{
 const bad=await fixture(t,res=>res.end('data: {not json}\n\n'));await assert.rejects(streamTurn(args(bad,'openai')),e=>e.code==='PROTOCOL_ERROR');
 const good=await fixture(t,res=>res.end('data: {"choices":[{"delta":{"content":"OK"},"finish_reason":"stop"}]}'));const result=await streamTurn(args(good,'openai'));assert.equal(result.text,'OK');assert.equal(result.outcome,'complete');
});
test('authentication and rate limits remain distinct and never automatically retry or reveal the key',async t=>{
 for(const [status,category] of [[401,'auth'],[429,'rate_limit'],[503,'server']]){const f=await fixture(t,res=>{res.statusCode=status;res.end('fixture-secret-keep-private error')});await assert.rejects(streamTurn(args(f)),e=>e.status===status && e.category===category && !e.message.includes('fixture-secret-keep-private'));assert.equal(f.count(),1)}
});
test('explicit completion markers end a turn even if the proxy leaves the HTTP stream open',async t=>{
 for(const kind of ['openai','anthropic']){const f=await fixture(t,(res,send)=>{if(kind==='openai'){send({choices:[{delta:{content:'OK'}}]});res.write('data: [DONE]\n\n')}else{send({type:'content_block_start',index:0,content_block:{type:'text',text:'OK'}});send({type:'message_stop'})}});const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),1000);try{const result=await streamTurn({...args(f,kind),signal:controller.signal});assert.equal(result.text,'OK');assert.equal(result.outcome,'complete');assert.equal(controller.signal.aborted,false);}finally{clearTimeout(timer)}}
});
test('DeepSeek balanced mode explicitly reduces reasoning effort without disabling deep modes',()=>{
 const config={kind:'anthropic',baseUrl:'https://api.deepseek.com/anthropic',model:'deepseek-flash'};assert.equal(reasoningOptions(config,'standard').body.output_config?.effort,'low');assert.equal(reasoningOptions(config,'deep').body.output_config.effort,'high');assert.equal(reasoningOptions(config,'max').body.output_config.effort,'max');
});
