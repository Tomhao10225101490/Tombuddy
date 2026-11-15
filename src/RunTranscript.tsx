import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {AlertCircle,Check,ChevronDown,Clock3,Copy,FileText,LoaderCircle,ShieldCheck,Square,Terminal,X} from 'lucide-react';
import type {EditPreview,Message,Tool,ViewMode} from './types';
import {diffLines,transcript} from './run-state';

export function Disclosure({className,autoOpen=false,scope='',summary,children}:{className:string;autoOpen?:boolean;scope?:string;summary:ReactNode;children:ReactNode}){
 const [manual,setManual]=useState<boolean|null>(null);useEffect(()=>setManual(null),[scope]);const open=manual??autoOpen;
 return <details className={className} open={open||undefined}><summary onClick={e=>{e.preventDefault();setManual(!open)}}>{summary}<ChevronDown size={12}/></summary>{children}</details>;
}
export function EditDiff({edit}:{edit:EditPreview}){
 if(edit.unavailable)return <p className="diff-unavailable">{edit.unavailable}</p>;
 const result=diffLines(edit.before||'',edit.after||'');
 return <div className="edit-diff" aria-label="文件修改预览"><div className="diff-caption"><span>{edit.existed?'修改预览':'新增文件'}</span><span className="diff-count"><b>+{result.added}</b> <i>−{result.removed}</i></span></div>{result.lines.length?<pre>{result.lines.map((line,i)=><div className={'diff-line '+line.kind} key={i}><span className="line-number">{line.oldLine??''}</span><span className="line-number">{line.newLine??''}</span><span className="diff-sign">{line.kind==='add'?'+':line.kind==='remove'?'−':' '}</span><code>{line.text||' '}</code></div>)}</pre>:<p>内容未改变</p>}{result.truncated&&<small>预览最多显示 400 行；不是完整差异。</small>}</div>;
}
function LiveOutput({text}:{text:string}){
 const ref=useRef<HTMLPreElement>(null),follow=useRef(true);
 useLayoutEffect(()=>{if(follow.current&&ref.current)ref.current.scrollTop=ref.current.scrollHeight},[text]);
 return <pre className="tool-output" aria-label="实际命令输出" ref={ref} onWheel={e=>{if(e.deltaY<0)follow.current=false}} onScroll={e=>{const el=e.currentTarget;follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<20}}>{text}</pre>;
}
export function InlineApproval({call,onApprove}:{call:Tool;onApprove:(value:boolean)=>void}){
 return <section className="approval-dialog inline-approval" role="group" aria-label="操作审批"><div className="approval-icon"><ShieldCheck size={18}/></div><h2>{call.name==='write_file'?'允许写入这个文件？':'允许执行这条命令？'}</h2><p>{call.name==='write_file'?'这会创建或覆盖项目文件。请先检查完整内容。':'命令使用当前用户权限，可访问项目外文件及网络；不是沙箱。'}</p><code className="approval-path">{call.args.path||call.args.command}</code>{call.name==='write_file'&&(call.edit?<EditDiff edit={call.edit}/>:<pre>{String(call.args.content||'').slice(0,40000)}</pre>)}{call.name==='write_file'&&<Disclosure className="raw-write-content" summary={<>查看完整待写入内容</>}><pre>{String(call.args.content||'')}</pre></Disclosure>}<small>仅批准本次操作 · 2 分钟未处理自动拒绝</small><div className="approval-buttons"><button className="secondary-btn" onClick={()=>onApprove(false)}>拒绝</button><button className="primary-btn" onClick={()=>onApprove(true)}><Check size={14}/>批准本次操作</button></div></section>;
}
function ToolCard({tool:t,viewMode,approval,onApprove}:{tool:Tool;viewMode:ViewMode;approval?:{id:string;call:Tool}|null;onApprove:(value:boolean)=>void}){
 const running=t.status==='running',waiting=t.status==='awaiting_approval',stopped=['stopped','canceled'].includes(t.status);
 const Icon=running?LoaderCircle:waiting?ShieldCheck:t.status==='done'?Check:stopped?Square:AlertCircle;
 const title=({update_plan:'更新计划',list_files:'浏览目录',read_file:'读取文件',write_file:'写入文件',run_command:'运行命令'} as Record<string,string>)[t.name]||t.name;
 return <div className="tool-card" data-tool-id={t.id} data-status={t.status} data-segment-kind="tool"><Disclosure className={'tool '+t.status} autoOpen={viewMode==='verbose'||running&&t.name==='run_command'} scope={viewMode} summary={<><Icon className={running?'spin':''} size={13}/><span>{title}</span><code title={t.args.path||t.args.command}>{t.name==='update_plan'?'公开任务计划':t.args.path||t.args.command||'.'}</code><small className="tool-state">{running?'执行中':waiting?'等待批准':t.status==='done'?'完成':stopped?'已停止':'未完成'}</small>{t.startedAt&&t.endedAt&&<time>{Math.max(0,(t.endedAt-t.startedAt)/1000).toFixed(1)}s</time>}</>}>
  {t.edit&&<EditDiff edit={t.edit}/>}{t.output?<LiveOutput text={t.output}/>:null}
  {t.result&&(!t.output||t.result!==t.output)&&<pre className="tool-result">{(t.output&&t.result.startsWith(t.output)?t.result.slice(t.output.length):t.result).slice(0,40000)}</pre>}
  {!t.output&&!t.result&&<p className="tool-pending">{waiting?'等待你的决定，尚未执行':running?'已开始执行，等待实际输出…':'没有已确认的输出'}</p>}
  {t.name==='write_file'&&<Disclosure className="raw-write-content" summary={<>查看完整文件内容</>}><pre>{String(t.args.content||'')}</pre></Disclosure>}
 </Disclosure>{approval?.call.id===t.id&&<InlineApproval call={approval.call} onApprove={onApprove}/>}</div>;
}
function MarkdownBlock({text,streaming,notify}:{text:string;streaming:boolean;notify:(s:string)=>void}){
 return <div className={'markdown '+(streaming?'streaming':'')} data-segment-kind="text"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{a:({children,href})=><a href={href} target="_blank" rel="noreferrer">{children}</a>,pre:({children})=><div className="code-block"><button title="复制代码" onClick={e=>{const text=e.currentTarget.parentElement?.querySelector('pre')?.textContent||'';navigator.clipboard.writeText(text).then(()=>notify('代码已复制')).catch(()=>notify('复制失败'))}}><Copy size={13}/>复制</button><pre>{children}</pre></div>}}>{text}</ReactMarkdown>{streaming&&<span className="stream-cursor" aria-hidden="true"/>}</div>;
}
export function RunTranscript({message:m,active,viewMode,approval,reviewNonce=0,onApprove,notify}:{reviewNonce?:number;message:Message;active:boolean;viewMode:ViewMode;approval?:{id:string;call:Tool}|null;onApprove:(value:boolean)=>void;notify:(s:string)=>void}){
 const segments=transcript(m),nodes:ReactNode[]=[];
 for(let i=0;i<segments.length;i++){
  const s=segments[i];
  if(s.kind==='tool'){
   const tools:Tool[]=[];let j=i;for(;j<segments.length&&segments[j].kind==='tool';j++){const t=m.tools?.find(t=>t.id===segments[j].toolId);if(t)tools.push(t)}i=j-1;
   const live=tools.some(t=>['running','awaiting_approval'].includes(t.status));
   nodes.push(<Disclosure key={s.id} className="tool-group" autoOpen={viewMode==='verbose'||live||!!approval&&tools.some(t=>t.id===approval.call.id)} scope={viewMode+(tools.some(t=>t.id===approval?.call.id)?':'+approval?.id+':'+reviewNonce:'')} summary={<><Terminal size={13}/><span>{tools.length} 个工具调用</span><small>{tools.some(t=>t.status==='awaiting_approval')?'等待批准':live?'执行中':m.segments?'查看实际记录':'历史工具记录 · 顺序未记录'}</small></>}>{tools.map(t=><ToolCard key={t.id} tool={t} viewMode={viewMode} approval={approval} onApprove={onApprove}/>)}</Disclosure>);
  }else if(s.kind==='reasoning'){
   nodes.push(<div key={s.id} data-segment-kind="reasoning"><Disclosure className={'thought-block '+(viewMode!=='normal'?'reasoning':'')} autoOpen={viewMode!=='normal'} scope={viewMode} summary={<><Clock3 size={13}/><span>模型返回的推理摘要</span></>}><div className="thought-text">{s.text}</div><small>仅展示 API 实际返回的公开内容，不是内部完整思维链。</small></Disclosure></div>);
  }else nodes.push(<MarkdownBlock key={s.id} text={s.text||''} streaming={active&&i===segments.length-1&&m.liveStatus==='正在生成回复'} notify={notify}/>);
 }
 return <div className="run-transcript">{nodes}</div>;
}
