import * as React from 'react'
import { ThemeProvider } from './components/theme-provider';
import { Card, CardContent, CardFooter, CardHeader } from './components/ui/card';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { CircleDotDashed, Hammer } from 'lucide-react';
import { cn } from './lib/utils';

/**
 * 
 * 
 * Project Context
 * 
 * 
 */
interface ExecutionContext {
  id: string;
  displayedContent: string;
  displayedHasTranspiled: boolean;
  transpiledContent: string;
  transpiledHasRan: boolean;
  store?: Record<string, any>;
  lastRun: {
    date: Date;
    duration: number;
    result: string;
  } | null;
}
interface Project {
  name: string;
  contexts: ExecutionContext[]
}
const ProjectContext = React.createContext<{
  project: Project,
  updateProject: React.Dispatch<React.SetStateAction<Project>>
} | null>(null);
function useProject() {
  return React.useContext(ProjectContext) ?? quit(`useProject must be used within a ProjectProvider`)
}
function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, updateProject] = React.useState<Project>({
    name: "My Project",
    contexts: []
  })
  return (<ProjectContext.Provider value={{ project, updateProject }} children={children} />)
}
function useExecutionContext(id: string) {
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

/**
 * Runner functions
 */
import ts from "typescript"
import * as esprima from "esprima"
const TS_HELPERS_END = '/* ------- ts helpers ends here ------- */\n'
function transpile(source: string, previousStore: Record<string, any> = {}): string {
  console.log('transpile', previousStore)
  const oldStoreKeys = Object.keys(previousStore).map(key => `var ${key};`).join('\n')
  const output = ts.transpile(`
    /* typescript helpers */
    ${TS_HELPERS_END}
    ${oldStoreKeys}
    ${source}
    `, {
    forceConsistentCasingInFileNames: true,
    allowSyntheticDefaultImports: true,
    noImplicitAny: true,
    strict: false,
    pretty: true,
    esModuleInterop: true,
    importHelpers: false,
    noEmitHelpers: false,
    removeComments: false,
  })
  return output.split(oldStoreKeys).join('')
}
declare global {
  interface Window {
    nodebook_logs: any[];
  }
}
window.nodebook_logs ??= []
const AsyncFunction = async function () { }.constructor;
async function runTranspiled(source: string, previousStore: Record<string, any> = {}) {
  console.log(source)
  const textToAnalyse = "(async function() {" + source.slice(Math.max(0, source.indexOf(TS_HELPERS_END))) + "})"
  console.log(textToAnalyse)
  const analysis = (esprima.parseScript(textToAnalyse, {
    tolerant: true,

  }).body[0] as any).expression.body as ReturnType<typeof esprima.parseScript>
  console.log({ analysis, source })
  const variables = analysis.body.filter(node => ['FunctionDeclaration', 'VariableDeclaration', 'VariableDeclarator'].includes(node.type))
  console.log({ variables })
  const variableNames = variables.flatMap(node => {
    if (node.type === 'FunctionDeclaration') return node.id.name
    if (node.type === 'VariableDeclaration') {
      return node.declarations.flatMap(({ id }) => {
        if (id.type === 'Identifier') return id.name
        if (id.type === 'ObjectPattern') return id.properties.map((prop) => {
          if (prop.type === 'Property') {
            if (prop.key.type === 'Identifier') return prop.key.name
            return null
          }
          if (prop.type === 'RestElement') {
            if (prop.argument.type === 'Identifier') return prop.argument.name
            return null
          }
        })
        // if (id.type === 'ArrayPattern') return id.elements.map(({ name }) => name)
        return null
      }).filter(Boolean) as string[]
    }
    throw new Error('Unsuported variable type')
  })
  console.log({ variableNames })

  const fn = AsyncFunction('store', ...Object.keys(previousStore), `
    const console = new Proxy({}, {
      get: (target, prop) => (...args) => window.nodebook_logs.push(...args)
    });
    return await (async function(){
      const start = Date.now()
      try {
        ${source}
        ${variableNames.map(name => `store.${name} = ${name}`).join('\n')}
      } catch (error) {
        console.error(error)
      }
      const duration = Date.now() - start
      return duration
    })()
  `)
  const newStore: Record<string, any> = {}
  const duration: number = await fn(newStore, ...Object.values(previousStore))
  const logs = window.nodebook_logs.splice(0)
  console.log({ logs, newStore, duration })
  return {
    result: '> ' + logs.flatMap(log => {
      if (is(log, 'undefined') || is(log, 'null')) return ""
      if (is(log, 'object') && log.constructor.name === 'Object') return JSON.stringify(log, null, 2).split('\n')
      return log.toString().split('\n')
    }).join('\n> '),
    newStore,
    duration
  }
}

/**
 * 
 * Components
 */
function Header() {
  const { project, updateProject } = useProject()
  function importProject() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const content = await file.text()
      console.log(content)
      const project = JSON.parse(content)
      updateProject(project)
    }
    input.click()
  } 
  function exportProject() {
    const a = document.createElement('a')
    const file = new Blob([JSON.stringify({
      ...project,
      contexts: project.contexts.map(context => ({
        ...context,
        store: undefined,
        transpiledHasRan: false,
      }))
    })], { type: 'application/json' })
    a.href = URL.createObjectURL(file)
    a.download = `${project.name}.json`
    a.click()
  }
  return (
    <div className='w-full border-b border-border'>
      <div className='py-6 mx-auto max-w-lg px-5 flex justify-between items-center'>
        <h1>{project.name}</h1>
        <div className="grid grid-cols-2 gap-4">
          <Button onClick={importProject}>Import</Button>
          <Button onClick={exportProject}>Export</Button>
        </div>
      </div>
    </div>
  )
}

