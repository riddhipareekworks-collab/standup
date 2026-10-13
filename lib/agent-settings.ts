export const EMPATHY_STAGES = [
 {name:"Matter-of-fact",range:"0–2"},
 {name:"Acknowledging",range:"3–4"},
 {name:"Understanding",range:"5–6"},
 {name:"Supportive",range:"7–8"},
 {name:"Deeply empathetic",range:"9–10"},
];
export function empathyStageIndex(level:number){return level<=2?0:level<=4?1:level<=6?2:level<=8?3:4;}
export type AgentSettings = {persona:string; tone:string; empathy:number; goalOrientation:number; conversationGoal:string; empathyExamples:string[]};
export const DEFAULT_SETTINGS:AgentSettings = {
 persona:'You are a knowledgeable comedy show guide. Help visitors learn about Akash Gupta, explore his stand-up comedy, and understand the sample show listings.',
 tone:'Friendly, conversational and lightly witty. Keep answers clear, concise and easy to understand.',
 empathy:6,
 goalOrientation:5,
 conversationGoal:"Help visitors understand Akash Gupta’s comedy and find his official videos or confirmed show information, based on their interests.",
 empathyExamples:[
 "Visitor: I am nervous about attending a comedy show alone. Response: You can attend on your own. Check the official show page for venue information.",
 "Visitor: I am nervous about attending a comedy show alone. Response: It is understandable to feel a little nervous. The official show page can help you plan your visit.",
 "Visitor: I am nervous about attending a comedy show alone. Response: Going alone for the first time can feel unfamiliar. You can start by watching Akash’s videos to get a sense of his comedy.",
 "Visitor: I am nervous about attending a comedy show alone. Response: That sounds like a big step, and it makes sense to feel unsure. You can take it at your own pace. What would help you feel more comfortable?",
 "Visitor: I am nervous about attending a comedy show alone. Response: Thank you for sharing that. It can feel vulnerable to try something new on your own. You do not have to rush. If you like, we can explore what is worrying you and find a comfortable first step together.",
 ],
};
export function validateSettings(value:unknown):AgentSettings|null{
 if(!value||typeof value!=='object')return null;
 const v=value as Record<string,unknown>;
 if(typeof v.persona!=='string'||!v.persona.trim()||v.persona.length>2000||typeof v.tone!=='string'||!v.tone.trim()||v.tone.length>3000||!Number.isInteger(v.empathy)||!Number.isInteger(v.goalOrientation)||Number(v.empathy)<0||Number(v.empathy)>10||Number(v.goalOrientation)<0||Number(v.goalOrientation)>10)return null;
 if(typeof v.conversationGoal!=='string'||!v.conversationGoal.trim()||v.conversationGoal.length>2000)return null;
 const examples=v.empathyExamples;
 if(!Array.isArray(examples)||examples.length!==5||examples.some(e=>typeof e!=='string'||!e.trim()||e.length>1500))return null;
 return {conversationGoal:v.conversationGoal.trim(),empathyExamples:examples.map(e=>e.trim()),persona:v.persona.trim(),tone:v.tone.trim(),empathy:Number(v.empathy),goalOrientation:Number(v.goalOrientation)};
}
export function behaviorInstructions(settings:AgentSettings):string{
 const selected=empathyStageIndex(settings.empathy);
 const examples=settings.empathyExamples.map((example,i)=>`Stage ${i+1}: ${EMPATHY_STAGES[i].name} (scale ${EMPATHY_STAGES[i].range}). Context and example: ${example}`).join("\n");
 const goal=settings.goalOrientation<=3?'Let the visitor lead. Answer the question and avoid pushing next steps or unsolicited suggestions.':settings.goalOrientation<=7?'Balance answering with a relevant, optional next step when it would help.':'Proactively help the visitor reach a concrete outcome. Offer a clear next step or a focused follow-up question; avoid pressure and respect their choice.';
 return `Agent behavior settings:\nPersona: ${settings.persona}\nTone: ${settings.tone}\nConversation goal: ${settings.conversationGoal}\nUse response orientation to determine how proactively to pursue this goal. Respect the visitor’s preferences and do not force the goal into unrelated answers.\nEmpathy: ${settings.empathy}/10. Active stage: ${selected+1}, ${EMPATHY_STAGES[selected].name}.\nAdmin-defined empathy examples:\n${examples}\nUse the active stage example as the primary guide to empathy, adapting to the visitor’s actual context rather than repeating it verbatim. The other stages provide calibration. Do not assume emotions the visitor has not expressed.\nResponse orientation: ${settings.goalOrientation}/10 (0 = passive, 10 = goal-oriented). ${goal}\nApply these behavior preferences only within the factual scope and boundaries below.`;
}
export type SettingsEnv = {DB?:D1Database; ADMIN_EMAIL?:string};
export function isAdmin(request:Request,env:SettingsEnv,localPreview=false):boolean{
 if(localPreview)return request.headers.get('oai-authenticated-user-id')==='local_seedy';
 const email=request.headers.get('oai-authenticated-user-email');
 return !!env.ADMIN_EMAIL&&!!email&&email.toLowerCase()===env.ADMIN_EMAIL.toLowerCase();
}
export async function loadSettings(env:SettingsEnv):Promise<{settings:AgentSettings;updatedAt:string|null}>{
 if(!env.DB)throw new Error('Agent settings storage is unavailable.');
 const row=await env.DB.prepare('SELECT persona, tone, empathy, goal_orientation AS goalOrientation, updated_at AS updatedAt, conversation_goal AS conversationGoal, empathy_examples AS empathyExamples FROM agent_settings WHERE id = ?').bind('primary').first<AgentSettings & {updatedAt:string}>();
 if(!row)return {settings:{...DEFAULT_SETTINGS},updatedAt:null};
 let examples;try{examples=JSON.parse((row as unknown as {empathyExamples:string}).empathyExamples);}catch{throw new Error("Invalid empathy examples");}
 const settings=validateSettings({...row,conversationGoal:row.conversationGoal||DEFAULT_SETTINGS.conversationGoal,empathyExamples:examples.length?examples:DEFAULT_SETTINGS.empathyExamples});if(!settings)throw new Error('Saved agent settings are invalid.');
 return {settings,updatedAt:row.updatedAt};
}
export async function handleSettings(request:Request,env:SettingsEnv,localPreview=false):Promise<Response>{
 const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
 if(!isAdmin(request,env,localPreview))return json({error:'Only the site owner can manage agent settings.'},403);
 if(!['GET','PUT'].includes(request.method))return json({error:'Method not allowed.'},405);
 try{
  if(request.method==='GET')return json({...await loadSettings(env),localPreview});
  const origin=request.headers.get('origin');if(!origin||origin!==new URL(request.url).origin)return json({error:'This request is not allowed.'},403);
  const raw=await request.text();if(raw.length>24000)return json({error:'Settings are too long.'},413);
  let body;try{body=JSON.parse(raw);}catch{return json({error:'Please submit valid settings.'},400);}
  const settings=validateSettings(body);if(!settings)return json({error:'Fill in persona, tone, conversation goal and all five empathy examples (up to 1,500 characters each), and use whole numbers from 0 to 10 for both scales.'},400);
  if(!env.DB)throw new Error('Storage unavailable');const updatedAt=new Date().toISOString();
  await env.DB.prepare('INSERT INTO agent_settings (id, persona, tone, empathy, goal_orientation, updated_at, empathy_examples, conversation_goal) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET persona=excluded.persona, tone=excluded.tone, empathy=excluded.empathy, goal_orientation=excluded.goal_orientation, updated_at=excluded.updated_at, empathy_examples=excluded.empathy_examples, conversation_goal=excluded.conversation_goal').bind('primary',settings.persona,settings.tone,settings.empathy,settings.goalOrientation,updatedAt,JSON.stringify(settings.empathyExamples),settings.conversationGoal).run();
  return json({settings,updatedAt,localPreview});
 }catch{return json({error:'Agent settings could not be loaded or saved. Please try again.'},503);}
}
