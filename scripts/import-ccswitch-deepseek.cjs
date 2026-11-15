// Explicitly authorized local import and ONE live API test. Never prints or persists plaintext keys.
// Re-running requires a fresh authorization: the durable attempt marker deliberately prevents retries.
const {DatabaseSync}=require('node:sqlite');const {_electron}=require('playwright-core');const fs=require('node:fs/promises');const path=require('node:path');
const marker=path.resolve('artifacts/deepseek-live-attempt.json');let app,key='',record;let limit;
async function main(){
 if(!process.argv.includes('--authorize-one-live-request'))throw new Error('Explicit --authorize-one-live-request authorization is required');
 try{await fs.access(marker);throw new Error('A live attempt marker already exists. Refusing another request without fresh user authorization.')}catch(e){if(e.code!=='ENOENT')throw e}
 const db=new DatabaseSync(path.join(process.env.HOME,'.cc-switch/cc-switch.db'),{readOnly:true});let source;
 try{const row=db.prepare('select settings_config from providers where name = ? and app_type = ?').get('DeepSeek','claude-desktop');if(!row)throw new Error();source=JSON.parse(row.settings_config)}catch{throw new Error('Cannot safely read the named DeepSeek configuration')}finally{db.close()}
 const baseUrl=source.env?.ANTHROPIC_BASE_URL;key=source.env?.ANTHROPIC_AUTH_TOKEN;
 if(typeof key!=='string'||!key.trim())throw new Error('DeepSeek API credential is missing');
 const url=new URL(baseUrl);if(url.origin!=='https://api.deepseek.com'||url.pathname.replace(/\/$/,'')!=='/anthropic'||url.search||url.hash)throw new Error('Source endpoint does not match the authorized DeepSeek Anthropic endpoint');
 // Source contains no model. This explicit choice follows the reviewed official compatibility guide,
 // avoids the higher-priced claude-opus mapping, and is recorded rather than silently inferred.
 const provider={id:'import-ccswitch-deepseek-anthropic',name:'DeepSeek（CC Switch）',kind:'anthropic',baseUrl,model:source.env?.ANTHROPIC_MODEL || 'deepseek-flash',reasoningProtocol:'auto',key};
 const executable=path.join(process.env.HOME,'Applications/Tombuddy.app/Contents/MacOS/Tombuddy');
 app=await _electron.launch({executablePath:executable,timeout:30000});const page=await app.firstWindow();await page.waitForSelector('.brand');const version=await app.evaluate(({app})=>app.getVersion());if(version!=='0.2.0')throw new Error('Installed application is not the verified 0.2.0 build');
 await page.evaluate(config=>window.tombuddy.saveProvider(config),provider);await page.reload();await page.waitForSelector('.brand');
 const publicState=await page.evaluate(()=>window.tombuddy.load());if(JSON.stringify(publicState).includes(key))throw new Error('Key isolation check failed');
 const userData=await app.evaluate(({app})=>app.getPath('userData'));const disk=await fs.readFile(path.join(userData,'state.json'),'utf8');if(disk.includes(key))throw new Error('Plaintext key storage detected');
 const persisted=JSON.parse(disk).providers.find(p=>p.id===provider.id);if(!persisted?.encryptedKey)throw new Error('Encrypted key was not saved');
 await app.evaluate(()=>{const original=globalThis.fetch;globalThis.__tombuddyLiveCalls=0;globalThis.fetch=(url,options)=>{if(new URL(String(url)).hostname==='api.deepseek.com')globalThis.__tombuddyLiveCalls++;return original(url,options)}});
 await page.getByTitle('设置',{exact:true}).click();const button=page.getByTitle('测试连接 '+provider.name);await button.waitFor();
 record={startedAt:new Date().toISOString(),source:'CC Switch / DeepSeek / claude-desktop',endpoint:baseUrl,protocol:'DeepSeek Anthropic compatible',model:provider.model,modelChoice:'Source did not specify a model; selected deepseek-flash from official compatibility guide.',allowedRequests:1,requestedOutputLimit:256,tools:false,automaticRetries:false,credentialEncrypted:true,rendererKeyIsolated:true,status:'attempting'};
 await fs.writeFile(marker,JSON.stringify(record,null,2),{mode:0o600});
 page.once('dialog',dialog=>dialog.accept());await button.click();await page.locator('.provider-probe-result strong').waitFor({timeout:80000});
 const calls=await app.evaluate(()=>globalThis.__tombuddyLiveCalls);const title=await page.locator('.provider-probe-result strong').textContent();const failed=await page.locator('.provider-probe-result').evaluate(el=>el.classList.contains('failed'));
 record={...record,completedAt:new Date().toISOString(),requestsObserved:calls,status:failed?'failed':'passed',resultTitle:title};
 if(failed)record.error=await page.locator('.provider-probe-result p').first().textContent();
 else{record.reply=await page.locator('.provider-probe-result code').textContent();record.responseMetadata=await page.locator('.provider-probe-result p').first().textContent();const usage=(await page.locator('.provider-probe-result small').first().textContent()).replace(/^API 报告用量：/,'');try{record.usage=JSON.parse(usage)}catch{record.usage='No parseable usage returned'}}
 await page.locator('.provider-probe-result').screenshot({path:'artifacts/deepseek-live-result.png'});
 const safe=JSON.stringify(record,null,2).replaceAll(key,'[REDACTED]');await fs.writeFile(marker,safe,{mode:0o600});console.log(safe);
 if(calls!==1)throw new Error('Unexpected request count; no further requests will be attempted');
 if(failed)process.exitCode=1;
}
limit=setTimeout(()=>{console.error('Live validation reached 90 seconds. Stopping without retry.');if(app)app.close().finally(()=>process.exit(1));else process.exit(1)},90000);
main().catch(async e=>{const message=String(e.message).replaceAll(key || '\0','[REDACTED]');console.error(message);process.exitCode=1;if(record)await fs.writeFile(marker,JSON.stringify({...record,status:'failed',error:message},null,2),{mode:0o600}).catch(()=>{})}).finally(async()=>{clearTimeout(limit);if(app)await app.close().catch(()=>{});key=''});
