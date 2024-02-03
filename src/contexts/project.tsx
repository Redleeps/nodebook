"use client";
import { quit, findId, hasId } from '@/lib/utils';
import * as React from 'react'

export interface ExecutionContext {
    id: string;
    name?: string;
    displayedContent: string;
    displayedHasTranspiled: boolean;
    transpiledContent: string;
    transpiledHasRan: boolean;
    store?: Record<string, unknown>;
    lastRun: {
        date: Date;
        duration: number;
        result: string;
    } | null;
}
export interface Project {
    contexts: ExecutionContext[]
    packages: {
        name: string;
        version: string;
        entrypoints?: {
            name: string;
            value: string;
        }[];
        url: string;
    }[]
}
export interface ProjectContextType {
    project: Project | null;
    updateProject: React.Dispatch<React.SetStateAction<Project>>
}
export const ProjectContext = React.createContext<ProjectContextType | null>(null);

export function useProject() {
    const ctx = React.useContext(ProjectContext)
    if(!ctx?.project) quit(`useProject must be used within a ProjectProvider`)
    return ctx as { [key in keyof ProjectContextType]: NonNullable<ProjectContextType[key]>}
}

export function ProjectProvider({ children, defaultProject }: { children: React.ReactNode, defaultProject: Project }) {
    const [project, updateProject] = React.useState<Project>(defaultProject)
    React.useEffect(() => {
        const storedProject = localStorage.getItem('project')
        if (storedProject) {
            const parsedProject = JSON.parse(storedProject) as Project
            Promise.all(parsedProject.packages.map(async pkg => {
                if (await hasPackage(pkg.name, pkg.version)) return
                await addScript(pkg.name, pkg.version, pkg.url).catch(() => { })
            })).then(() => {
                updateProject(parsedProject)
            })
        }
    }, [])
    React.useEffect(() => {
        if (!project) return
        localStorage.setItem('project', JSON.stringify(project))
    }, [project])
    return (<>
        <ProjectContext.Provider value={{
            project: project ?? null,
            updateProject: updateProject as React.Dispatch<React.SetStateAction<Project>>
        }} children={children} />
        <script type="importmap">
            {JSON.stringify({
                imports: project?.packages.reduce((imports, pkg) => {
                    // for (const { name, value } of pkg.entrypoints ?? []) {
                    //   imports[name] = value
                    // }
                    imports[pkg.name] = pkg.url
                    return imports
                }, {} as Record<string, string>) ?? {}
            }, null, 4)}
        </script>
    </>)
}
export function useExecutionContext(id: string) {
    const { project, updateProject } = useProject()
    const context = findId(project.contexts, id) ?? quit(`Could not find context with id ${id}`)
    const previousStore = {}
    for (const context of project.contexts) {
        if (hasId(context, id)) break
        Object.assign(previousStore, context.store ?? {})
    }
    function updateContext(updatedContext: ExecutionContext | ((context: ExecutionContext) => ExecutionContext)) {
        updateProject({
            ...project,
            contexts: project.contexts.map(context => {
                if (!hasId(context, id)) return context
                if (typeof updatedContext === "function")
                    return updatedContext(context)
                return updatedContext
            })
        })
    }
    function removeContext() {
        updateProject({
            ...project,
            contexts: project.contexts.filter(context => !hasId(context, id))
        })
    }
    return { context, updateContext, removeContext, previousStore }
}
export function usePackage(name: string) {
    const { project, updateProject } = useProject()
    const pkg = project.packages.find(pkg => pkg.name === name) ?? quit(`Could not find package with name ${name}`)
    function updatePackage(updatedPackage: Project["packages"][0] | ((pkg: Project["packages"][0]) => Project["packages"][0])) {
        updateProject({
            ...project,
            packages: project.packages.map(pkg => {
                if (pkg.name !== name) return pkg
                if (typeof updatedPackage === "function")
                    return updatedPackage(pkg)
                return updatedPackage
            })
        })
    }
    function removePackage() {
        updateProject({
            ...project,
            packages: project.packages.filter(pkg => pkg.name !== name)
        })
        requestAnimationFrame(() => {
            window.location.reload()
        })
    }
    return { pkg, updatePackage, removePackage }
}

export function getScriptId(name: string, version: string) {
    return `nodebook-package-${name}@${version}`
}
export async function hasPackage(name: string, version: string) {
    const script = document.getElementById(getScriptId(name, version))
    return !!script
}
export async function addScript(name: string, version: string, url: string) {
    const scriptId = getScriptId(name, version)
    const link = document.createElement('link')
    link.id = scriptId
    link.href = url
    link.as = 'script'
    link.rel = 'preload'
    document.head.appendChild(link)
    return true
}