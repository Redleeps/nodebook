import { currentUser } from '@clerk/nextjs';

export type User = NonNullable<Awaited<ReturnType<typeof currentUser>>>;