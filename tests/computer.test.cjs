const {test}=require('node:test'),assert=require('node:assert/strict');
const {createComputer,validateAction,isComputer,TOOL_DEFS}=require('../electron/computer.cjs');
const {buildRequest}=require('../electron/providers.cjs');
const targetBundleId='com.tombuddy.fixture';
test('computer actions require reviewable intent, explicit focus target and bounded input',()=>{
 assert.equal(isComputer('computer_action'),true);assert.equal(isComputer('run_command'),false);assert.equal(TOOL_DEFS.length,4);
 assert.throws(()=>validateAction({action:'type',text:'x'}));assert.throws(()=>validateAction({action:'type',intent:'type',text:'x'}));
 assert.throws(()=>validateAction({action:'click',intent:'click',targetBundleId,x:NaN,y:0}));
 assert.throws(()=>validateAction({action:'type',intent:'type',targetBundleId,text:'x'.repeat(4001)}));
 assert.throws(()=>validateAction({action:'key',intent:'key',targetBundleId,key:'a',modifiers:['invalid']}));
 assert.throws(()=>validateAction({action:'scroll',intent:'scroll',targetBundleId,x:0,y:0,deltaY:Infinity}));
 assert.equal(validateAction({action:'type',intent:'Unicode test',targetBundleId,text:'你好 🎵'}).text,'你好 🎵');
});
function mock(){let permission='granted';return {runHelper:async a=>a.action==='ocr'?{ok:true,blocks:[{text:'unit text',confidence:1,x:0.1,y:0.2,width:0.3,height:0.1}]}:{ok:true,application:'Fixture',bundleId:targetBundleId,elements:[]},setPermission:v=>permission=v,desktopCapturer:{getSources:async()=>[{display_id:'42',thumbnail:{isEmpty:()=>false,getSize:()=>({width:1600,height:900}),toJPEG:()=>Buffer.from('explicitly fake unit test image')}}]},screen:{getAllDisplays:()=>[{id:42,bounds:{x:-1920,y:0,width:1920,height:1080},scaleFactor:2}],getPrimaryDisplay:()=>({id:42,bounds:{x:-1920,y:0,width:1920,height:1080}})},systemPreferences:{getMediaAccessStatus:()=>permission}}}
test('capture opt-in, permission, display identity and coordinate metadata; no substitute image',async()=>{
 const env=mock(),computer=createComputer(env);
 await assert.rejects(computer.execute('computer_screenshot',{}),/未开启/);computer.setEnabled(true);
 env.setPermission('denied');await assert.rejects(computer.execute('computer_screenshot',{}),/屏幕录制/);env.setPermission('granted');
 await assert.rejects(computer.execute('computer_screenshot',{displayId:'missing'}),/显示器/);
 const capture=await computer.execute('computer_screenshot',{});assert.equal(capture.image.mimeType,'image/jpeg');assert.equal(JSON.parse(capture.text).bounds.x,-1920);
 computer.setEnabled(false);await assert.rejects(computer.execute('computer_inspect',{}),/未开启/);
 computer.setEnabled(true);const controller=new AbortController();controller.abort();await assert.rejects(computer.execute('computer_screenshot',{},controller.signal),{name:'AbortError'});
 env.desktopCapturer.getSources=async()=>[];await assert.rejects(computer.execute('computer_screenshot',{}),/不使用替代图片/);
});
test('actual multimodal request shape for all three protocols, separate from persisted text wire',()=>{
 for(const kind of ['openai','anthropic','gemini']){
 const body=buildRequest({config:{kind,baseUrl:'http://localhost:1234',model:'vision-fixture'},key:'fixture',messages:[{role:'user',content:'Current screen',image:{mimeType:'image/jpeg',data:'aGVsbG8='}}],tools:[]}).body;
 if(kind==='openai')assert.equal(body.messages[1].content[1].image_url.url,'data:image/jpeg;base64,aGVsbG8=');
 if(kind==='anthropic')assert.equal(body.messages[0].content[1].source.data,'aGVsbG8=');
 if(kind==='gemini')assert.equal(body.contents[0].parts[1].inlineData.data,'aGVsbG8=');
 }
});
