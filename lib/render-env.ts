import {renderDb} from './render-db';
import {authEnv} from './render-auth';
export function runtimeEnv(){return {DB:renderDb(),...authEnv(),OPENAI_API_KEY:process.env.OPENAI_API_KEY};}
