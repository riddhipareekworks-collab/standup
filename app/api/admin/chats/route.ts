import {readTranscripts} from '../../../../lib/chat-store';
import {runtimeEnv} from '../../../../lib/render-env';
import {trustedRequest,requestIsAdmin} from '../../../../lib/render-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request){if(!requestIsAdmin(request))return Response.json({error:'Admin sign-in required.'},{status:403});return readTranscripts(trustedRequest(request),runtimeEnv());}
