import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Akash Gupta — Stand-up, Stories & Live Shows',description:'Meet Indian stand-up comedian Akash Gupta. Explore his comedy, sample live shows, and chat with the AI show guide.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
