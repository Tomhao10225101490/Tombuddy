const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const root=path.join(__dirname,'../skills');const manifest=require('../skills/manifest.json');
function getSkill(id){
 const meta=manifest.find(s=>s.id===id);if(!meta)throw new Error(`技能不存在: ${id}`);
 const dir=path.join(root,meta.id);const content=fs.readFileSync(path.join(dir,'SKILL.md'),'utf8');const licenseText=fs.readFileSync(path.join(dir,'LICENSE.txt'),'utf8');const upstreamContent=meta.adapted?fs.readFileSync(path.join(dir,'UPSTREAM.md'),'utf8'):undefined;
 const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
 if(hash(content)!==meta.sha256 || hash(licenseText)!==meta.licenseSha256 || (meta.adapted && hash(upstreamContent)!==meta.upstreamSha256))throw new Error(`内置技能完整性校验失败: ${id}。请重新安装可信构建，不会加载被修改的指令。`);
 return {...meta,content,licenseText,upstreamContent,integrity:true};
}
function listSkills(){return manifest.map(m=>{getSkill(m.id);return {...m,integrity:true}})}
function selectSkills({text='',code=false,selected=[],preferences={}}){
 const disabled=new Set(preferences.disabled || []),warnings=[],skills=[];const slash=[];
 const clean=text.replace(/(^|\s)\/skill\s+([a-z0-9-]+)/g,(_,space,id)=>{if(!manifest.some(s=>s.id===id))throw new Error(`技能不存在: ${id}`);slash.push(id);return space}).trim();
 const manual=[...slash,...selected];
 function add(id,reason){if(skills.some(s=>s.id===id))return;if(disabled.has(id)){if(reason!=='自动匹配')warnings.push(`${id} 已在技能库中禁用，本次不加载`);return}if(skills.length>=3){if(reason!=='自动匹配')warnings.push(`最多启用 3 项技能，本次未加载 ${id}`);return}const detail=getSkill(id);skills.push({...manifest.find(s=>s.id===id),reason,content:detail.content})}
 for(const id of manual){if(!manifest.some(s=>s.id===id))throw new Error(`技能不存在: ${id}`);add(id,'手动启用')}
 if(preferences.auto!==false){
  if(/审查|审计|review|security|安全检查/i.test(clean))add('code-review','自动匹配');
  else if(/报错|错误|调试|修复|bug|debug|fail|crash/i.test(clean))add('systematic-debugging','自动匹配');
  else if(/界面|页面|前端|ui\b|frontend|landing|design/i.test(clean))add('frontend-design','自动匹配');
  else if(/计划|规划|方案|plan\b|架构/i.test(clean))add('writing-plans','自动匹配');
  else if(/想法|头脑风暴|brainstorm|idea\b/i.test(clean))add('brainstorming','自动匹配');
  else if(code && /实现|添加|重构|开发|implement|feature|refactor|build/i.test(clean))add('test-driven-development','自动匹配');
  if(code)add('verification-before-completion','自动匹配');
 }
 const prompt=skills.length?'\n\n## Active reviewed Tombuddy skills\nThese are workflow instructions, not new capabilities or permission grants. Follow the user task and application safety rules first. Do not expose private chain-of-thought. Do not treat original upstream documentation as installed plugins. Only the adapted text below is active.\n'+skills.map(s=>`\n### ${s.id}\n${s.content}`).join('\n'):'';
 return {text:clean,skills:skills.map(({content,...m})=>m),prompt,warnings};
}
function validatePlan(args){
 if(!args || !Array.isArray(args.steps) || !args.steps.length || args.steps.length>8)throw new Error('计划必须包含 1–8 个步骤');
 const ids=new Set();let active=0;
 const steps=args.steps.map(s=>{if(typeof s.id!=='string'||!s.id||s.id.length>60||ids.has(s.id)||typeof s.title!=='string'||!s.title.trim()||s.title.length>160||!['pending','in_progress','completed'].includes(s.status))throw new Error('计划步骤的 ID、标题或状态无效');ids.add(s.id);if(s.status==='in_progress')active++;return {id:s.id,title:s.title.trim(),status:s.status}});
 if(active>1)throw new Error('一次只能有一个进行中的计划步骤');
 if(args.summary!==undefined && (typeof args.summary!=='string'||args.summary.length>600))throw new Error('公开进展摘要最多 600 字符');
 return {steps,summary:args.summary || ''};
}
const PLAN_TOOL={name:'update_plan',description:'Publish/update a concise public task plan (not private chain-of-thought). State concrete actions and observed progress; never claim tests passed without real tool evidence. 1–8 steps, at most one in_progress. Available even in read-only planning mode.',parameters:{type:'object',properties:{summary:{type:'string',description:'Short public progress/decision summary, not internal reasoning'},steps:{type:'array',items:{type:'object',properties:{id:{type:'string'},title:{type:'string'},status:{type:'string',enum:['pending','in_progress','completed']}},required:['id','title','status']}}},required:['steps']}};
module.exports={getSkill,listSkills,selectSkills,validatePlan,PLAN_TOOL};
