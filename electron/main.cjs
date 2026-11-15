const {app,BrowserWindow,ipcMain,dialog,safeStorage,Menu,shell}=require('electron');
const fs=require('node:fs/promises');const path=require('node:path');
const {streamTurn,TOOL_DEFS,SYSTEM,reasoningOptions,probeProvider}=require('./providers.cjs');const {executeTool,previewWrite}=require('./workspace.cjs');const {loadState}=require('./storage.cjs');
const {listSkills,getSkill,selectSkills,validatePlan,PLAN_TOOL}=require('./skills.cjs');
const {PROTOCOLS}=require('./reasoning.cjs');
const {reasoningCapabilities,EFFORTS}=require('./effort.cjs');
const {taskPermissions,allowsTool}=require('./permissions.cjs');
const projectPanels=require('./project-panels.cjs');
const {loadAttachments,attachmentText}=require('./attachments.cjs');
const {checkpointWire}=require('./checkpoint.cjs');
const {toFailure}=require('./request-errors.cjs');const {createDiagnostics}=require('./diagnostics.cjs');
let win,store;let saving=Promise.resolve();let diagnose=()=>Promise.resolve(),quitReady=false,shutdownFlush;
if(!app.requestSingleInstanceLock()){app.quit();return;}
app.on('second-instance',()=>{if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.show();win.focus();}});const runs=new Map(),approvals=new Map();const selectedRoots=new Set();
const defaults={providers:[],sessions:[],projects:[],theme:'light',skillPreferences:{auto:true,disabled:[]},selectedProviderId:'',modelPreferences:{},uiPreferences:{planPanelOpen:true,viewMode:'normal'}};
const publicState=()=>({...store,providers:store.providers.map(({encryptedKey,...p})=>{let capabilities;try{reasoningOptions(p);capabilities=reasoningCapabilities(p)}catch{capabilities={protocol:'none',mode:'none',levels:['auto'],defaultEffort:'auto',supportsThinking:false,canDisable:false,defaultThinking:true,legacyMap:{standard:'auto',deep:'auto',max:'auto'},note:'推理协议配置不兼容，请编辑模型服务；密钥仍保留。'}}return {...p,hasKey:!!encryptedKey,capabilities};})});
async function persist(){const data=JSON.stringify(store);saving=saving.catch(()=>{}).then(async()=>{const target=path.join(app.getPath('userData'),'state.json');await fs.writeFile(target+'.tmp',data,{mode:0o600});await fs.rename(target+'.tmp',target);});return saving;}
async function flushBeforeClose(){
 if(shutdownFlush)return shutdownFlush;
 shutdownFlush=(async()=>{
  let timer;try{await Promise.race([(async()=>{if(win&&!win.isDestroyed())await win.webContents.executeJavaScript('window.__tombuddyFlush?.()');await saving;})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('flush timeout')),2500)})]);}catch{await diagnose({event:'shutdown_flush_incomplete'});}finally{clearTimeout(timer);}
 })();return shutdownFlush;
}
function send(run,event){if(!win?.isDestroyed())win.webContents.send('agent:event',{runId:run,at:Date.now(),...event});}
function approve(runId,call,signal){return new Promise(resolve=>{
  let finished=false;const id=crypto.randomUUID();const finish=value=>{if(finished)return;finished=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);approvals.delete(id);send(runId,{type:'approval-resolved',id});resolve(value);};
  const cancel=()=>finish(false);const timer=setTimeout(()=>finish(false),120000);approvals.set(id,{runId,finish});signal.addEventListener('abort',cancel,{once:true});
  send(runId,{type:'approval',id,call});
});}
app.whenReady().then(async()=>{
  if(process.platform==='darwin')app.dock?.setIcon(path.join(__dirname,'../dist/icon.png'));
  try{
    const loaded=await loadState(path.join(app.getPath('userData'),'state.json'),defaults);store=loaded.state;
    if(loaded.backup)dialog.showErrorBox('已保留损坏的数据文件',`设置文件无法解析，已备份至：\n${loaded.backup}\n\n本次以空工作空间启动。原始数据未被删除，可用于恢复。`);
  }catch(e){dialog.showErrorBox('无法读取 Tombuddy 数据',e.message);app.quit();return;}
  diagnose=createDiagnostics(path.join(app.getPath('userData'),'diagnostics.jsonl'));diagnose({event:'startup',version:app.getVersion()});
  if(!store.providers.some(p=>p.id===store.selectedProviderId))store.selectedProviderId=store.providers[0]?.id || '';
  for(const p of store.projects)selectedRoots.add(p.path);
  ipcMain.handle('window:visible',()=>!!win&&!win.isDestroyed()&&win.isVisible()&&!win.isMinimized());
  ipcMain.handle('state:load',()=>publicState());
  ipcMain.handle('state:save',async(_,data)=>{
    if(Array.isArray(data.sessions))store.sessions=data.sessions;store.theme=data.theme || store.theme;
    if(data.uiPreferences){const p=data.uiPreferences;store.uiPreferences={planPanelOpen:p.planPanelOpen!==false,viewMode:['normal','thinking','verbose'].includes(p.viewMode)?p.viewMode:'normal',projectPath:store.projects.some(x=>x.path===p.projectPath)?p.projectPath:store.uiPreferences?.projectPath};}
    if(data.modelPreferences&&typeof data.modelPreferences==='object'){
      const preferences={};for(const [id,p] of Object.entries(data.modelPreferences).slice(0,100)){const config=store.providers.find(x=>x.id===id);if(config&&p&&p.model===config.model&&p.baseUrl===config.baseUrl&&p.kind===config.kind&&EFFORTS.includes(p.effort)&&p.effort!=='max'&&typeof p.thinkingEnabled==='boolean')preferences[id]={model:p.model,baseUrl:p.baseUrl,kind:p.kind,effort:p.effort,thinkingEnabled:p.thinkingEnabled};}store.modelPreferences=preferences;
    }
    if(data.skillPreferences){try{const ids=new Set(listSkills().map(s=>s.id));store.skillPreferences={auto:data.skillPreferences.auto!==false,disabled:[...new Set((data.skillPreferences.disabled || []).filter(id=>ids.has(id)))]};}catch{diagnose({event:'skills_catalog_unavailable'});}}
    await persist();return true;
  });
  ipcMain.handle('provider:select',async(_,id)=>{if(!store.providers.some(p=>p.id===id))throw new Error('模型服务不存在，未修改已保存配置');store.selectedProviderId=id;await persist();return id;});
  ipcMain.handle('provider:save',async(_,p)=>{
    const existing=store.providers.find(x=>x.id===p.id);const id=p.id || crypto.randomUUID();
    if(!['openai','anthropic','gemini'].includes(p.kind))throw new Error('不支持的 API 协议');
    if(p.reasoningProtocol && !PROTOCOLS.includes(p.reasoningProtocol))throw new Error('不支持的推理协议');
    if(p.key && !safeStorage.isEncryptionAvailable())throw new Error('系统钥匙串不可用，拒绝明文保存 API Key');
    const contextKey=!existing || p.key || existing.baseUrl!==p.baseUrl || existing.model!==p.model || existing.kind!==p.kind?crypto.randomUUID():existing.contextKey || crypto.randomUUID();
    const entry={id,contextKey,name:String(p.name).slice(0,100),kind:p.kind,baseUrl:p.baseUrl,model:p.model,reasoningProtocol:p.reasoningProtocol || 'auto',encryptedKey:p.key?safeStorage.encryptString(p.key).toString('base64'):existing?.encryptedKey};
    store.providers=store.providers.filter(x=>x.id!==id).concat(entry);store.selectedProviderId=id;await persist();return publicState().providers;
  });
  ipcMain.handle('provider:test',async(_,id)=>{
    if(runs.size)throw new Error('请先停止当前回复或连接测试');
    const config=store.providers.find(p=>p.id===id);if(!config)throw new Error('模型服务不存在');
    const key=config.encryptedKey?safeStorage.decryptString(Buffer.from(config.encryptedKey,'base64')):'';
    const controller=new AbortController(),runId=`probe:${id}`;runs.set(runId,controller);
    try{return await probeProvider({config,key,signal:controller.signal})}catch(e){throw new Error(controller.signal.aborted?'测试已停止；已经处理的请求仍可能计费':e.message.replaceAll(key || '\0','[REDACTED]'))}finally{runs.delete(runId)}
  });
  ipcMain.handle('provider:delete',async(_,id)=>{store.providers=store.providers.filter(x=>x.id!==id);if(store.selectedProviderId===id)store.selectedProviderId=store.providers[0]?.id || '';await persist();return publicState().providers;});
  ipcMain.handle('project:choose',async()=>{
    const {canceled,filePaths}=await dialog.showOpenDialog(win,{properties:['openDirectory','createDirectory'],title:'选择 Tombuddy 工作目录'});
    if(canceled)return null;const p={id:crypto.randomUUID(),name:path.basename(filePaths[0]),path:filePaths[0]};selectedRoots.add(p.path);
    const previous=store.projects.find(x=>x.path===p.path);store.projects=store.projects.filter(x=>x.path!==p.path).concat(previous || p);await persist();return store.projects;
  });
  ipcMain.handle('project:files',async(_,root)=>{if(!selectedRoots.has(root))throw new Error('目录未授权');return executeTool(root,'list_files',{path:'.'});});
  function panelRoot(root){if(!selectedRoots.has(root))throw new Error('目录未授权');return root;}
  ipcMain.handle('project:entries',(_,root,relative)=>projectPanels.entries(panelRoot(root),relative));
  ipcMain.handle('project:read',(_,root,relative)=>executeTool(panelRoot(root),'read_file',{path:relative}));
  ipcMain.handle('project:changes',(_,root)=>projectPanels.changes(panelRoot(root)));
  ipcMain.handle('terminal:run',async(_,request)=>{
    const root=panelRoot(request.root);if(runs.size)throw new Error('请先停止当前回复或终端命令');
    if(typeof request.id!=='string'||request.id.length>100)throw new Error('无效终端请求');
    const id='terminal:'+request.id,controller=new AbortController();runs.set(id,controller);
    try{return await executeTool(root,'run_command',{command:request.command},controller.signal)}finally{runs.delete(id)}
  });
  ipcMain.handle('export',async(_,text)=>{const r=await dialog.showSaveDialog(win,{defaultPath:'Tombuddy-chat.md',filters:[{name:'Markdown',extensions:['md']}]});if(!r.canceled)await fs.writeFile(r.filePath,text,'utf8');return !r.canceled;});
  ipcMain.handle('attachments:choose',async()=>{const result=await dialog.showOpenDialog(win,{title:'添加文本或代码文件',properties:['openFile','multiSelections']});return result.canceled?[]:loadAttachments(result.filePaths);});
  ipcMain.handle('skills:list',()=>listSkills());
  ipcMain.handle('skills:detail',(_,id)=>getSkill(id));
  ipcMain.handle('agent:approve',(_,id,value)=>approvals.get(id)?.finish(value===true));
  ipcMain.handle('agent:stop',(_,id)=>{runs.get(id)?.abort();});
  ipcMain.handle('agent:start',async(_,request)=>{
    const {runId,providerId,messages,projectPath}=request;
    const level=request.level || 'standard';const permissions=taskPermissions(request.taskMode),taskMode=permissions.mode;
    if(runs.size)throw new Error('请先停止当前回复');
    const config=store.providers.find(p=>p.id===providerId);if(!config)throw new Error('请先配置 API 服务');
    if(projectPath && !selectedRoots.has(projectPath))throw new Error('项目目录未授权');
    const reasoningSettings=request.reasoningSettings || {};
    if(reasoningSettings.thinkingEnabled!==undefined&&typeof reasoningSettings.thinkingEnabled!=='boolean')throw new Error('无效的思考开关');
    const reasoning=reasoningOptions(config,level,reasoningSettings);
    const lastUser=messages.filter(m=>m.role==='user').at(-1);
    const selection=selectSkills({text:lastUser?.content || '',code:!!projectPath,selected:request.skills || [],preferences:store.skillPreferences});
    if(!selection.text)throw new Error('请在 /skill 技能名后输入具体任务');
    const wireOrigin=`${config.id}:${config.contextKey || 'legacy'}`;
    const system=SYSTEM+selection.prompt+`\n\nTask mode: ${taskMode==='plan'?'READ-ONLY PLANNING. Do not modify files or run commands. Only inspect and plan. Publish a concrete update_plan, do not mark proposed implementation as completed. Present the plan for explicit user review; do not autonomously switch to execution.':`${permissions.requiresApproval?'MANUAL EXECUTION: write_file and run_command require individual user approvals.':'FULL ACCESS: the user has authorized file writes and shell commands without per-operation approval. Execute needed available tools directly; do not ask for permission for each operation. Commands run with current-user permissions, not root and not sandboxed.'} Inspect relevant files, publish a concise task plan for substantive work, implement focused changes, run actual verification, update observed progress, and report evidence or blockers. There is no fixed tool-round ceiling; continue the task until complete, stopped, or genuinely blocked.`} Reasoning level: ${level}. Give concise public plans, decisions and verification evidence, not private chain-of-thought.`;
    const toolDefs=[PLAN_TOOL,...(projectPath?TOOL_DEFS.filter(t=>allowsTool(permissions,t.name)):[])];
    const key=config.encryptedKey?safeStorage.decryptString(Buffer.from(config.encryptedKey,'base64')):'';
    const controller=new AbortController();runs.set(runId,controller);
    (async()=>{
      const wire=[];let pendingCalls=[],activeCallId;
      const checkpoint=()=>send(runId,{type:'context',wire:checkpointWire(wire,pendingCalls,activeCallId),wireOrigin});
      try {
        send(runId,{type:'run-start',level,taskMode,skills:selection.skills,reasoningProtocol:reasoning.protocol,note:reasoning.note,effort:reasoning.effort,thinkingEnabled:reasoning.effort?.thinkingEnabled});
        for(const warning of selection.warnings)send(runId,{type:'warning',message:warning});
        const history=[];const totals={};let hasUsage=false,currentRound=0;
        for(const m of messages){
          if(m.role==='user' && m.content)history.push({role:'user',content:(m===lastUser?selection.text:m.content)+attachmentText(m.attachments)});
          if(m.role==='assistant'){
            if(m.wireOrigin===wireOrigin && Array.isArray(m.wire) && m.wire.length)history.push(...m.wire.filter(item=>item.role!=='assistant' || item.content || item.calls?.length));
            else if(m.content)history.push({role:'assistant',content:m.content});
          }
        }
        for(let round=0;;round++){
          if(controller.signal.aborted)throw new DOMException('已停止','AbortError');
          currentRound=round+1;send(runId,{type:'phase',phase:'request',round:currentRound});
          const turn=await streamTurn({config,key,messages:history,tools:toolDefs,level,reasoningSettings,system,signal:controller.signal,onEvent:e=>{send(runId,e);if(e.type==='response')diagnose({event:'api_response',providerId,round:currentRound,status:e.status,requestId:e.requestId});}});
          history.push(turn.wire);wire.push(turn.wire);
          const usage=turn.usage;
          if(Object.keys(usage).length){const counts={inputTokens:usage.input_tokens ?? usage.prompt_tokens ?? usage.promptTokenCount,outputTokens:usage.output_tokens ?? usage.completion_tokens ?? usage.candidatesTokenCount,reasoningTokens:usage.thoughtsTokenCount ?? usage.completion_tokens_details?.reasoning_tokens ?? usage.output_tokens_details?.thinking_tokens};for(const [field,value] of Object.entries(counts))if(Number.isFinite(value) && value>=0)totals[field]=(totals[field] || 0)+value;hasUsage=Object.keys(totals).length>0;if(hasUsage)send(runId,{type:'usage',usage:{...totals}});}
          if(turn.outcome!=='complete'){
            const kind=turn.outcome==='output_limit'?'output_limit':'no_final_answer';
            send(runId,{type:'context',wire,wireOrigin});send(runId,{type:'paused',pause:{kind,message:kind==='output_limit'?'已达到单轮输出上限，部分输出与进度已保存。不是 API 配置断开，可用均衡模式继续。':'服务商返回了推理或暂停信号，但没有完整正文。配置保留，可手动继续。'}});diagnose({event:'task_paused',providerId,round:currentRound,pauseKind:kind});return;
          }
          if(!turn.calls.length){send(runId,{type:'context',wire,wireOrigin});send(runId,{type:'done',...(hasUsage?{usage:totals}:{})});return;}
          pendingCalls=[...turn.calls];checkpoint();
          for(const call of turn.calls){
            if(controller.signal.aborted)throw new DOMException('已停止','AbortError');
            const needsApproval=permissions.requiresApproval&&['write_file','run_command'].includes(call.name);let displayCall={...call},result,outcome;
            send(runId,{type:'tool',call:displayCall,status:needsApproval?'awaiting_approval':'running'});
            try {
              if(!toolDefs.some(t=>t.name===call.name))throw new Error(taskMode==='plan'?'只读规划模式禁止写文件或执行命令':'此工具不可用');
              if(call.name!=='update_plan' && !projectPath)throw new Error('没有选择项目');
              if(call.name==='write_file'){displayCall={...displayCall,edit:await previewWrite(projectPath,call.args)};send(runId,{type:'tool',call:displayCall,status:needsApproval?'awaiting_approval':'running'});}
              if(needsApproval){
                const allowed=await approve(runId,displayCall,controller.signal);if(!allowed)throw new Error('用户拒绝、取消或审批超时（2 分钟）');
              }
              if(controller.signal.aborted)throw new DOMException('已停止','AbortError');
              if(needsApproval&&call.name==='write_file')displayCall={...displayCall,edit:await previewWrite(projectPath,call.args)};
              activeCallId=call.id;displayCall={...displayCall,startedAt:Date.now()};send(runId,{type:'tool',call:displayCall,status:'running'});checkpoint();
              if(call.name==='update_plan'){const plan=validatePlan(call.args);send(runId,{type:'plan',plan});result='公开任务计划已更新。计划状态由模型报告，不代表测试已通过。';}
              else result=await executeTool(projectPath,call.name,call.args,controller.signal,output=>send(runId,{type:'tool-output',toolId:call.id,output}),value=>{outcome=value});
              send(runId,{type:'tool',call:{...displayCall,...outcome,endedAt:Date.now()},status:outcome&&(outcome.exitCode!==0||outcome.timedOut||outcome.truncated)?'error':'done',result});
            }catch(e){if(controller.signal.aborted)throw e;result=`错误: ${e.message}`;send(runId,{type:'tool',call:{...displayCall,endedAt:Date.now()},status:'error',result});}
            const toolResult={role:'tool',callId:call.id,name:call.name,content:result};history.push(toolResult);wire.push(toolResult);pendingCalls=pendingCalls.filter(c=>c.id!==call.id);activeCallId=undefined;checkpoint();
          }
          send(runId,{type:'context',wire,wireOrigin});
          if(turn.text)send(runId,{type:'text',text:'\n\n'});
          if(turn.reasoning)send(runId,{type:'reasoning',text:'\n\n'});
        }
      }catch(e){const stopped=e.name==='AbortError' || controller.signal.aborted;if(pendingCalls.length){checkpoint();for(const call of pendingCalls)send(runId,{type:'tool',call:{...call,endedAt:Date.now()},status:call.id===activeCallId?'stopped':'canceled',result:call.id===activeCallId?'操作已停止，完成情况未确认，请先核对实际状态。':'已取消，未执行'});}const failure=toFailure(e,key);send(runId,{type:stopped?'stopped':'error',message:failure.message,failure});if(!stopped)diagnose({event:'request_failed',providerId,code:failure.code,category:failure.category,status:failure.status,requestId:failure.requestId});}
      finally{runs.delete(runId);for(const a of approvals.values())if(a.runId===runId)a.finish(false);}
    })();return true;
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Tombuddy',submenu:[{role:'about'},{type:'separator'},{role:'hide'},{role:'quit'}]},{label:'编辑',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]},{label:'视图',submenu:[{role:'reload'},{role:'toggleDevTools'},{role:'resetZoom'},{role:'zoomIn'},{role:'zoomOut'},{role:'togglefullscreen'}]}]));
  function createWindow(){
    shutdownFlush=undefined;let closing=false;
    win=new BrowserWindow({width:1398,height:820,minWidth:900,minHeight:640,title:'Tombuddy',icon:process.platform==='win32'?path.join(__dirname,'../dist/icon.png'):undefined,titleBarStyle:'hiddenInset',trafficLightPosition:{x:12,y:16},backgroundColor:store.theme==='dark'?'#191919':'#faf9f5',webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
    for(const event of ['show','hide','minimize','restore'])win.on(event,()=>{if(!win.isDestroyed())win.webContents.send('window:visibility',win.isVisible()&&!win.isMinimized())});
    win.webContents.setWindowOpenHandler(({url})=>{if(/^https?:\/\//.test(url))shell.openExternal(url);return {action:'deny'};});
    win.webContents.on('will-navigate',(e,url)=>{if(url!==win.webContents.getURL())e.preventDefault();});
    if(process.env.TOMBUDDY_DEV_URL && !app.isPackaged)win.loadURL(process.env.TOMBUDDY_DEV_URL);else win.loadFile(path.join(__dirname,'../dist/index.html'));
    win.on('close',event=>{if(closing||quitReady)return;event.preventDefault();for(const c of runs.values())c.abort();flushBeforeClose().finally(()=>{closing=true;if(!win.isDestroyed())win.close();});});
    win.on('closed',()=>{for(const c of runs.values())c.abort();});
  }
  createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
app.on('before-quit',event=>{if(quitReady)return;event.preventDefault();for(const c of runs.values())c.abort();flushBeforeClose().finally(()=>{quitReady=true;app.quit();});});
