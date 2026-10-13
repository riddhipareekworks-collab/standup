import {cookies} from 'next/headers';
import {redirect} from 'next/navigation';
import {COOKIE,validToken} from '../../../lib/render-auth';
export const dynamic='force-dynamic';
export default async function ProtectedAdmin({children}:{children:React.ReactNode}){const jar=await cookies();if(!validToken(jar.get(COOKIE)?.value||''))redirect('/admin/login');return children;}
