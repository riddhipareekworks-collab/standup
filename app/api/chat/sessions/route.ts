import {createChatSession} from '../../../../lib/chat-store';
import {runtimeEnv} from '../../../../lib/render-env';
import {trustedRequest} from '../../../../lib/render-auth';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){return createChatSession(trustedRequest(request),runtimeEnv());}
