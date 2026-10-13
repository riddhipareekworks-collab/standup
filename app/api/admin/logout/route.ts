import {NextResponse} from 'next/server';
import {COOKIE,sameOrigin} from '../../../../lib/render-auth';
export async function POST(request:Request){if(!sameOrigin(request))return NextResponse.json({error:'Request not allowed.'},{status:403});const response=NextResponse.json({ok:true});response.cookies.set(COOKIE,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});return response;}
