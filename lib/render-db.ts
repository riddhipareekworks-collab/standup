import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DEFAULT_SETTINGS,validateSettings} from './agent-settings';
let singleton:DatabaseSync|undefined;
export function database(){
 if(singleton)return singleton;
 const location=process.env.DATABASE_PATH||path.join(process.cwd(),'.data','standup.sqlite');
 mkdirSync(path.dirname(location),{recursive:true});
 const db=new DatabaseSync(location);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 db.exec('CREATE TABLE IF NOT EXISTS render_migrations (name TEXT PRIMARY KEY, hash TEXT NOT NULL, applied_at TEXT NOT NULL)');
 try{
 for(const name of readdirSync(path.join(process.cwd(),'drizzle')).filter(n=>n.endsWith('.sql')).sort()){
  const sql=readFileSync(path.join(process.cwd(),'drizzle',name),'utf8');const hash=createHash('sha256').update(sql).digest('hex');
  const previous=db.prepare('SELECT hash FROM render_migrations WHERE name=?').get(name);
  if(previous){if(previous.hash!==hash)throw new Error('Applied database migration has changed: '+name);continue;}
  db.exec('BEGIN IMMEDIATE');try{db.exec(sql);db.prepare('INSERT INTO render_migrations VALUES (?,?,?)').run(name,hash,new Date().toISOString());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}
 }
 if(!db.prepare('SELECT id FROM agent_settings WHERE id=?').get('primary')){
  const supplied=process.env.INITIAL_AGENT_SETTINGS?validateSettings(JSON.parse(process.env.INITIAL_AGENT_SETTINGS)):DEFAULT_SETTINGS;
  if(!supplied)throw new Error('INITIAL_AGENT_SETTINGS is invalid');
  db.prepare('INSERT INTO agent_settings (id,persona,tone,empathy,goal_orientation,conversation_goal,empathy_examples,updated_at) VALUES (?,?,?,?,?,?,?,?)').run('primary',supplied.persona,supplied.tone,supplied.empathy,supplied.goalOrientation,supplied.conversationGoal,JSON.stringify(supplied.empathyExamples),new Date().toISOString());
 }
 singleton=db;return db;
 }catch(e){db.close();throw e;}
}
export function renderDb():D1Database{
 const db=database();
 const prepare=(sql:string)=>{let values:unknown[]=[];const execute=()=>db.prepare(sql);return {
  bind(...args:unknown[]){values=args;return this;},
  async first(column?:string){const row=execute().get(...values as never[]);return row?(column?row[column]:row):null;},
  async all(){return {results:execute().all(...values as never[]),success:true,meta:{}};},
  _run(){const result=execute().run(...values as never[]);return {success:true,meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)},results:[]};},
  async run(){return this._run();},
 };};
 return {prepare,async batch(statements:Array<{_run():unknown}>){db.exec('BEGIN IMMEDIATE');try{const results=[];for(const s of statements)results.push(s._run());db.exec('COMMIT');return results;}catch(e){db.exec('ROLLBACK');throw e;}}} as unknown as D1Database;
}
