function redact(text,key=''){return String(text || '').replaceAll(key || '\0','[REDACTED]').replace(/\bsk-[A-Za-z0-9_-]{12,}/g,'[REDACTED]').replace(/Bearer\s+[A-Za-z0-9._-]{12,}/gi,'Bearer [REDACTED]').slice(0,1800)}
class RequestFailure extends Error{
 constructor(code,category,message,options={}){super(message);this.name='RequestFailure';this.code=code;this.category=category;Object.assign(this,options)}
}
function httpFailure(status,detail,key,requestId){
 const category=status===401||status===403?'auth':status===402?'billing':status===429?'rate_limit':status===408||status===504?'timeout':status>=500?'server':'request';
 const hints={auth:'密钥仍保留在本机。请检查服务商授权、账号权限或密钥有效性，不必先删除配置。',billing:'服务商拒绝了本次请求，请检查余额或配额；本机配置未被删除。',rate_limit:'服务商限流。请稍后手动继续，不会自动重试或要求重填密钥。',timeout:'服务商请求超时。已有进度和密钥保留；手动继续可能产生额外费用。',server:'服务商暂时故障。配置仍保留，不会自动重发已可能计费的请求。',request:'检查模型、上下文长度和请求参数；这不等于网络断线或密钥丢失。'};
 return new RequestFailure(`HTTP_${status}`,category,`API ${status}: ${redact(detail,key)}`,{status,hint:hints[category],retryable:['rate_limit','timeout','server'].includes(category),...(requestId?{requestId:redact(requestId,key).slice(0,128)}:{})});
}
function toFailure(error,key=''){
 if(error instanceof RequestFailure)return {code:error.code,category:error.category,message:redact(error.message,key),hint:error.hint || '本机配置仍保留，请根据具体错误处理。',retryable:!!error.retryable,...(error.status?{status:error.status}:{}),...(error.requestId?{requestId:redact(error.requestId,key)}:{})};
 const code=error?.cause?.code || error?.code;
 if(error?.name==='TimeoutError'||['ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT'].includes(code))return {code:'REQUEST_TIMEOUT',category:'timeout',message:'模型请求超时，连接已停止等待。',hint:'密钥与已完成进度保留。可手动继续；不会自动重发可能已计费的请求。',retryable:true};
 if(error?.message==='fetch failed'||['ENOTFOUND','EAI_AGAIN','ECONNRESET','ECONNREFUSED','EPIPE','UND_ERR_SOCKET'].includes(code))return {code:'NETWORK_ERROR',category:'network',message:`网络请求未完成${typeof code==='string'?`（${code}）`:''}。`,hint:'检查网络、代理或服务商可达性；配置未丢失，不需要反复填写密钥。不会自动重试。',retryable:true};
 return {code:'LOCAL_ERROR',category:'local',message:redact(error?.message || error,key),hint:'本次操作没有完成；现有配置仍保留。请检查具体错误，不要先删除密钥。',retryable:false};
}
module.exports={RequestFailure,httpFailure,toFailure,redact};