function ExecutionContextItem({ id }: Pick<ExecutionContext, "id">) {
  const { context, updateContext, previousStore, removeContext } = useExecutionContext(id)
  const [isWaitingToTranspile, setIsWaitingToTranspile] = React.useState(false)
  const [isRunning, setIsRunning] = React.useState(false)
  const transpileRef = React.useRef<NodeJS.Timeout>()
  React.useEffect(() => {
    if (context.displayedHasTranspiled) return
    if (!isWaitingToTranspile) setIsWaitingToTranspile(true)
    const timeout = setTimeout(() => {
      console.log("transpile")
      const transpiledContent = transpile(context.displayedContent, previousStore)
      console.log({
        displayedContent: context.displayedContent,
        transpiledContent,
      })
      updateContext(context => ({
        ...context,
        displayedHasTranspiled: true,
        transpiledContent
      }))
      setIsWaitingToTranspile(false)
    }, 3_000)
    transpileRef.current = timeout
    return () => clearTimeout(timeout)
  }, [context.displayedContent])
  function updateExecutionContext(event: React.ChangeEvent<HTMLTextAreaElement>) {
    updateContext(context => ({
      ...context,
      displayedContent: event.target.value,
      displayedHasTranspiled: false,
    }))
  }
  async function runContext() {
    if (isRunning) return
    try {
      setIsRunning(true)
      console.log("run context")
      let transpiledContent = context.transpiledContent
      if (!context.displayedHasTranspiled) {
        transpileRef.current && clearTimeout(transpileRef.current)
        transpiledContent = transpile(context.displayedContent, previousStore)
      }
      if (isWaitingToTranspile) setIsWaitingToTranspile(false)

      const { result, duration, newStore } = await runTranspiled(transpiledContent, previousStore)
      updateContext(context => ({
        ...context,
        displayedHasTranspiled: true,
        transpiledHasRan: true,
        transpiledContent,
        store: newStore,
        lastRun: {
          date: new Date(),
          duration,
          result
        }
      }))
    } catch (error) {
      console.error(error)
    } finally {
      setIsRunning(false)
    }
  }
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && event.metaKey) {
      event.preventDefault()
      runContext()
      return
    }
    if (event.key === 'Backspace' && context.displayedContent === '') {
      event.preventDefault()
      removeContext()
      return
    }
    const textarea = event.target as HTMLTextAreaElement
    if (event.key === 'Tab') {
      event.preventDefault()
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value
      textarea.value = value.substring(0, start) + '\t' + value.substring(end)
      textarea.selectionStart = textarea.selectionEnd = start + 1
    }
    if (event.key === '/' && event.metaKey && event.shiftKey) {
      event.preventDefault()
      const selectionStart = textarea.selectionStart
      const selectionEnd = textarea.selectionEnd
      const value = textarea.value
      const start = value.lastIndexOf('\n', selectionStart - 1) + 1
      const _end = value.indexOf('\n', selectionEnd)
      const end = _end === -1 ? value.length : _end
      console.log({
        selectionStart,
        selectionEnd,
        start,
        end,
      })
      textarea.value = value.substring(0, start) + '/* ' + value.substring(start, end) + ' */' + value.substring(end)
      textarea.selectionStart = textarea.selectionEnd = end + 4
    }
    updateContext(context => ({
      ...context,
      displayedContent: textarea.value,
      displayedHasTranspiled: false,
    }))
  }
  return (
    <Card className={cn(isRunning && 'pointer-events-none')}>
      <CardHeader>
        <div className="w-full flex justify-between items-center">
          <span>#{context.id.slice(0, 8)}</span>
          <div className='flex gap-2 items-center'>
            {isWaitingToTranspile ? (
              <Button size="icon-sm" variant="outline" title='Transpiling' className='animate-pulse'>
                <Hammer size={16} />
              </Button>
            ) : isRunning ? (
              <Button size="icon-sm" variant="outline" title='Transpiling'>
                <CircleDotDashed size={16} className='animate-spin' />
              </Button>
            ) : null}
            <Button onClick={runContext} size="sm" disabled={isRunning}>
              Run Context
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={context.displayedContent}
          spellCheck={false}
          autoCorrect='off'
          autoComplete='off'
          onChange={updateExecutionContext}
          onKeyDown={handleKeyDown}
          placeholder='Press ⌘+Enter to run context, Tab to indent and Backspace to delete an empty context'
        />
      </CardContent>
      {context.lastRun ? (
        <>
          <CardFooter>
            <div className="w-full grid grid-cols-1">
              <span className="text-xs text-muted">
                {context.lastRun.duration}ms on {displayDate(context.lastRun.date)}
              </span>
              <pre className="text-xs mt-1">
                {context.lastRun.result}
              </pre>
            </div>
          </CardFooter>
        </>
      ) : null}
    </Card>
  )
}
function AddExecutionContextButton() {
  const { project, updateProject } = useProject()
  function addExecutionContext() {
    const newContext: ExecutionContext = {
      id: crypto.randomUUID(),
      displayedContent: "",
      displayedHasTranspiled: true,
      transpiledContent: "",
      transpiledHasRan: false,
      lastRun: null
    }
    updateProject({
      ...project,
      contexts: [...project.contexts, newContext]
    })
  }
  return (
    <div className="w-full flex justify-center items-center">
      <Button onClick={addExecutionContext}>
        Add Context
      </Button>
    </div>
  )
}
function ExecutionContextList() {
  const { project } = useProject()
  return (
    <div className='grid grid-cols-1 gap-6'>
      {project.contexts.map(context => (
        <ExecutionContextItem {...context} key={context.id} />
      ))}
      <AddExecutionContextButton />
      <div className="w-full h-16">&nbsp;</div>
    </div>
  )

}


