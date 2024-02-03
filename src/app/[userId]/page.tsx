import DateComponent from '@/components/date-component';
import Title from '@/components/system/title';
import { Button } from '@/components/ui/button';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { db } from '@/lib/db';
import { projectsTable } from '@/lib/schema';
import { MoreHorizontal } from 'lucide-react';
import * as React from 'react';
import { createProject } from './action';
import Link from 'next/link';

export interface IProjectsListProps {
  params: {
    userId: string;
  };
}

export default async function ProjectsList(props: IProjectsListProps) {
  const projects = await db.select({
    id: projectsTable.id,
    name: projectsTable.name,
    updatedAt: projectsTable.updated_at,
    public: projectsTable.public
  }).from(projectsTable)

  return (
    <div>
      <div className='w-full flex justify-between mt-6 items-center'>
        <Title>Projects</Title>
        <form action={createProject}>
          <Button type="submit">New project</Button>
        </form>
      </div>
      <div className='grid grid-cols-4 gap-5 mt-6'>
        {projects.map((project) => (
          <Link href={`/${props.params.userId}/${project.id}`} key={project.id}>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <Title variant="h5">
                      {project.name}
                    </Title>
                    <Button size="icon-sm" variant="ghost">
                      <MoreHorizontal size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardFooter>
                  <span>Updated at <DateComponent date={project.updatedAt} /></span>
                </CardFooter>
              </Card>
          </Link>
        ))}
        <div className="bg-slate-100 rounded-lg" />
        <div className="bg-slate-100 rounded-lg" />
        <div className="bg-slate-100 rounded-lg" />
      </div>
    </div>
  );
}
