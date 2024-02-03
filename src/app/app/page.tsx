import { currentUser } from '@clerk/nextjs';
import { redirect } from 'next/navigation';

export default async function AppRedirect() {
    const user = await currentUser()
    if (!user) redirect('/')
    return redirect('/' + user.username)
}
