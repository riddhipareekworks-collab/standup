import {COOKIE,checkPassword,issueToken,sameOrigin} from '../../../../lib/render-auth';
import {NextResponse} from 'next/server';
const failures=new Map<string,{count:number;start:number}>();
export const runtime='nodejs';
export async function POST(request:Request){
 if(!sameOrigin(request))return NextResponse.json({error:'Request not allowed.'},{status:403});
 const address=request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';const now=Date.now();
 let entry=failures.get(address);if(!entry||now-entry.start>15*60*1000)entry={count:0,start:now};
 if(entry.count>=10)return NextResponse.json({error:'Too many attempts. Please try again in 15 minutes.'},{status:429});
 const raw=await request.text();if(raw.length>2000)return NextResponse.json({error:'Request too large.'},{status:413});
 let data;try{data=JSON.parse(raw);}catch{return NextResponse.json({error:'Invalid sign-in request.'},{status:400});}
 if(typeof data.password!=='string'||!checkPassword(data.password)){entry.count++;failures.set(address,entry);if(failures.size>5000)for(const [key,value] of failures)if(now-value.start>15*60*1000)failures.delete(key);return NextResponse.json({error:'Incorrect admin password.'},{status:401});}
 try{const response=NextResponse.json({ok:true});response.cookies.set(COOKIE,issueToken(),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:8*60*60});failures.delete(address);return response;}catch{return NextResponse.json({error:'Admin sign-in is not configured.'},{status:503});}
}
