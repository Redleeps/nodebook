import { Project, ProjectProvider } from '@/contexts/project';
import { db } from '@/lib/db';
import { projectsTable } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import * as React from 'react';

export interface IProjectLayoutProps {
    children: React.ReactNode;
    params: {
        projectId: string;
    };
}

export default async function ProjectLayout(props: IProjectLayoutProps) {
    const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, props.params.projectId));
    return (
        <ProjectProvider defaultProject={JSON.parse(project.content) as Project}>
            <section className='flex items-center justify-center'>
                <div className='w-screen'>
                    {props.children}
                </div>
            </section>
        </ProjectProvider>
    );
}
