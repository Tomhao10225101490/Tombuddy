const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');
const entries=[
 ['frontend-design','前端设计','打造有辨识度、可用且经过验证的界面','设计','Anthropic','Apache-2.0'],
 ['systematic-debugging','系统化调试','先定位根因，再以最小改动修复问题','工程','obra / Jesse Vincent','MIT'],
 ['test-driven-development','测试驱动开发','用可观察的红—绿—重构循环实现功能','工程','obra / Jesse Vincent','MIT'],
 ['writing-plans','任务规划','把需求拆成具体文件、步骤和验收检查','规划','obra / Jesse Vincent','MIT'],
 ['verification-before-completion','完成前验证','以真实执行证据支持完成声明','质量','obra / Jesse Vincent','MIT'],
 ['brainstorming','需求探索','澄清目标，比较方案，避免做错方向','规划','obra / Jesse Vincent','MIT'],
 ['code-review','代码与安全审查','检查正确性、安全边界、回归与测试盲区','质量','Tombuddy','MIT'],
];
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const manifest=entries.map(([id,title,description,category,author,license])=>{
 const anthropic=author==='Anthropic',own=author==='Tombuddy';
 const repository=own?'':anthropic?'https://github.com/anthropics/skills':'https://github.com/obra/superpowers';
 const revision=own?'0.2.0':anthropic?'1780c5e5a552fd4d1c9d6a7b0cab26b0c2bef064':'22f0b463e7a5e579904dd6211a520321035526f7';
 const dir=path.join(__dirname,'../skills',id);
 return {id,title,description,category,author,license,revision,sourceUrl:own?'tombuddy://built-in/code-review':`${repository}/blob/${revision}/skills/${id}/SKILL.md`,adapted:!own,permissions:['模型指令','不含可执行脚本','不增加工具权限'],sha256:hash(path.join(dir,'SKILL.md')),licenseSha256:hash(path.join(dir,'LICENSE.txt')),...(!own?{upstreamSha256:hash(path.join(dir,'UPSTREAM.md'))}:{})};
});
fs.writeFileSync(path.join(__dirname,'../skills/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated reviewed manifest for ${manifest.length} skills`);
