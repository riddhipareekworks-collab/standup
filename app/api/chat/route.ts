import {normalizedRequest} from '../../../lib/render-auth';
import {handleChat} from '../../../lib/show-guide';
import {runtimeEnv} from '../../../lib/render-env';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){return handleChat(normalizedRequest(request),runtimeEnv());}
