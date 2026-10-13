import {isAdmin,type SettingsEnv} from './agent-settings';
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function tokenHash(token:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(v=>v.toString(16).padStart(2,'0')).join('');}
export type Turn={id:number;session_id:string;request_id:string;user_text:string;assistant_text:string|null;requested_at:string;responded_at:string|null;status:string;error:string|null};
export async function createChatSession(request:Request,env:SettingsEnv,local=false){
 if(request.method!=='POST')return json({error:'Method not allowed.'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request not allowed.'},403);
 if(!env.DB)return json({error:'Chat storage is unavailable.'},503);
 try{
 const id=crypto.randomUUID(),token=crypto.randomUUID()+crypto.randomUUID(),now=new Date().toISOString();
 const source=new URL(request.url).searchParams.get('source')==='admin-test'&&isAdmin(request,env,local)?'admin-test':'website';
 await env.DB.prepare('INSERT INTO chat_sessions (id,token_hash,source,created_at,updated_at) VALUES (?,?,?,?,?)').bind(id,await tokenHash(token),source,now,now).run();
 return json({sessionId:id,token,createdAt:now},201);
 }catch{return json({error:'Could not create a chat session. Please try again.'},503);}
}
export async function readTranscripts(request:Request,env:SettingsEnv,local=false){
 if(!isAdmin(request,env,local))return json({error:'Only the site owner can read transcripts.'},403);
 if(request.method!=='GET')return json({error:'Method not allowed.'},405);
 if(!env.DB)return json({error:'Chat storage is unavailable.'},503);
 try{
 const url=new URL(request.url),session=url.searchParams.get('sessionId');
 if(session){
 const after=Number(url.searchParams.get('after')||0);if(!Number.isSafeInteger(after)||after<0)return json({error:'Invalid cursor.'},400);
 const meta=await env.DB.prepare('SELECT id,source,created_at,updated_at FROM chat_sessions WHERE id=?').bind(session).first();if(!meta)return json({error:'Session not found.'},404);
 const result=await env.DB.prepare('SELECT * FROM chat_turns WHERE session_id=? AND id>? ORDER BY id LIMIT 101').bind(session,after).all<Turn>();const turns=result.results.slice(0,100);
 return json({session:meta,turns,nextAfter:result.results.length>100?turns.at(-1)?.id:null});
 }
 const offset=Number(url.searchParams.get('offset')||0);if(!Number.isSafeInteger(offset)||offset<0)return json({error:'Invalid page.'},400);
 const result=await env.DB.prepare('SELECT s.id,s.source,s.created_at,s.updated_at,COUNT(t.id) AS turns FROM chat_sessions s LEFT JOIN chat_turns t ON t.session_id=s.id GROUP BY s.id ORDER BY s.created_at DESC,s.id DESC LIMIT 51 OFFSET ?').bind(offset).all();
 return json({sessions:result.results.slice(0,50),hasMore:result.results.length>50});
 }catch{return json({error:'Could not load transcripts.'},503);}
}
