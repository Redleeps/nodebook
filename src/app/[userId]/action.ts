"use server";

import type { Project } from "@/contexts/project";
import { db } from "@/lib/db";
import { projectsTable } from "@/lib/schema";
import { currentUser } from "@clerk/nextjs";
import { nanoid } from "nanoid";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

export async function createProject() {
  const user = await currentUser();
  if (!user) throw new Error("No user");
  const [project] = await db
    .insert(projectsTable)
    .values({
      id: nanoid(6),
      name: "My Project",
      user_id: user.id,
      content: JSON.stringify({
        contexts: [],
        packages: [],
      } as Project),
      public: false,
    })
    .returning();
  revalidateTag(`/${user.id}/${project.id}`);
  revalidatePath(`/${user.id}/${project.id}`);
  redirect(`/${user.id}/${project.id}`);
}
