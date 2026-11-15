const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
function moduleUnderTest(){assert.ok(fs.existsSync(require('node:path').join(__dirname,'../electron/skills.cjs')),'built-in skill runtime must exist');return require('../electron/skills.cjs')}
test('packaged skills have inspected provenance, license, original and adapted content',()=>{
 const s=moduleUnderTest();const list=s.listSkills();assert.equal(list.length,7);
 for(const item of list){const d=s.getSkill(item.id);assert.match(d.content,/^---/);assert.ok(d.content.length>500);assert.ok(d.licenseText.length>100);assert.equal(d.integrity,true);assert.ok(d.sourceUrl);if(item.author!=='Tombuddy')assert.ok(d.upstreamContent.length>500)}
 assert.throws(()=>s.getSkill('../../.env'));
});
test('manual, slash and deterministic auto selection are transparent and honor disabled skills',()=>{
 const s=moduleUnderTest();let result=s.selectSkills({text:'修复一个报错 bug',code:true,selected:[],preferences:{auto:true,disabled:[]}});assert.ok(result.skills.some(x=>x.id==='systematic-debugging'));assert.ok(result.skills.some(x=>x.id==='verification-before-completion'));
 result=s.selectSkills({text:'/skill frontend-design 设计一个页面',code:false,selected:[],preferences:{auto:false,disabled:[]}});assert.equal(result.skills[0].id,'frontend-design');assert.ok(!result.text.includes('/skill'));assert.match(result.prompt,/Frontend|前端/);
 result=s.selectSkills({text:'fix bug',code:true,selected:['systematic-debugging'],preferences:{auto:true,disabled:['systematic-debugging']}});assert.ok(!result.skills.some(x=>x.id==='systematic-debugging'));assert.ok(result.warnings.length);
 result=s.selectSkills({text:'hello',code:false,selected:[],preferences:{auto:false,disabled:[]}});assert.equal(result.skills.length,0);
 result=s.selectSkills({text:'/skill code-review inspect',selected:['frontend-design','brainstorming','writing-plans'],preferences:{auto:false,disabled:[]}});assert.equal(result.skills[0].id,'code-review');assert.equal(result.skills.length,3);assert.ok(result.warnings.length);
 assert.throws(()=>s.selectSkills({text:'/skill unknown hi',selected:[],preferences:{auto:false,disabled:[]}}),/不存在/);
});
test('public task plans are bounded and validate statuses, never automatic completion claims',()=>{
 const s=moduleUnderTest();assert.deepEqual(s.validatePlan({steps:[{id:'a',title:'读取入口',status:'in_progress'}]}).steps,[{id:'a',title:'读取入口',status:'in_progress'}]);
 assert.throws(()=>s.validatePlan({steps:[{id:'a',title:'x',status:'verified'}]}));assert.throws(()=>s.validatePlan({steps:Array.from({length:9},(_,i)=>({id:String(i),title:'x',status:'pending'}))}));assert.throws(()=>s.validatePlan({steps:[{id:'a',title:'x',status:'in_progress'},{id:'b',title:'y',status:'in_progress'}]}));
});
