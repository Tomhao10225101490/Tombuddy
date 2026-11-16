const {test}=require('node:test'),assert=require('node:assert/strict');
const {observation,resolveTarget,TTL_MS}=require('../electron/observations.cjs');
const {createComputer}=require('../electron/computer.cjs');
function sample(){return observation({now:100,metadata:{bounds:{x:-1920,y:-100,width:1920,height:1080},capturedAt:100},accessibility:{bundleId:'com.fixture',elements:[{role:'AXButton',AXTitle:'Press',x:-1800,y:50,width:100,height:40},{role:'AXSecureTextField',AXValue:'secret',x:-1700,y:100,width:100,height:20}]},ocr:{blocks:[{text:'本地识别',confidence:.98,x:.5,y:.5,width:.1,height:.1}]}})}
test('local observations map OCR to global points incl negative display origins; target provenance and expiry',()=>{
 const value=sample();assert.equal(value.targets.length,2);assert.equal(value.targets[1].point.x,-864);assert.equal(value.targets[1].point.y,494);
 const args={action:'click',intent:'click actual observed label',observationId:value.observationId,targetId:'ocr:0'};
 const resolved=resolveTarget(args,value,200);assert.equal(resolved.targetBundleId,'com.fixture');assert.equal(resolved.x,-864);assert.equal(resolved.observedTarget.label,'本地识别');
 assert.throws(()=>resolveTarget({...args,observationId:'old'},value,200));assert.throws(()=>resolveTarget(args,value,100+TTL_MS+1));assert.throws(()=>resolveTarget({...args,targetBundleId:'com.other'},value,200));assert.throws(()=>resolveTarget({...args,targetId:'ax:1'},value,200));assert.throws(()=>resolveTarget({...args,action:'type'},value,200));
});
test('successful input and revocation invalidate observation targets; native execution gets resolved point',async()=>{
 const dispatched=[];const computer=createComputer({systemPreferences:{getMediaAccessStatus:()=> 'granted'},screen:{getPrimaryDisplay:()=>({id:1,bounds:{x:0,y:0,width:1000,height:700}}),getAllDisplays:()=>[{id:1,bounds:{x:0,y:0,width:1000,height:700}}]},desktopCapturer:{getSources:async()=>[{display_id:'1',thumbnail:{isEmpty:()=>false,getSize:()=>({width:1000,height:700}),toJPEG:()=>Buffer.from('fake unit JPEG')}}]},runHelper:async a=>{if(a.action==='ocr')return {blocks:[{text:'Press',confidence:1,x:.1,y:.1,width:.1,height:.1}]};if(['inspect','context'].includes(a.action))return {bundleId:'com.fixture',elements:[]};dispatched.push(a);return {ok:true}}});
 computer.setEnabled(true);const value=JSON.parse((await computer.execute('computer_observe',{})).text);const args={action:'click',intent:'click unit target',observationId:value.observationId,targetId:'ocr:0'};
 assert.equal(computer.prepareAction(args).targetBundleId,'com.fixture');await computer.execute('computer_action',args);assert.equal(dispatched[0].x,150);await assert.rejects(computer.execute('computer_action',args),/观察已失效/);
 const next=JSON.parse((await computer.execute('computer_observe',{})).text);computer.setEnabled(false);assert.throws(()=>computer.prepareAction({...args,observationId:next.observationId}),/观察已失效/);
});
