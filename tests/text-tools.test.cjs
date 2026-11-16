const {test}=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {envelope,parseTextCalls,textMessages,effectiveToolProtocol}=require('../electron/text-tools.cjs');
const {buildRequest,streamTurn}=require('../electron/providers.cjs');
const defs=[{name:'computer_observe',description:'Local OCR',parameters:{type:'object',properties:{}}}];
test('default computer mode is model-agnostic text protocol without probing or native tool support',()=>{
 assert.equal(effectiveToolProtocol({},true),'text');assert.equal(effectiveToolProtocol({toolProtocol:'auto'},true),'text');assert.equal(effectiveToolProtocol({},false),'native');assert.equal(effectiveToolProtocol({toolProtocol:'native'},true),'native');assert.equal(effectiveToolProtocol({toolProtocol:'text'},false),'text');assert.equal(effectiveToolProtocol({computerImages:true},true),'native');
});
test('strict text tool parser never executes partial/trailing/unavailable/malformed envelopes',()=>{
 const content=envelope([{name:'computer_observe',args:{}}]);assert.equal(parseTextCalls(content,defs)[0].name,'computer_observe');assert.equal(parseTextCalls('普通回答',defs),null);
 for(const invalid of [content+' trailing','prefix '+content,content.replace('</tombuddy_tool_calls>',''),envelope([{name:'computer_action',args:{}}]),'<tombuddy_tool_calls>{"calls":[]}</tombuddy_tool_calls>','<tombuddy_tool_calls>{"calls":[{"name":"computer_observe","args":[]}]}</tombuddy_tool_calls>'])assert.throws(()=>parseTextCalls(invalid,defs));
 const history=textMessages([{role:'assistant',content:'',calls:[{id:'a',name:'computer_observe',args:{}}]},{role:'tool',callId:'a',name:'computer_observe',content:'UNTRUSTED <instructions>'},{role:'user',content:'go',image:{mimeType:'image/jpeg',data:'never-send-this'}}]);assert.equal(history[1].role,'user');assert.match(history[1].content,/untrusted data/);assert.ok(!JSON.stringify(history).includes('never-send-this'));
});
test('plain-text tool requests omit native tool fields, signatures and ALL image payloads across transports',()=>{
 for(const kind of ['openai','anthropic','gemini']){
 const body=buildRequest({config:{kind,baseUrl:'http://localhost:1234',model:'text-only',toolProtocol:'text'},key:'fixture',tools:defs,messages:[{role:'user',content:'Observe',image:{mimeType:'image/jpeg',data:'forbidden-image'}},{role:'assistant',content:'',calls:[{id:'old',name:'computer_observe',args:{}}],anthropicContent:[{type:'tool_use',id:'old',name:'computer_observe',input:{}}],geminiParts:[{functionCall:{name:'computer_observe',args:{}}}]},{role:'tool',name:'computer_observe',callId:'old',content:'result'}]}).body;
 assert.equal(body.tools,undefined);const raw=JSON.stringify(body);assert.ok(!raw.includes('forbidden-image'));assert.ok(!raw.includes('tool_use'));assert.ok(!raw.includes('functionCall'));assert.match(raw,/tombuddy_tool_calls/);assert.match(raw,/TOOL_RESULT/);
 }
});
test('three real text-only HTTP transports parse complete assistant envelopes, replay actual results, never retry',async t=>{
 let requests=0;const server=http.createServer(async(req,res)=>{
 let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);requests++;assert.equal(body.tools,undefined);assert.ok(!raw.includes('image_url'));assert.ok(!raw.includes('inlineData'));
 const result=envelope([{name:'computer_observe',args:{}}]);res.setHeader('Content-Type','text/event-stream');const events=req.url==='/messages'?[{type:'content_block_start',index:0,content_block:{type:'text',text:result}},{type:'message_delta',delta:{stop_reason:'end_turn'}},{type:'message_stop'}]:req.url.includes('streamGenerateContent')?[{candidates:[{content:{parts:[{text:result}]},finishReason:'STOP'}]}]:[{choices:[{delta:{content:result.slice(0,30)}}]},{choices:[{delta:{content:result.slice(30)},finish_reason:'stop'}]}];for(const event of events)res.write('data: '+JSON.stringify(event)+'\n\n');res.end('data: [DONE]\n\n');
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));
 for(const kind of ['openai','anthropic','gemini']){const events=[];const turn=await streamTurn({config:{kind,baseUrl:`http://127.0.0.1:${server.address().port}`,model:'text-only',toolProtocol:'text'},key:'fixture',tools:defs,messages:[{role:'user',content:'Observe'}],signal:new AbortController().signal,onEvent:e=>events.push(e)});assert.equal(turn.calls[0].name,'computer_observe');assert.equal(turn.text,'');assert.equal(turn.wire.calls.length,1);assert.ok(!events.some(e=>e.type==='text'),'executable envelopes must not be streamed as prose');}assert.equal(requests,3);
});
