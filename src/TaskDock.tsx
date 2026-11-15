import {BookOpen,Check,ChevronRight,Clock3,ListChecks,LoaderCircle,Pin,ShieldCheck,X} from 'lucide-react';
import type {Message,TaskMode} from './types';
import {MODE_NAMES} from './ReasoningControls';
export function TaskDock({source,last,taskMode,executionMode,busy,approved,onApprove,onRefine,onClose}:{source?:Message;last?:Message;taskMode:TaskMode;executionMode:'full'|'execute';busy:boolean;approved:boolean;onApprove:()=>void;onRefine:()=>void;onClose:()=>void}){
 const plan=source?.plan;const completed=plan?.steps.filter(s=>s.status==='completed').length || 0;
 const ready=source?.taskMode==='plan'&&!!source.endedAt&&!source.error&&!source.paused&&!source.stopped&&!approved;
 const status=busy?(last?.liveStatus || '等待模型响应'):last?.paused?'已暂停 · 可在对话中继续':last?.error?'请求未完成 · 保留已报告计划':last?.stopped?'已停止 · 尚未确认完成':ready?'规划结束 · 等待你确认':approved?`计划已确认 · ${executionMode==='full'?'免审批执行':'逐次审批执行'}`:plan?'本轮回复结束 · 请核对验证证据':'尚未收到模型计划';
 return <aside className="task-dock" aria-label="固定任务计划"><header className="task-dock-header drag"><ListChecks size={16}/><strong>任务计划</strong><Pin size={12}/><button className="icon" title="收起固定计划" onClick={onClose}><X size={15}/></button></header>
  <div className="task-dock-status"><span className={'mode-label '+taskMode}>{taskMode==='plan'?<BookOpen size={12}/>:<ShieldCheck size={12}/>} {MODE_NAMES[taskMode]}</span><p>{busy?<LoaderCircle size={12} className="spin"/>:<Clock3 size={12}/>}<span>{status}</span></p></div>
  <div className="task-dock-scroll" tabIndex={0} aria-label="计划步骤独立滚动区域">
   {plan?<section className="task-plan"><header><strong>当前计划</strong><span>模型报告 {completed}/{plan.steps.length}</span></header>{plan.summary&&<p>{plan.summary}</p>}<ol>{plan.steps.map((step,i)=><li key={step.id} className={step.status}><span className="plan-step-icon">{step.status==='completed'?<Check size={12}/>:step.status==='in_progress'?<LoaderCircle size={12} className={busy?'spin':''}/>:i+1}</span><div><span>{step.title}</span><small>{step.status==='completed'?'模型标记完成':step.status==='in_progress'?(busy?'进行中':'尚未标记完成'):'待处理'}</small></div></li>)}</ol></section>:<div className="task-dock-empty"><ListChecks size={27}/><h3>先梳理，再动手</h3><p>模型通过 update_plan 发布步骤后，进度会固定显示在这里，不随聊天和工具日志滚走。</p><button className="text-btn" disabled={busy} onClick={onRefine}>先制定只读计划<ChevronRight size={13}/></button></div>}
   {source&&last&&source.id!==last.id&&<p className="plan-source-note">沿用上一轮已报告的计划；新的计划更新会替换这里的内容。</p>}
  </div>
  <footer className="task-dock-footer">{ready&&<div className="plan-review"><strong>审阅计划后再执行</strong><button className="primary-btn" disabled={busy} onClick={onApprove}><ShieldCheck size={13}/>{executionMode==='full'?'确认计划，免审批执行':'确认计划，逐次审批执行'}</button><button className="secondary-btn" disabled={busy} onClick={onRefine}>继续完善计划</button><small>确认后才发起执行请求，可能计费。{executionMode==='full'?'将按 Full Access 自动写入和运行命令，可改动项目外文件。':'每次文件写入与命令仍需你批准。'}</small></div>}{approved&&<p className="plan-approved"><Check size={13}/>已由你确认；不等于所有步骤已验证。</p>}<div className="plan-truth-note"><ShieldCheck size={12}/><span>进度来自模型报告，不是隐藏思维链。标记完成不代表测试通过，请以真实工具结果和实际验证为准。</span></div></footer>
 </aside>;
}
