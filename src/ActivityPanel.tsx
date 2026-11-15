import {useEffect,useState} from 'react';
import {ChevronDown,LoaderCircle,ListChecks,Layers,AlertCircle,Clock3,Check,Square,ShieldCheck} from 'lucide-react';
import type {Message,ViewMode} from './types';
import {LEVEL_NAMES,MODE_NAMES} from './ReasoningControls';
import {Disclosure} from './RunTranscript';
import {runtimeStatus} from './run-state';
export function ActivityPanel({message:m,active,viewMode='normal',onShowPlan}:{message:Message;active:boolean;viewMode?:ViewMode;onShowPlan?:()=>void}){
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{if(!active)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[active]);
 if(!m.startedAt&&!m.reasoning&&!m.plan&&!m.skills?.length)return null;
 const elapsed=m.startedAt&&!m.interrupted?Math.max(0,Math.round(((m.endedAt || now)-m.startedAt)/1000)):undefined;
 const status=runtimeStatus(m,active),awaiting=m.tools?.some(t=>t.status==='awaiting_approval'),Icon=active?(awaiting?ShieldCheck:LoaderCircle):m.error?AlertCircle:m.stopped?Square:Check;
 return <div className={'activity-panel '+(active?'active':'')}>
  <Disclosure className="activity-overview" autoOpen={viewMode==='verbose'} scope={viewMode} summary={<><span className="activity-symbol"><Icon size={14} className={active&&!awaiting?'spin':''}/></span><strong>执行过程</strong><span className="activity-status" role="status" aria-live="polite">{status}</span>{elapsed!==undefined&&<span className="elapsed"><Clock3 size={10}/>{elapsed}s</span>}</>}><div className="activity-details"><div className="activity-mode"><span>{LEVEL_NAMES[m.level || 'standard']}</span><span>{MODE_NAMES[m.taskMode || 'full']}</span>{m.thinkingEnabled!==undefined&&<span>{m.thinkingEnabled?'思考已开启':'思考已关闭'}</span>}</div>{m.note&&<p className="activity-note">{m.note}</p>}{!!m.trace?.length&&<ol className="activity-log">{m.trace.map((entry,i)=><li key={i}><span className={'trace-dot '+entry.kind}/><span>{entry.label}</span><time>+{Math.max(0,Math.round((entry.at-(m.startedAt || entry.at))/1000))}s</time></li>)}</ol>}<p className="activity-disclaimer">时间与执行事件来自应用；计划来自模型报告，不代表测试通过。</p></div></Disclosure>
  {!!m.skills?.length&&<div className="active-skills"><Layers size={12}/>{m.skills.map(s=><span title={`${s.reason} · ${s.author} · ${s.license}`} key={s.id}>{s.title}<small>{s.reason==='自动匹配'?'自动':'手动'}</small></span>)}</div>}
  {m.plan&&<button className="plan-reference" onClick={onShowPlan}><ListChecks size={13}/><span>公开任务计划已更新</span><small>固定面板查看</small><ChevronDown size={11}/></button>}
  {!active&&!m.reasoning&&m.level&&!['standard','auto'].includes(m.level)&&!m.error&&viewMode!=='normal'&&<p className="no-reasoning-note">服务商没有返回可展示的推理摘要，应用不会补写或伪造。</p>}
  {!!m.warnings?.length&&<div className="activity-warnings">{m.warnings.map((warning,i)=><p key={i}><AlertCircle size={12}/>{warning}</p>)}</div>}
  {m.usage&&viewMode!=='normal'&&<div className="token-usage">API 报告用量 {m.usage.inputTokens!==undefined&&<span>输入 {m.usage.inputTokens.toLocaleString()}</span>}{m.usage.outputTokens!==undefined&&<span>输出 {m.usage.outputTokens.toLocaleString()}</span>}{m.usage.reasoningTokens!==undefined&&<span>推理 {m.usage.reasoningTokens.toLocaleString()}</span>}<small>tokens · 非费用估算</small></div>}
 </div>;
}