function App() {
  return (
    <ThemeProvider defaultTheme='dark' storageKey="vite-ui-theme">
      <ProjectProvider>
        <div className="w-screen min-h-screen ">
          <Header />
          <div className='w-screen max-w-lg mx-auto mt-4 px-5'>
            <ExecutionContextList />
          </div>
        </div>
      </ProjectProvider>
    </ThemeProvider>
  )
}

export default App


/**
 * 
 * 
 * 
 * Utils
 * 
 * 
 * 
 */
function quit(message?: string): never {
  if (message) {
    console.log(`Quit: ${message}`)
  }
  throw new Error(message)
}
function hasId<T extends { id: string }>(item: T, id: string): boolean {
  return item.id === id
}
function findId<T extends { id: string }>(array: T[], id: string): T | undefined {
  return array.find(item => hasId(item, id))
}
function displayDate(date: Date | string | number) {
  return Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  }).format(new Date(date))
}
function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
type types = {
  string: string,
  number: number,
  boolean: boolean,
  object: object,
  function: Function,
  symbol: symbol,
  bigint: bigint,
  undefined: undefined,
  null: null,
}
const typeStrings = {
  string: "string",
  number: "number",
  boolean: "boolean",
  object: "object",
  function: "function",
  symbol: "symbol",
  bigint: "bigint",
  undefined: "undefined",
  null: "object",
} as const
function is<T extends keyof types>(value: unknown, type: T): value is types[T] {
  if (type === 'null') return value === null
  return typeof value === typeStrings[type]
}