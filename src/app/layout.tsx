import { ClerkProvider, SignInButton, UserButton, currentUser } from '@clerk/nextjs';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import Title from '@/components/system/title';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const user = await currentUser();
    return (
        <ThemeProvider defaultTheme='dark' storageKey="vite-ui-theme">
            <ClerkProvider>
                <html lang="en">
                    <body className='bg-background'>
                        <main className="w-screen max-w-7xl mx-auto pt-24">
                            <header className="h-20 w-screen fixed top-0 left-0 shadow-sm shadow-muted">
                                <div className="w-screen max-w-7xl mx-auto h-full flex items-center">
                                    <Title variant="h3">
                                        <Link href="/">Nodebook</Link>
                                    </Title>
                                    <div id="actions" className='grow shrink'/>
                                    <div className="flex items-center gap-1 border border-border rounded-full pl-1 pr-2 py-1">
                                        {user ? (
                                            <>
                                                <Link href="/app">
                                                    <Button size="sm" variant="ghost" className=' rounded-tr-md rounded-br-md rounded-tl-full rounded-bl-full'>Go to app</Button>
                                                </Link>
                                                <div className="w-8 h-8 rounded-full bg-muted">
                                                    <UserButton afterSignOutUrl="/" />
                                                </div>
                                            </>

                                        ) : <SignInButton mode="modal" redirectUrl="/app" />}
                                    </div>
                                </div>
                            </header>
                            {children}
                        </main>
                    </body>
                </html>
            </ClerkProvider>
        </ThemeProvider>
    )
}