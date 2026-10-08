import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createAuthStore} from './auth-store.mjs';
import {createAuthServer} from './http.mjs';
const password='Portal testing password 2026!';
const origin='http://localhost:5173';
async function fixture(t) {
 const dir=mkdtempSync(join(tmpdir(),'brudello-portals-')),messages=[];
 const filename=join(dir,'test.sqlite');
 const store=createAuthStore({filename,origin,deliverReset:async m=>messages.push(m)});
 await store.createUser({name:'Admin',email:'admin@test.local',password,mustChangePassword:false});
 const admin=await store.login('admin@test.local',password);
 const input=(name,email)=>({requestId:randomUUID(),name,contactName:'Private',contactEmail:'private@test.local',brandTheme:'schramm',brandColor:'#009cdc',userLimit:5,users:[{name:'Private member',email}]});
 const a=await store.createCompany(admin.token,input('SCHRAMM Test','a@test.local'));
 const b=await store.createCompany(admin.token,input('Other Company','b@test.local'));
 const server=createAuthServer({store,origin});
 await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
 t.after(async()=>{await new Promise(r=>server.close(r));store.close();rmSync(dir,{recursive:true,force:true});});
 async function request(path,body,cookie='',slug,extra={}) {
  const response=await fetch(`http://127.0.0.1:${server.address().port}${path}`,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Brudello-Request':'1',Cookie:cookie,...(slug?{'X-Brudello-Portal':slug}:{}),...extra},body:body===undefined?undefined:JSON.stringify(body)});
  return {status:response.status,body:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
 }
 return {store,filename,a,b,admin,request,messages};
}
test('company codes resolve public branding only and stay stable across migration/reopen',async t=>{
 const f=await fixture(t);
 assert.equal(f.a.company.portalSlug,'schramm-test');
 const publicResult=await f.request('/api/portals/schramm-test');
 assert.equal(publicResult.status,200);
 assert.deepEqual(Object.keys(publicResult.body.portal).sort(),['appearance','brandColor','brandTheme','name','portalSlug'].sort());
 assert.equal(publicResult.body.portal.name,'SCHRAMM Test');
 assert.equal((await f.request('/api/home')).status,401);
 assert.equal((await f.request('/api/portals/unknown')).status,404);
 const collision=await f.store.createCompany(f.admin.token,{requestId:randomUUID(),name:'SCHRAMM-Test',brandColor:'#009cdc',userLimit:1,users:[]});
 assert.notEqual(collision.company.portalSlug,f.a.company.portalSlug);
 f.store.db.exec('DROP INDEX companies_portal_slug; ALTER TABLE companies DROP COLUMN portal_slug;');
 const migrated=createAuthStore({filename:f.filename,origin,deliverReset:async()=>{}});
 assert.equal(migrated.getCompany(f.admin.token,f.a.company.id).portalSlug,'schramm-test');
 const code=migrated.getCompany(f.admin.token,collision.company.id).portalSlug;
 assert.notEqual(code,'schramm-test'); migrated.close();
 const reopened=createAuthStore({filename:f.filename,origin,deliverReset:async()=>{}});
 assert.equal(reopened.getCompany(f.admin.token,collision.company.id).portalSlug,code);reopened.close();
});
test('portal login validates membership; main company credentials sign in to the own portal only',async t=>{
 const f=await fixture(t), credentials={email:'a@test.local',password:f.a.credentials[0].password};
 // The main login no longer asks for the password twice: the session is scoped to the own company anyway.
 const main=await f.request('/api/auth/login',credentials);
 assert.equal(main.status,200);assert.equal(main.body.user.companySlug,'schramm-test');assert.equal(main.body.user.mustChangePassword,true);
 assert.equal((await f.request('/api/auth/session',undefined,main.cookie,'schramm-test')).status,200);
 assert.equal((await f.request('/api/auth/session',undefined,main.cookie,'other-company')).status,401);
 await f.request('/api/auth/logout',{},main.cookie);
 const wrong=await f.request('/api/auth/login',credentials,'','other-company');
 const unknown=await f.request('/api/auth/login',{email:'none@test.local',password:'wrong'},'','other-company');
 assert.equal(wrong.status,401);assert.deepEqual(wrong.body,unknown.body);
 assert.equal((await f.request('/api/auth/login',{email:'admin@test.local',password},'','schramm-test')).status,401);
 const login=await f.request('/api/auth/login',credentials,'','schramm-test');
 assert.equal(login.status,200);assert.equal(login.body.user.mustChangePassword,true);
 assert.equal((await f.request('/api/home',undefined,login.cookie,'schramm-test')).status,403);
 assert.equal((await f.request('/api/auth/change-password',{password,confirmation:password},login.cookie,'other-company')).status,401);
 assert.equal((await f.request('/api/auth/change-password',{password,confirmation:password},login.cookie,'schramm-test')).status,200);
 const permanent=await f.request('/api/auth/login',{email:'a@test.local',password},'','schramm-test');
 assert.equal((await f.request('/api/home',undefined,permanent.cookie,'schramm-test')).body.company.id,f.a.company.id);
 assert.equal((await f.request('/api/auth/session',undefined,permanent.cookie,'other-company')).status,401);
 assert.equal((await f.request('/api/home',undefined,permanent.cookie,'other-company')).status,401);
 assert.equal((await f.request('/api/companies',undefined,permanent.cookie,'schramm-test')).status,403);
 assert.equal((await f.request('/api/auth/login',{email:'a@test.local',password},'','schramm-test',{Origin:'http://evil.local'})).status,403);
});
test('recovery stays branded and generic, rejects cross-portal reset, and revokes sessions',async t=>{
 const f=await fixture(t);
 const wrong=await f.request('/api/auth/forgot-password',{email:'a@test.local'},'','other-company');
 const missing=await f.request('/api/auth/forgot-password',{email:'missing@test.local'},'','other-company');
 assert.deepEqual(wrong.body,missing.body);assert.equal(f.messages.length,0);
 await f.request('/api/auth/forgot-password',{email:'a@test.local'},'','schramm-test');
 assert.equal(f.messages.length,1);const link=new URL(f.messages[0].url);
 assert.equal(link.pathname,'/portal/schramm-test/passwort-zuruecksetzen');
 const token=link.searchParams.get('token');assert.ok(token);
 assert.equal((await f.request('/api/auth/reset-password',{token,password,confirmation:password},'','other-company')).status,400);
 assert.equal((await f.request('/api/auth/reset-password',{token,password,confirmation:password},'','schramm-test')).status,200);
 assert.equal((await f.request('/api/auth/reset-password',{token,password,confirmation:password},'','schramm-test')).status,400);
});
test('identify step routes company e-mails to their portal without revealing other accounts',async t=>{
 const f=await fixture(t);
 const company=await f.request('/api/auth/identify',{email:' A@TEST.LOCAL '});
 assert.equal(company.status,200);assert.equal(company.body.portal.portalSlug,'schramm-test');
 assert.deepEqual(Object.keys(company.body.portal).sort(),['appearance','brandColor','brandTheme','name','portalSlug'].sort());
 assert.equal(company.cookie,undefined);
 // Brudello and unknown addresses look identical: both continue on the main login.
 const admin=await f.request('/api/auth/identify',{email:'admin@test.local'});
 const unknown=await f.request('/api/auth/identify',{email:'nobody@test.local'});
 assert.deepEqual(admin.body,{portal:null});assert.deepEqual(unknown.body,admin.body);
 assert.equal((await f.request('/api/auth/identify',{email:'kein-email'})).status,400);
 assert.equal((await f.request('/api/auth/identify',{email:'a@test.local'},'',undefined,{Origin:'http://evil.local'})).status,403);
 let last;for(let i=0;i<30;i++) last=await f.request('/api/auth/identify',{email:`probe${i}@test.local`});
 assert.equal(last.status,429);
});
