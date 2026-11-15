import type {Message,AgentEvent,RunSegment} from './types';
export function streamPatch(m:Message,e:AgentEvent):Message{
 if(e.type==='tool-output')return {...m,tools:m.tools?.map(t=>t.id===e.toolId?{...t,output:e.output}:t)};
 if(e.type==='tool'&&e.call){const tools=[...(m.tools||[])],index=tools.findIndex(t=>t.id===e.call!.id);const tool={...(index<0?{}:tools[index]),...e.call,status:e.status!,...(e.result!==undefined?{result:e.result}:{})};if(index<0)tools.push(tool);else tools[index]=tool;const segments=[...(m.segments||[])];if(!segments.some(s=>s.toolId===tool.id))segments.push({id:m.id+'-s'+segments.length,kind:'tool',toolId:tool.id});return {...m,tools,segments};}
 if(e.type!=='text'&&e.type!=='reasoning')return m;
 const text=e.text||'',key=e.type==='text'?'content':'reasoning',segments=[...(m.segments||[])],last=segments.at(-1);
 if(last?.kind===e.type)segments[segments.length-1]={...last,text:(last.text||'')+text};else if(text.trim())segments.push({id:m.id+'-s'+segments.length,kind:e.type,text});
 return {...m,[key]:(m[key]||'')+text,segments,liveStatus:e.type==='text'?'正在生成回复':'正在接收模型推理摘要'};
}
export function transcript(m:Message):RunSegment[]{
 if(m.segments?.length)return m.segments;
 // Preserve old persisted messages without inventing their unknown chronology.
 return [...(m.reasoning?[{id:m.id+'-legacy-reasoning',kind:'reasoning' as const,text:m.reasoning}]:[]),...(m.tools||[]).map(t=>({id:t.id,kind:'tool' as const,toolId:t.id})),...(m.content?[{id:m.id+'-legacy-text',kind:'text' as const,text:m.content}]:[])];
}
export function runtimeStatus(m:Message,active:boolean){
 if(!active)return m.interrupted?'上次回复中断':m.paused?'已暂停':m.error?'请求未完成':m.stopped?'已停止':'回复结束';
 const waiting=m.tools?.find(t=>t.status==='awaiting_approval');if(waiting)return '等待你的批准';
 const running=m.tools?.find(t=>t.status==='running');if(running)return running.name==='run_command'?'正在运行命令':running.name==='write_file'?'正在编辑文件':'正在使用工具';
 return m.liveStatus?.startsWith('请求模型')?'等待模型响应':m.liveStatus||'等待模型响应';
}
export type DiffLine={kind:'context'|'remove'|'add';text:string;oldLine?:number;newLine?:number};
export function diffLines(before:string,after:string,limit=400){
 const a=before?before.split('\n'):[],b=after?after.split('\n'):[];let start=0,end=0;
 while(start<a.length&&start<b.length&&a[start]===b[start])start++;
 while(end<a.length-start&&end<b.length-start&&a[a.length-1-end]===b[b.length-1-end])end++;
 if(start===a.length&&start===b.length)return {lines:[] as DiffLine[],truncated:false,added:0,removed:0};
 const lines:DiffLine[]=[],push=(line:DiffLine)=>{if(lines.length<limit)lines.push(line)};
 for(let i=Math.max(0,start-3);i<start;i++)push({kind:'context',text:a[i],oldLine:i+1,newLine:i+1});
 for(let i=start;i<a.length-end;i++)push({kind:'remove',text:a[i],oldLine:i+1});
 for(let i=start;i<b.length-end;i++)push({kind:'add',text:b[i],newLine:i+1});
 for(let i=0;i<Math.min(3,end);i++)push({kind:'context',text:a[a.length-end+i],oldLine:a.length-end+i+1,newLine:b.length-end+i+1});
 return {lines,truncated:Math.min(3,start)+(a.length-start-end)+(b.length-start-end)+Math.min(3,end)>limit,added:b.length-start-end,removed:a.length-start-end};
}
