const {resolveProtocol}=require('./reasoning.cjs');
const EFFORTS=['auto','low','medium','high','xhigh','max'];
function reasoningCapabilities(config){
 const protocol=resolveProtocol(config),model=(config.model || '').toLowerCase();let levels=['auto'],defaultEffort='auto',mode='none',canDisable=false,supportsThinking=false,note='未声明可控制的原生推理协议；沿用 API 默认，不伪造思考档位。',offMaxEffort;
 if(protocol==='anthropic-adaptive'){
  mode='effort';supportsThinking=true;canDisable=!/claude-(?:(?:opus|sonnet|haiku)-5[.-]5|fable|mythos)/.test(model);
  const newer=/claude-(?:(?:opus|sonnet|haiku)-(?:4[.-][78]|[5-9])|fable|mythos)/.test(model),known=/claude-/.test(model);
  levels=['auto','low','medium','high',...(newer?['xhigh']:[]),...(known?['max']:[])];defaultEffort=/5[.-]5|fable-5[.-]2/.test(model)?'medium':/opus-4[.-]7/.test(model)?'xhigh':'high';
  offMaxEffort=/claude-opus-5(?:-|$)/.test(model)&&!/opus-5-5/.test(model)?'high':undefined;
  note='Claude 原生 adaptive thinking + effort。档位随模型而变；Max 仅本会话。仅返回公开摘要，不是内部完整思维链。';
 }
 if(protocol==='deepseek'||protocol==='deepseek-anthropic'){
  mode='effort';supportsThinking=true;canDisable=true;levels=['auto','low','high','max'];defaultEffort='low';note='DeepSeek 原生只有 Low / High / Max。Medium、XHigh 会被服务商映射成 High，因此不冒充独立档位。默认 Low 保留思考并减少推理耗尽正文额度。';
 }
 if(protocol==='openai-effort'||protocol==='openrouter'){
  mode='effort';levels=['auto','low','medium','high'];defaultEffort='medium';note='发送该协议真实的 low / medium / high；不把其他模型的 Max 或 XHigh 强行套用。没有独立的关闭思考开关。';
 }
 if(protocol==='anthropic-budget'||protocol==='qwen'){
  mode='budget';supportsThinking=true;canDisable=true;levels=['auto','low','medium','high'];defaultEffort='medium';note=protocol==='anthropic-budget'?'该旧型号使用固定思考预算，而非 Claude 新型号原生 effort：Low 1024 / Medium 4096 / High 16384 tokens；Auto 使用默认预算 4096。':'Qwen 思考预算：Low 2048 / Medium 8192 / High 16384 tokens；不是 Claude 原生 effort。';
 }
 if(protocol==='gemini-budget'){
  mode='budget';supportsThinking=true;canDisable=/flash/.test(model);levels=['auto','low','medium','high'];defaultEffort='medium';note='Gemini 思考预算映射：Low 2048 / Medium 8192 / High 24576；Auto 沿用模型预算。Pro 不提供关闭思考。';
 }
 if(protocol==='gemini-level'){
  mode='effort';supportsThinking=true;levels=['auto','low','high'];defaultEffort='high';note='Gemini 原生 thinkingLevel Low / High；不伪造其未声明的 XHigh / Max 或关闭开关。';
 }
 const legacyMap={standard:protocol.startsWith('deepseek')?'low':'auto',deep:protocol.startsWith('deepseek')?'high':'medium',max:levels.includes('max')?'max':'high'};
 return {protocol,mode,levels,defaultEffort,supportsThinking,canDisable,defaultThinking:true,note,legacyMap,...(offMaxEffort?{offMaxEffort}:{})};
}
function nativeReasoningOptions(config,level,settings={}){
 const c=reasoningCapabilities(config);if(!EFFORTS.includes(level)||!c.levels.includes(level))throw new Error(`当前模型不支持 ${level} 思考档位；支持 ${c.levels.join(' / ')}。未发送 API 请求。`);
 const thinkingEnabled=settings.thinkingEnabled!==false;
 if(!thinkingEnabled&&!c.canDisable)throw new Error('该模型不支持关闭思考；请降低 effort，而不是发送不兼容的参数。');
 if(!thinkingEnabled&&c.offMaxEffort&&['xhigh','max'].includes(level))throw new Error('该模型关闭思考时最高支持 High；请先调整档位。');
 const p=c.protocol,body={},headers={};const high=['high','xhigh','max'].includes(level);const max=level==='max'||level==='xhigh';const limit=max?32768:high||level==='medium'?16384:8192;let effectiveEffort=level;
 if(p==='anthropic-adaptive'){
  body.thinking=thinkingEnabled?{type:'adaptive',display:'summarized'}:{type:'disabled'};body.max_tokens=limit;if(level!=='auto')body.output_config={effort:level};
 }
 if(p==='deepseek-anthropic'||p==='deepseek'){
  body.thinking={type:thinkingEnabled?'enabled':'disabled'};
  if(p==='deepseek-anthropic')body.max_tokens=limit;
  if(thinkingEnabled&&level!=='auto'){if(p==='deepseek-anthropic')body.output_config={effort:level};else body.reasoning_effort=level;}
 }
 if(p==='openai-effort'&&level!=='auto')body.reasoning_effort=level;
 if(p==='openrouter'&&level!=='auto')body.reasoning={effort:level};
 if(p==='anthropic-budget'){
  const budget=level==='low'?1024:level==='high'?16384:4096;body.thinking=thinkingEnabled?{type:'enabled',budget_tokens:budget}:{type:'disabled'};body.max_tokens=thinkingEnabled?(budget===16384?32768:budget===4096?16384:8192):8192;
  if(thinkingEnabled)headers['anthropic-beta']='interleaved-thinking-2025-05-14';effectiveEffort=thinkingEnabled?`budget:${budget}`:'off';
 }
 if(p==='qwen'){body.enable_thinking=thinkingEnabled;if(thinkingEnabled)body.thinking_budget=level==='low'?2048:level==='high'?16384:8192;}
 if(p==='gemini-budget'){
  const cfg={includeThoughts:thinkingEnabled};if(!thinkingEnabled)cfg.thinkingBudget=0;else if(level!=='auto')cfg.thinkingBudget=level==='low'?2048:level==='high'?24576:8192;body.generationConfig={thinkingConfig:cfg};
 }
 if(p==='gemini-level')body.generationConfig={thinkingConfig:{includeThoughts:true,...(level==='auto'?{}:{thinkingLevel:level})}};
 if(!thinkingEnabled&&['deepseek','deepseek-anthropic','anthropic-budget','qwen','gemini-budget'].includes(p))effectiveEffort='off';
 return {body,headers,protocol:p,timeoutMs:max?300000:level==='medium'||high?180000:120000,note:`${c.note} 本次请求：${thinkingEnabled?(level==='auto'?'Auto（服务默认或默认预算）':level.toUpperCase()):'思考关闭'}；更高强度可能增加费用与等待。`,effort:{requested:level,effective:effectiveEffort,thinkingEnabled:c.supportsThinking?thinkingEnabled:undefined,mode:c.mode}};
}
module.exports={EFFORTS,reasoningCapabilities,nativeReasoningOptions};
