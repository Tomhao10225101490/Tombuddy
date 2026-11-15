const {test}=require('node:test');const assert=require('node:assert/strict');const {reasoningOptions}=require('../electron/reasoning.cjs');const {reasoningCapabilities}=require('../electron/effort.cjs');const {buildRequest}=require('../electron/providers.cjs');
const claude=model=>({kind:'anthropic',baseUrl:'https://api.anthropic.com/v1',model});const native={native:true,thinkingEnabled:true};
test('Claude effort choices follow public model capabilities, not a universal fake five-level scale',()=>{
 const c46=reasoningCapabilities(claude('claude-sonnet-4-6'));assert.deepEqual(c46.levels,['auto','low','medium','high','max']);assert.equal(c46.mode,'effort');
 const c47=reasoningCapabilities(claude('claude-opus-4-7'));assert.ok(c47.levels.includes('xhigh'));assert.equal(c47.defaultEffort,'xhigh');
 const c55=reasoningCapabilities(claude('claude-opus-5-5'));assert.equal(c55.defaultEffort,'medium');assert.equal(c55.canDisable,false);assert.throws(()=>reasoningOptions(claude('claude-opus-5-5'),'low',{native:true,thinkingEnabled:false}),/不能|不支持/);
});
test('native Claude effort uses actual names, summary opt-in, correct max and compatible off behavior',()=>{
 for(const value of ['low','medium','high','xhigh','max']){const body=reasoningOptions(claude('claude-opus-4-7'),value,native).body;assert.equal(body.output_config.effort,value);assert.deepEqual(body.thinking,{type:'adaptive',display:'summarized'});assert.ok(!body.thinking.budget_tokens)}
 const auto=reasoningOptions(claude('claude-sonnet-4-6'),'auto',native);assert.equal(auto.body.output_config,undefined);assert.equal(auto.body.thinking.type,'adaptive');
 const off=reasoningOptions(claude('claude-opus-5'),'high',{native:true,thinkingEnabled:false});assert.equal(off.body.thinking.type,'disabled');assert.throws(()=>reasoningOptions(claude('claude-opus-5'),'max',{native:true,thinkingEnabled:false}),/最高支持 High/);
});
test('DeepSeek has only Low High Max, balanced default, and a separate genuine thinking toggle',()=>{
 const config={kind:'anthropic',baseUrl:'https://api.deepseek.com/anthropic',model:'deepseek-flash'};const c=reasoningCapabilities(config);assert.deepEqual(c.levels,['auto','low','high','max']);assert.equal(c.defaultEffort,'low');assert.match(c.note,/Medium.*XHigh/);
 for(const value of ['low','high','max'])assert.equal(reasoningOptions(config,value,native).body.output_config.effort,value);
 const off=reasoningOptions(config,'high',{native:true,thinkingEnabled:false});assert.deepEqual(off.body.thinking,{type:'disabled'});assert.equal(off.body.output_config,undefined);assert.throws(()=>reasoningOptions(config,'xhigh',native),/不支持/);assert.throws(()=>reasoningOptions(config,'medium',native),/不支持/);
});
test('older Claude fixed budgets are explicitly distinguished from adaptive effort',()=>{
 const config=claude('claude-sonnet-4-5');assert.equal(reasoningCapabilities(config).mode,'budget');for(const [value,budget] of [['low',1024],['medium',4096],['high',16384]]){const opts=reasoningOptions(config,value,native);assert.equal(opts.body.thinking.budget_tokens,budget);assert.ok(opts.body.max_tokens>budget);assert.equal(opts.body.output_config,undefined)}assert.equal(reasoningOptions(config,'low',{native:true,thinkingEnabled:false}).body.thinking.type,'disabled');
});
test('OpenAI compatible effort does not invent a thinking-off switch or unsupported Max',()=>{
 const config={kind:'openai',reasoningProtocol:'openai-effort',baseUrl:'http://localhost/v1',model:'fixture'};for(const level of ['low','medium','high']){const req=buildRequest({config,key:'fixture',messages:[{role:'user',content:'fixture'}],level,reasoningSettings:native});assert.equal(req.body.reasoning_effort,level);assert.equal(req.body.thinking,undefined)}assert.throws(()=>reasoningOptions(config,'max',native),/不支持/);assert.throws(()=>reasoningOptions(config,'low',{native:true,thinkingEnabled:false}),/不支持关闭/);
});
test('unknown models never get fake effort parameters, while Gemini disable rules are model specific',()=>{
 const unknown={kind:'openai',baseUrl:'http://localhost/v1',model:'unknown'};assert.deepEqual(reasoningCapabilities(unknown).levels,['auto']);assert.deepEqual(reasoningOptions(unknown,'auto',native).body,{});assert.throws(()=>reasoningOptions(unknown,'high',native),/不支持/);
 const pro={kind:'gemini',baseUrl:'https://generativelanguage.googleapis.com/v1beta',model:'gemini-2.5-pro'};assert.throws(()=>reasoningOptions(pro,'low',{native:true,thinkingEnabled:false}),/不支持关闭/);const flash={...pro,model:'gemini-2.5-flash'};assert.equal(reasoningOptions(flash,'low',{native:true,thinkingEnabled:false}).body.generationConfig.thinkingConfig.thinkingBudget,0);
});
