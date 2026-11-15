const {test}=require('node:test');const assert=require('node:assert/strict');const p=require('../electron/providers.cjs');
test('deep reasoning applies genuine provider controls; standard does not inject unsupported options',()=>{
 assert.equal(typeof p.reasoningOptions,'function','reasoningOptions must exist');
 assert.deepEqual(p.reasoningOptions({kind:'openai',model:'gpt-4.1'},'standard').body,{});
 assert.equal(p.reasoningOptions({kind:'openai',model:'gpt-5'},'max').body.reasoning_effort,'high');
 const a=p.reasoningOptions({kind:'anthropic',model:'claude-sonnet-4-5'},'deep');assert.equal(a.body.thinking.type,'enabled');assert.ok(a.body.thinking.budget_tokens>=1024);assert.ok(a.body.max_tokens>a.body.thinking.budget_tokens);
 assert.equal(p.reasoningOptions({kind:'anthropic',model:'claude-sonnet-4-6'},'max').body.thinking.type,'adaptive');
 assert.equal(p.reasoningOptions({kind:'gemini',model:'gemini-2.5-pro'},'deep').body.generationConfig.thinkingConfig.includeThoughts,true);
 assert.equal(p.reasoningOptions({kind:'gemini',model:'gemini-3-pro-preview'},'max').body.generationConfig.thinkingConfig.thinkingLevel,'high');
 assert.equal(p.reasoningOptions({kind:'openai',model:'deepseek-chat',baseUrl:'https://api.deepseek.com/v1'},'deep').body.thinking.type,'enabled');
 const unknown=p.reasoningOptions({kind:'openai',model:'unknown'},'max');assert.deepEqual(unknown.body,{});assert.match(unknown.note,/无法确认/);
 const da=p.reasoningOptions({kind:'anthropic',model:'deepseek-flash',baseUrl:'https://api.deepseek.com/anthropic'},'deep');assert.equal(da.protocol,'deepseek-anthropic');assert.equal(da.body.output_config.effort,'high');assert.ok(!('budget_tokens' in da.body.thinking));
 assert.throws(()=>p.reasoningOptions({kind:'openai',reasoningProtocol:'anthropic-budget'},'deep'),/协议/);
});
test('connection probes request a small limit, no tools and the correct low-effort DeepSeek dialect',()=>{
 const request=p.buildRequest({config:{kind:'anthropic',baseUrl:'https://api.deepseek.com/anthropic',model:'deepseek-flash'},key:'fixture',messages:[{role:'user',content:'Reply with only OK.'}],tools:p.TOOL_DEFS,probe:true});assert.equal(request.body.max_tokens,256);assert.equal(request.body.thinking.type,'enabled');assert.equal(request.body.output_config.effort,'low');assert.ok(!request.body.tools);assert.equal(request.url,'https://api.deepseek.com/anthropic/messages');assert.ok(!request.headers['anthropic-beta']);
});
test('signed provider blocks replay exactly without collapsing or reconstructing them',()=>{
 const blocks=[{type:'thinking',thinking:'public provider summary',signature:'sig-a'},{type:'redacted_thinking',data:'opaque'},{type:'text',text:'Reading'},{type:'tool_use',id:'a',name:'read_file',input:{path:'a'}}];
 const m=[{role:'assistant',content:'do not reconstruct',anthropicContent:blocks,calls:[{id:'a',name:'read_file',args:{path:'a'}}]}];assert.deepEqual(p.anthropicMessages(m)[0].content,blocks);
 const parts=[{text:'summary',thought:true,thoughtSignature:'sig-t'},{functionCall:{name:'read_file',args:{path:'a'}},thoughtSignature:'sig-f'}];assert.deepEqual(p.geminiMessages([{role:'assistant',content:'ignored',geminiParts:parts}])[0].parts,parts);
 const o=p.openaiMessages([{role:'assistant',content:'done',reasoning:'provider-reasoning'}],true);assert.equal(o[0].reasoning_content,'provider-reasoning');
});
