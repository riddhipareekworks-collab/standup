import {database} from '../../../lib/render-db';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){try{database().prepare('SELECT 1').get();return Response.json({status:'ok'});}catch{return Response.json({status:'unavailable'},{status:503});}}
