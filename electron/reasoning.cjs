const PROTOCOLS=['auto','none','openai-effort','anthropic-budget','anthropic-adaptive','gemini-budget','gemini-level','deepseek','deepseek-anthropic','qwen','openrouter'];
function resolveProtocol(config){
 let protocol=config.reasoningProtocol || 'auto';if(!PROTOCOLS.includes(protocol))throw new Error('未知推理协议');
 if(protocol==='auto'){
  const model=(config.model || '').toLowerCase();let host='';try{host=new URL(config.baseUrl).hostname}catch{}
  protocol=config.kind==='anthropic'?(host==='api.deepseek.com'?'deepseek-anthropic':/claude-(?:(?:sonnet|opus|haiku)-(?:4[.-][6-9](?:-|$)|[5-9](?:[-.]|$))|(?:fable|mythos))/.test(model)?'anthropic-adaptive':/claude/.test(model)?'anthropic-budget':'none'):
   config.kind==='gemini'?(/^gemini-3/.test(model)?'gemini-level':/^gemini-2\.5/.test(model)?'gemini-budget':'none'):
   host==='api.deepseek.com'?'deepseek':host==='openrouter.ai'?'openrouter':/^(?:o[134](?:-|$)|gpt-5)/.test(model)?'openai-effort':'none';
 }
 return protocol;
}
function reasoningOptions(config,level='standard',settings={}){
 const protocol=resolveProtocol(config);
 const family=protocol.startsWith('anthropic-') || protocol==='deepseek-anthropic'?'anthropic':protocol.startsWith('gemini-')?'gemini':'openai';
 if(protocol!=='none' && family!==config.kind)throw new Error('推理协议与 API 协议不匹配，请检查模型服务配置');
 if(settings.native || ['auto','low','medium','high','xhigh'].includes(level))return require('./effort.cjs').nativeReasoningOptions(config,level,{...settings,protocol});
 if(!['standard','deep','max'].includes(level))throw new Error('无效的推理强度');
 const result={body:{},headers:{},protocol,note:'标准模式：沿用服务商默认推理设置',timeoutMs:120000};
 if(level==='standard'){
  if(protocol==='deepseek-anthropic'){result.body={thinking:{type:'enabled'},output_config:{effort:'low'}};result.note='DeepSeek 均衡模式：保留思考并请求 low 强度，减少推理占满输出额度；需要更深入分析可选深度或高强度。';}
  if(protocol==='deepseek'){result.body={thinking:{type:'enabled'},reasoning_effort:'low'};result.note='DeepSeek 均衡模式：保留思考并请求 low 强度，降低只推理而未输出正文的风险。';}
  return result;
 }
 result.timeoutMs=level==='max'?300000:180000;
 if(protocol==='none'){result.note='无法确认此模型的原生推理接口：仅启用更严谨的任务工作流，不发送推理参数。可在模型服务中指定协议。';return result;}
 const high=level==='max';
 if(protocol==='openai-effort')result.body={reasoning_effort:high?'high':'medium'};
 if(protocol==='anthropic-budget'){result.body={thinking:{type:'enabled',budget_tokens:high?16384:4096},max_tokens:high?32768:16384};result.headers={'anthropic-beta':'interleaved-thinking-2025-05-14'};}
 if(protocol==='anthropic-adaptive')result.body={thinking:{type:'adaptive'},output_config:{effort:high?'high':'medium'},max_tokens:high?32768:16384};
 if(protocol==='gemini-budget')result.body={generationConfig:{thinkingConfig:{includeThoughts:true,thinkingBudget:high?24576:8192}}};
 if(protocol==='gemini-level')result.body={generationConfig:{thinkingConfig:{includeThoughts:true,thinkingLevel:'high'}}};
 if(protocol==='deepseek-anthropic')result.body={thinking:{type:'enabled'},output_config:{effort:high?'max':'high'},max_tokens:high?32768:16384};
 if(protocol==='deepseek')result.body={thinking:{type:'enabled'},reasoning_effort:high?'max':'high'};
 if(protocol==='qwen')result.body={enable_thinking:true,thinking_budget:high?16384:4096};
 if(protocol==='openrouter')result.body={reasoning:{effort:high?'high':'medium'}};
 result.note=`已请求 ${protocol} 原生推理；是否支持及实际思考量取决于模型，可能增加费用和等待时间`;
 return result;
}
module.exports={reasoningOptions,PROTOCOLS,resolveProtocol};
