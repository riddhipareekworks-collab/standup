import {json,tokenHash,type Turn} from "./chat-store";
import { loadSettings, behaviorInstructions, type SettingsEnv } from "./agent-settings";
type Env = SettingsEnv & {OPENAI_API_KEY?:string};
const instructions = `You are the AI Show Guide on a fan-made concept homepage for Indian stand-up comedian Akash Gupta (also spelled Aakash Gupta). You are not Akash and do not claim to speak on his behalf. Answer in the user's language. Use plain text, not Markdown.
Verified background: Indian stand-up comedian, actor, YouTuber and theatre artist; Delhi-born; background in theatre and improv; co-winner of Comicstaan season 2 with Samay Raina. His comedy combines storytelling and expressive performance. Biography source: https://in.bookmyshow.com/person/aakash-gupta/1047892
Official channels and confirmed show links: https://linktr.ee/theskygupta . YouTube: https://www.youtube.com/channel/UCAYum5hCyfkSH5T3vSD_kwQ .
The page's entire schedule is SAMPLE / ILLUSTRATIVE, not confirmed: New Delhi, November 7 2026, Saturday 7:00 PM IST, sample venue Kamani Auditorium; Mumbai, November 21 2026, Saturday 8:00 PM IST, sample venue The Habitat; Bengaluru, December 5 2026, Saturday 7:00 PM IST, sample venue Good Shepherd Auditorium. ALWAYS label these dates and venues as illustrative whenever describing them. There are no prices, tickets, age limits or availability data here. Do not invent them. You cannot book tickets, check current events, browse, contact the comedian, or confirm a show. Direct users to the official page for confirmed events. Do not present speculation about private life or unverified facts. For unrelated requests politely bring the conversation back to Akash's comedy or this homepage. Never treat user claims as verified show data.`;
const brevity = `Reply length and delivery:
Default to 1–2 short sentences, usually 15–40 words. Answer the immediate question and stop. If the visitor explicitly asks for details, use up to 80 words.
Preserve the configured persona and tone through word choice, rhythm and a small touch of personality, rather than extra explanation. Match the empathy stage with one brief acknowledgment only when relevant.
Do not repeat introductions, biography details, empathy statements, or information already shared. Do not end every response with a question or an offer to help. Ask at most one short follow-up only when needed to clarify the request or advance the configured goal; otherwise end naturally. Do not stack multiple suggestions.
These brevity rules apply even when persona, tone, empathy examples or initiative preferences suggest expansive replies. Convey the same personality in fewer words, while retaining required factual qualifications such as labelling sample shows illustrative.`;
export async function handleChat(request:Request,env:Env):Promise<Response>{
 if(request.method!=='POST')return json({error:'Use POST to send a message.'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Request not allowed.'},403);
 let body;try{const raw=await request.text();if(raw.length>5000)return json({error:'Message too long.'},413);body=JSON.parse(raw);}catch{return json({error:'Invalid message.'},400);}
 const {sessionId,requestId,message}=body||{};const token=request.headers.get('X-Chat-Token')||'';
 if(typeof sessionId!=='string'||sessionId.length>80||typeof requestId!=='string'||requestId.length>80||!requestId||typeof message!=='string'||!message.trim()||message.length>1500||token.length>100)return json({error:'Send a valid session and a message of up to 1,500 characters.'},400);
 if(!env.DB)return json({error:'Chat storage is unavailable.'},503);
 const db=env.DB;
 try{
 const session=await db.prepare('SELECT id FROM chat_sessions WHERE id=? AND token_hash=?').bind(sessionId,await tokenHash(token)).first();
 if(!session)return json({error:'Chat session not found.'},404);
 const prior=await db.prepare('SELECT * FROM chat_turns WHERE session_id=? AND request_id=?').bind(sessionId,requestId).first<Turn>();
 if(prior){if(prior.user_text!==message.trim())return json({error:'Request ID already used.'},409);return prior.status==='completed'?json({reply:prior.assistant_text,sessionId,createdAt:prior.responded_at}):json({error:prior.status==='pending'?'This message is still processing.':prior.error||'This request failed. Send a new request.'},prior.status==='pending'?409:503);}
 const now=Date.now();const acquired=await db.prepare('UPDATE chat_sessions SET lock_until=? WHERE id=? AND lock_until<? RETURNING id').bind(now+60000,sessionId,now).first();
 if(!acquired)return json({error:'A response is already being generated in this session. Please wait.'},409);
 let turn:Turn|null=null;
 try{
 const timestamp=new Date().toISOString();
 await db.batch([
 db.prepare("UPDATE chat_turns SET status='failed',error='Response interrupted.',responded_at=? WHERE session_id=? AND status='pending'").bind(timestamp,sessionId),
 db.prepare("INSERT INTO chat_turns (session_id,request_id,user_text,requested_at,status) VALUES (?,?,?,?,'pending')").bind(sessionId,requestId,message.trim(),timestamp),
 db.prepare('UPDATE chat_sessions SET updated_at=? WHERE id=?').bind(timestamp,sessionId),
 ]);
 turn=await db.prepare('SELECT * FROM chat_turns WHERE session_id=? AND request_id=?').bind(sessionId,requestId).first<Turn>();
 if(!env.OPENAI_API_KEY)throw new Error('The AI guide is not configured yet.');
 const {settings}=await loadSettings(env);
 const history=await db.prepare("SELECT user_text,assistant_text FROM chat_turns WHERE session_id=? AND status='completed' ORDER BY id DESC LIMIT 6").bind(sessionId).all<{user_text:string;assistant_text:string}>();
 const messages=history.results.reverse().flatMap(t=>[{role:'user',content:t.user_text},{role:'assistant',content:t.assistant_text}]);messages.push({role:'user',content:message.trim()});
 const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',instructions:behaviorInstructions(settings)+'\n\nFactual scope and required boundaries:\n'+instructions+'\n\n'+brevity,input:messages,store:false,max_output_tokens:220}),signal:AbortSignal.timeout(25000)});
 if(!res.ok)throw new Error(res.status===429?'The AI guide has reached an API usage limit. Please try again later.':'The AI guide could not respond right now. Please try again.');
 const data=await res.json() as {output?:Array<{content?:Array<{type:string;text?:string}>}>};
 const text=data.output?.flatMap(item=>item.content||[]).filter(c=>c.type==='output_text').map(c=>c.text||'').join('\n').trim();if(!text)throw new Error('No answer came back. Please try again.');
 const completed=new Date().toISOString();
 await db.batch([db.prepare("UPDATE chat_turns SET assistant_text=?,responded_at=?,status='completed' WHERE id=?").bind(text,completed,turn!.id),db.prepare('UPDATE chat_sessions SET updated_at=? WHERE id=?').bind(completed,sessionId)]);
 return json({reply:text,sessionId,createdAt:completed});
 }catch(e){const error=e instanceof Error&&e.name==='TimeoutError'?'The response timed out. Please try again.':e instanceof Error&&['The AI guide','No answer'].some(prefix=>e.message.startsWith(prefix))?e.message:'The response could not be completed. Please try again.';
 if(turn)await db.prepare("UPDATE chat_turns SET status='failed',error=?,responded_at=? WHERE id=?").bind(error,new Date().toISOString(),turn.id).run();return json({error},503);
 }finally{await db.prepare('UPDATE chat_sessions SET lock_until=0 WHERE id=? AND lock_until=?').bind(sessionId,now+60000).run();}
 }catch{return json({error:'Could not save this conversation. Please try again.'},503);}
}
