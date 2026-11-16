// Model decisions SYNTHETIC LOOPBACK; screenshots, AX and input are REAL macOS operations.
const {_electron:electron}=require('playwright-core'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const executable=process.env.TOMBUDDY_TEST_EXECUTABLE||path.resolve('release/mac-arm64/Tombuddy.app/Contents/MacOS/Tombuddy');
async function main(){
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'tombuddy-computer-')),fixture=path.join(profile,'NativeFixture.app'),bundle='com.tombuddy.computer-fixture';
 await fs.mkdir(path.join(fixture,'Contents','MacOS'),{recursive:true});await fs.writeFile(path.join(fixture,'Contents','Info.plist'),`<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>${bundle}</string><key>CFBundleExecutable</key><string>fixture</string><key>CFBundleName</key><string>Tombuddy input fixture</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>`);
 execFileSync('/usr/bin/clang',['-fobjc-arc','tests/computer-fixture.m','-o',path.join(fixture,'Contents','MacOS','fixture'),'-framework','AppKit'],{timeout:30000});
 execFileSync('/usr/bin/open',['-n',fixture,'--args',profile]);
 const requests=[],errors=[];let round=0,field,button;
 const server=http.createServer(async(req,res)=>{try{
 let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);requests.push(body);const messages=body.messages;const users=JSON.stringify(messages.filter(m=>m.role==='user'));const tools=body.tools?.map(t=>t.function.name)||[];
 res.setHeader('Content-Type','text/event-stream');const finish=(delta,reason)=>{res.write('data: '+JSON.stringify({choices:[{delta,finish_reason:reason}]})+'\n\n');res.end('data: [DONE]\n\n')};const calls=items=>finish({tool_calls:items.map(([name,args],i)=>({index:i,id:'c'+requests.length+'-'+i,type:'function',function:{name,arguments:JSON.stringify(args)}}))},'tool_calls');const action=args=>calls([['computer_action',{...args,targetBundleId:bundle,intent:'Isolated native fixture test: '+args.action}]]);
 if(users.includes('PLAN malicious fixture')){assert.ok(!tools.includes('computer_action'));if(!messages.some(m=>m.role==='tool'))calls([['computer_action',{action:'type',targetBundleId:bundle,text:'MUST NOT TYPE',intent:'Must be blocked by Plan'}]]);else finish({content:'Plan correctly blocked input.'},'stop');return;}
 if(users.includes('CANCEL fixture')){action({action:'type',text:'MUST NOT TYPE'});return;}
 assert.ok(tools.includes('computer_action'));assert.ok(tools.includes('computer_screenshot'));
 round++;
 if(round===1)calls([['computer_action',{action:'launch',bundleId:bundle,intent:'Bring isolated native fixture to front'}],['computer_inspect',{}],['computer_screenshot',{}]]);
 else if(round===2){
 const axMessage=messages.find(m=>m.role==='tool'&&m.content.includes('AXTextField'));if(!axMessage)console.error('tools without field',messages.filter(m=>m.role==='tool').map(m=>m.content.slice(0,2500)));
 const ax=JSON.parse(axMessage.content);assert.equal(ax.bundleId,bundle);
 field=ax.elements.find(e=>e.role==='AXTextField');button=ax.elements.find(e=>e.AXTitle==='Record real click');assert.ok(field);assert.ok(button);
 assert.ok(messages.some(m=>Array.isArray(m.content)&&m.content.some(p=>p.type==='image_url'&&p.image_url.url.startsWith('data:image/jpeg;base64,'))));
 action({action:'click',x:field.x+field.width/2,y:field.y+field.height/2});
 }else if(round===3)action({action:'type',text:'真实输入 Music 🎵'});
 else if(round===4)action({action:'key',key:'a',modifiers:['command']});
 else if(round===5)action({action:'type',text:'Tom Music native verified',replaceAll:true});
 else if(round===6)action({action:'click',x:button.x+button.width/2,y:button.y+button.height/2});
 else if(round===7)calls([['computer_inspect',{}],['computer_screenshot',{}]]);
 else {assert.equal(round,8);assert.match(JSON.stringify(messages),/Tom Music native verified/);finish({content:'Native fixture operations verified. This is a synthetic decision stream, not a live vision-model test.'},'stop')}
 }catch(e){errors.push(e.stack);if(!res.headersSent)res.statusCode=500;res.end(JSON.stringify({error:{message:e.message}}))}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 let app,page;const launch=async()=>{app=await electron.launch({executablePath:executable,args:[`--user-data-dir=${profile}`],timeout:30000});page=await app.firstWindow();await page.getByLabel('电脑控制',{exact:true}).waitFor()};
 const enableUI=async()=>{await page.getByLabel('电脑控制',{exact:true}).click();await page.getByRole('button',{name:'开启电脑控制',exact:true}).click();await page.getByText('本次进程：已开启').waitFor();await page.getByLabel('关闭电脑控制面板').click()};
 const send=async text=>{await page.locator('textarea').fill(text);await page.getByTitle('发送消息',{exact:true}).click()};
 try{
 await launch();const status=await page.evaluate(()=>window.tombuddy.computerStatus());assert.equal(status.enabled,false);assert.equal(status.accessibility,true);assert.equal(status.screenRecording,'granted');
 await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1})});
 await page.getByLabel('电脑控制',{exact:true}).click();assert.equal(await page.getByRole('dialog').evaluate(e=>getComputedStyle(e).webkitAppRegion),'no-drag');await page.getByRole('button',{name:'开启电脑控制',exact:true}).click();await page.getByText('本次进程：已开启').waitFor();await page.getByLabel('关闭电脑控制面板').click();
 const provider=await page.evaluate(async baseUrl=>{const list=await window.tombuddy.saveProvider({name:'Explicit synthetic computer fixture',kind:'openai',baseUrl,model:'fixture-vision',computerImages:true,key:'fixture-not-a-real-key'});return list[0]},`http://127.0.0.1:${server.address().port}`);
 await app.close();app=null;await launch();assert.equal((await page.evaluate(()=>window.tombuddy.computerStatus())).enabled,false,'restart defaults off');await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1})});await enableUI();await page.getByLabel('对话',{exact:true}).click();
 await send('REAL native fixture');
 for(let i=0;i<6;i++){
  await page.getByRole('heading',{name:'允许这次真实电脑操作？',exact:true}).waitFor({timeout:15000});
  const before=JSON.parse(await fs.readFile(path.join(profile,'actual-input.json'),'utf8'));
  if(i===2)assert.equal(before.text,'','before type approval no input should occur');
  const id=await page.locator('.tool-card').filter({has:page.locator('.inline-approval')}).getAttribute('data-tool-id');
  await page.getByRole('button',{name:'批准本次操作',exact:true}).click();
  await page.locator(`[data-tool-id="${id}"] .inline-approval`).waitFor({state:'hidden'});
  if(i===2)await page.waitForTimeout(700);
 }
 await page.getByTitle('停止回复',{exact:true}).waitFor({state:'hidden',timeout:20000});assert.deepEqual(errors,[]);assert.equal(round,8);
 const actual=JSON.parse(await fs.readFile(path.join(profile,'actual-input.json'),'utf8'));if(actual.text!=='Tom Music native verified')console.error('final native text/tool results',requests.at(-1).messages.filter(m=>m.role==='tool').map(m=>m.content.includes('AXTextField')?JSON.parse(m.content).elements.filter(e=>e.role==='AXTextField'):m.content));assert.deepEqual(actual,{text:'Tom Music native verified',clicks:1});
 await page.evaluate(()=>window.__tombuddyFlush());const stateText=await fs.readFile(path.join(profile,'state.json'),'utf8');assert.ok(!stateText.includes('data:image/jpeg'));assert.ok(!stateText.includes('/9j/'));assert.match(stateText,/computer_screenshot/);
 await page.getByRole('button',{name:'新对话',exact:false}).click();await send('CANCEL fixture');await page.getByRole('heading',{name:'允许这次真实电脑操作？',exact:true}).waitFor();await page.getByRole('button',{name:'拒绝',exact:true}).click();await page.waitForTimeout(400); // malicious fixture repeats: stop immediately
 await page.getByRole('button',{name:'紧急停止',exact:true}).click();await page.getByTitle('停止回复',{exact:true}).waitFor({state:'hidden'});assert.equal((await page.evaluate(()=>window.tombuddy.computerStatus())).enabled,false);assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'actual-input.json'),'utf8')),actual);
 await enableUI();await page.getByRole('button',{name:'新对话',exact:false}).click();await send('CANCEL fixture global shortcut');await page.getByRole('heading',{name:'允许这次真实电脑操作？',exact:true}).waitFor();
 const nativeHelper=path.resolve(executable,'../../Resources/app.asar.unpacked/electron/bin/tombuddy-computer');
 execFileSync(nativeHelper,[],{input:JSON.stringify({action:'key',key:'escape',modifiers:['command','option','shift'],targetBundleId:bundle}),timeout:10000});
 await page.getByRole('button',{name:'紧急停止',exact:true}).waitFor({state:'hidden'});await page.getByTitle('停止回复',{exact:true}).waitFor({state:'hidden'});assert.equal((await page.evaluate(()=>window.tombuddy.computerStatus())).enabled,false);assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'actual-input.json'),'utf8')),actual);
 await enableUI();await page.getByRole('button',{name:'新对话',exact:false}).click();await page.getByRole('button',{name:'任务模式',exact:true}).click();await page.getByRole('menuitemradio',{name:/^Plan/}).click();await send('PLAN malicious fixture');await page.getByTitle('停止回复',{exact:true}).waitFor({state:'hidden',timeout:10000});assert.match(await page.locator('.messages').textContent(),/Plan correctly blocked/);assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'actual-input.json'),'utf8')),actual);
 await fs.writeFile('artifacts/computer-results.json',JSON.stringify({passed:true,executable,profile,status,rounds:round,requests:requests.length,actual,checks:['runtime opt-in and restart reset','real packaged helper permission status','real macOS AX tree and coordinates','real screen capture delivered as JPEG multimodal content','individual approvals even Full','focus restored after approval','actual Unicode typing, command-A, replacement and native button click','no screenshot bytes persisted','refusal and emergency revoke prevent input','actual global Command-Option-Shift-Escape stops a pending approval','Plan rejects unadvertised action'],notice:'Decisions synthetic loopback. OS input/screenshots genuine, no external requests. Not live model capability proof.'},null,2));console.log('REAL PACKAGED COMPUTER USE PASSED',actual);
 }catch(e){console.error({round,errors,page:page&&!page.isClosed()?await page.locator('body').innerText():''});throw e}finally{if(app)await app.close().catch(()=>{});server.closeAllConnections();await new Promise(r=>server.close(r));try{execFileSync('/usr/bin/pkill',['-f',path.join(fixture,'Contents','MacOS','fixture')])}catch{}}
}
const timeout=setTimeout(()=>{console.error('computer acceptance exceeded 150s');process.exit(1)},150000);main().then(()=>clearTimeout(timeout)).catch(e=>{clearTimeout(timeout);console.error(e);process.exitCode=1});
