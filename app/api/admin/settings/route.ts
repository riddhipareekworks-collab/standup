import {handleSettings} from '../../../../lib/agent-settings';
import {runtimeEnv} from '../../../../lib/render-env';
import {trustedRequest,requestIsAdmin} from '../../../../lib/render-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
async function handle(request:Request){if(!requestIsAdmin(request))return Response.json({error:'Admin sign-in required.'},{status:403});return handleSettings(trustedRequest(request),runtimeEnv());}
export const GET=handle;export const PUT=handle;
