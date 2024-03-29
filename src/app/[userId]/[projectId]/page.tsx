"use client";
/**
 * 
 * 
 * Project Context
 * 
 * 
 */
import * as React from "react"
import ReactDOM from "react-dom"
/**
 * Runner functions
 */
import ts from "typescript"
import * as esprima from "esprima"
const TS_HELPERS_END = '/* ------- ts helpers ends here ------- */\n'
function transpile(source: string, previousStore: Record<string, unknown> = {}): string {
  console.log('transpile', previousStore)
  const oldStoreKeys = Object.keys(previousStore).map(key => `var ${key};`).join('\n')
  const output = ts.transpile(`
    /* typescript helpers */
    const ______________________________ = void 0;
    ${TS_HELPERS_END}
    ${oldStoreKeys}
    ${source}
    `, {
    forceConsistentCasingInFileNames: true,
    allowSyntheticDefaultImports: true,
    noImplicitAny: true,
    strict: false,
    pretty: true,
    esModuleInterop: false,
    importHelpers: false,
    noEmitHelpers: false,
    removeComments: false,
  })
  return output.split(oldStoreKeys).join('')
}


const AsyncFunction = async function () { }.constructor;
async function runTranspiled(source: string, previousStore: Record<string, unknown> = {}, packages: Project["packages"] = []) {
  console.log(source)
  const textToAnalyse = "(async function() {\n" + source.slice(Math.max(0, source.indexOf(TS_HELPERS_END) + TS_HELPERS_END.length)) + "})"
  console.log(textToAnalyse)
  const analysis = (esprima.parseScript(textToAnalyse, {
    tolerant: true,
    loc: true,
  }).body[0] as unknown as { expression: { body: ReturnType<typeof esprima.parseScript> } }).expression.body
  console.log({ analysis, source })
  const variables = analysis.body.filter(node => ['FunctionDeclaration', 'VariableDeclaration', 'VariableDeclarator'].includes(node.type))
  console.log({ variables })
  const requires = [] as {
    type: "CallExpression";
    callee: {
      name: "require";
      loc: {
        start: { line: number; column: number; };
        end: { line: number; column: number; };
      }
    };
    arguments: {
      type: "Literal";
      value: string;
      loc: {
        start: { line: number; column: number; };
        end: { line: number; column: number; };
      };
    }[];
  }[]
  const variableNames = variables.flatMap(node => {
    if (node.type === 'FunctionDeclaration') return node.id.name
    if (node.type === 'VariableDeclaration') {
      return node.declarations.flatMap(({ id, init }) => {
        if (id.type === 'Identifier') {
          if (
            init?.type === 'CallExpression'
            && init.callee.type === 'Identifier'
            && init.callee.name === 'require'
            && init.callee.loc
            && init.arguments[0].type === 'Literal'
          ) {
            requires.unshift(init as typeof requires[0])
          }
          return id.name
        }
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
  console.log({ variableNames, requires })

  let updatedSource = source
  const evictedChars = Math.max(0, source.indexOf(TS_HELPERS_END) + TS_HELPERS_END.length)
  const updatedSourceLines = ('\n' + source.slice(evictedChars)).split('\n')
  function getIndexFromLoc(lines: string[], loc: { line: number, column: number }) {
    let store = 0
    for (let i = 0; i < loc.line - 1; i++) {
      store += lines[i].length
    }
    return store + loc.column
  }
  for (const { arguments: [arg], callee } of requires) {
    const start = evictedChars + getIndexFromLoc(updatedSourceLines, callee.loc.start)
    const end = evictedChars + getIndexFromLoc(updatedSourceLines, arg.loc.end)
    const packagePath = packages.find(pkg => pkg.name === arg.value)?.url ?? arg.value// packages.map(pkg => pkg.entrypoints?.find(entrypoint => entrypoint.name === arg.value)).filter(Boolean)[0]?.value ?? arg.value
    updatedSource = updatedSource.slice(0, start) + `await import('${packagePath}').then(_$=> _$.__esModule ? _$.default : _$)` + updatedSource.slice(end + 2)
  }
  console.log(updatedSource)

  console.log("creating function")
  const fn = AsyncFunction('store', 'exports', 'module', ...Object.keys(previousStore), `
    const console = new Proxy({}, {
      get: (target, prop) => (...args) => window.nodebook_logs.push(...args)
    });
    return await (async function(){
      const start = Date.now()
      try {
        ${updatedSource}
        ${variableNames.map(name => `store.${name} = ${name}`).join('\n')}
      } catch (error) {
        console.error(error)
      }
      const duration = Date.now() - start
      return duration
    })()
  `)
  console.log("running function")
  const newStore: Record<string, unknown> = {}
  const duration: number = await fn(newStore, {}, {}, ...Object.values(previousStore))
  console.log("function ran")
  const runLogs = window.nodebook_logs.splice(0)
  const logLines = runLogs.flatMap(log => {
    try {
      console.log({ log })
      if (is(log, 'undefined') || is(log, 'null')) return ""
      if (is(log, 'object') && log?.constructor?.name === 'Object') return JSON.stringify(log, null, 2).split('\n')
      return (log as object).toString?.().split('\n') ?? []
    } catch (error) {
      console.error(`Error while parsing log: ${log}`)
      return []
    }
  })
  if (logLines.length) logLines.unshift('> ')
  const logs = logLines.join('\n')
  console.log({ logs, newStore, duration })
  return {
    result: logs,
    newStore,
    duration
  }
}

/**
 * 
 * Components
 */
import Editor, { useMonaco } from "@monaco-editor/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from '@/components/ui/input';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CircleDotDashed, Download, Hammer, Package, Upload, ChevronDown, X } from 'lucide-react';
import { cn, displayDate, is, wait } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ExecutionContext, Project, addScript, hasPackage, useExecutionContext, usePackage, useProject } from "@/contexts/project";
import Title from "@/components/system/title";
function PackageManagerItem({ name }: Pick<Project["packages"][0], "name">) {
  const { pkg, removePackage } = usePackage(name);
  const [displayedUrl, setDisplayedUrl] = React.useState(pkg.url)
  function updateDisplayedUrl(event: React.ChangeEvent<HTMLInputElement>) {
    setDisplayedUrl(event.target.value)
  }
  return (
    <Collapsible>
      <div className='flex items-center gap-4 mb-2'>
        <Input type="text" value={pkg.name} className='border-none' autoFocus={false} />
        <CollapsibleTrigger>
          <Button size="icon-sm" variant="outline">
            <ChevronDown size={16} />
          </Button>
        </CollapsibleTrigger>
        <Button size="icon-sm" className='shrink-0' variant="outline" onClick={removePackage}>
          <X size={16} />
        </Button>
      </div>
      <CollapsibleContent>
        <Input type="url" value={displayedUrl} onChange={updateDisplayedUrl} />
      </CollapsibleContent>
    </Collapsible>
  )
}
interface PackageQueryResult {
  type: string
  name: string
  tags: Record<string, string>
  versions: {
    version: string
    links: {
      self: string
      entrypoints: string
      stats: string
    }
  }[]
  links: {
    stats: string
  }
}
function AddPackageButton() {
  const { project, updateProject } = useProject()
  const [input, setInput] = React.useState('')
  const [open, setOpen] = React.useState(false)
  const [packageName, setPackageName] = React.useState('')
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setPackageName(input)
    }, 200)
    return () => clearTimeout(timeout)
  }, [input])
  const packages = useQuery({
    queryKey: ['packages', packageName],
    async queryFn({ queryKey: [, search] }) {
      const response = await fetch(`https://data.jsdelivr.com/v1/packages/npm/${search}`)
      const data = await response.json() as PackageQueryResult
      if (data.type !== 'npm') return null
      return data
    }
  })
  const deferredPackages = React.useDeferredValue(packages.data)
  function addPackage(name: string, version: string, url: string) {
    return async function () {
      if (await hasPackage(name, version)) return setOpen(false)
      // const entrypointsResponse = await fetch(`https://data.jsdelivr.com/v1/packages/npm/${name}@${version}/entrypoints`)
      // const data = await entrypointsResponse.json() as { entrypoints: { [key: string]: { file: string } } }
      // const entrypoints = Object.entries(data.entrypoints).map(([key, { file }]) => [name + (key === 'js' ? '' : '/' + key), version, url + file])
      const entrypoints = [[name, version, url]]
      await Promise.all(entrypoints.map(([name, version, url]) => addScript(name, version, url).catch(() => { })))
      updateProject({
        ...project,
        packages: [...project.packages, { name, version, url, entrypoints: entrypoints.map(([name, , value]) => ({ name, value })) }]
      })
      setOpen(false)
    }
  }
  function updateInput(event: React.ChangeEvent<HTMLInputElement>) {
    setInput(event.target.value)
  }
  React.useEffect(() => {
    if (open) return
    setInput('')
    setPackageName('')
  }, [open])
  return (
    <div className="w-full flex justify-center items-center">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            Add Package
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Package</DialogTitle>
            <DialogDescription asChild>
              <p className="text-sm text-muted">
                Add external packages to your project
              </p>
            </DialogDescription>
          </DialogHeader>
          <div>
            <Popover open={!!deferredPackages?.versions}>
              <PopoverTrigger>
                <Input type="text" placeholder="Package name" className='mb-2' value={input} onInput={updateInput} />
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="start">
                {deferredPackages?.versions ? (
                  <Command>
                    <CommandInput placeholder="Search version..." />
                    <CommandEmpty>No version found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="max-h-96">
                        {deferredPackages?.versions?.slice(0, 10).map(version => (
                          <CommandItem
                            key={version.version}
                            value={version.version}
                            onSelect={addPackage(packageName, version.version, `https://cdn.jsdelivr.net/npm/${packageName}@${version.version}/+esm`)}
                          >
                            {packageName}@{version.version}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </Command>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
function PackageManager() {
  const { project } = useProject()
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button size="icon-sm">
          <Package size={16} />
        </Button>
      </SheetTrigger>
      <SheetContent onOpenAutoFocus={e => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>External Packages</SheetTitle>
          <SheetDescription>
            <p className="text-sm text-muted">
              Add external packages to your project
            </p>
          </SheetDescription>
          <div className='grid grid-cols-1 gap-3'>
            {project.packages.map(pkg => (
              <PackageManagerItem key={pkg.name} name={pkg.name} />
            ))}
            <AddPackageButton />
            <div className="w-full h-16">&nbsp;</div>
          </div>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  )
}
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
    a.download = `${"project.name"}.json`
    a.click()
  }
  function renameProject(event: React.ChangeEvent<HTMLInputElement>) {
    console.log("rename project", event.target.value)
  }
  return (
    <div className='w-full'>
      <div className='py-6 px-5 flex justify-between items-center gap-5 shrink-0'>
        <div className="flex items-center">
          <Title variant="h5">/</Title>
          <Input
            type="text"
            autoComplete='off'
            onChange={renameProject}
            value={"project.name"}
            placeholder='Project name'
            className='max-w-xs border-none shrink-0 ml-3'
          />
        </div>
        <div className="grid grid-cols-3 gap-4 shrink-0">
          <PackageManager />
          <Button onClick={importProject} size="icon-sm">
            <Upload size={16} />
          </Button>
          <Button onClick={exportProject} size="icon-sm">
            <Download size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
function ExecutionContextItem({ id }: Pick<ExecutionContext, "id">) {
  const { project } = useProject()
  const { context, updateContext, previousStore, removeContext } = useExecutionContext(id)
  const [isWaitingToTranspile, setIsWaitingToTranspile] = React.useState(false)
  const [isRunning, setIsRunning] = React.useState(false)
  const transpileRef = React.useRef<NodeJS.Timeout>()
  const shadowRef = React.useRef<HTMLSpanElement>(null)
  const [height, setHeight] = React.useState<number>()
  const monaco = useMonaco()
  React.useEffect(() => {
    const shadowTextArea = shadowRef.current
    if (!shadowTextArea) return
    shadowTextArea.textContent = context.displayedContent
    const currentHeight = shadowTextArea.getBoundingClientRect().height
    if (currentHeight !== height) setHeight(currentHeight)
  }, [context.displayedContent])
  React.useEffect(() => {
    if (!monaco) return
    const opts = monaco.languages.typescript.typescriptDefaults.getCompilerOptions()
    opts.paths = {
      ...opts.paths ?? {},
      ...Object.fromEntries(project.packages.map(pkg => [pkg.name, [pkg.url]]))
    }
    opts.moduleResolution = 2
    opts.allowJs = true
    opts.module = 99

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(opts)
  }, [monaco])
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
    }, 300)
    transpileRef.current = timeout
    return () => clearTimeout(timeout)
  }, [context.displayedContent])
  function updateExecutionContext(content: string = "") {
    updateContext(context => ({
      ...context,
      displayedContent: content,
      displayedHasTranspiled: false,
    }))
  }
  async function runContext() {
    if (isRunning) return
    const minimumTime = wait(1_000)
    try {
      setIsRunning(true)
      console.log("run context")
      let transpiledContent = context.transpiledContent
      if (!context.displayedHasTranspiled) {
        transpileRef.current && clearTimeout(transpileRef.current)
        transpiledContent = transpile(context.displayedContent, previousStore)
      }
      if (isWaitingToTranspile) setIsWaitingToTranspile(false)

      const { result, duration, newStore } = await runTranspiled(transpiledContent, previousStore, project.packages)
      await minimumTime
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
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' && event.metaKey) {
      event.stopPropagation()
      event.preventDefault()
      runContext()
      return
    }
    if (event.key === 'Backspace' && context.displayedContent === '') {
      event.stopPropagation()
      event.preventDefault()
      removeContext()
      return
    }
    const textarea = event.target as HTMLTextAreaElement
    if (event.key === '/' && event.metaKey && event.shiftKey) {
      event.stopPropagation()
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
      updateContext(context => ({
        ...context,
        displayedContent: textarea.value,
        displayedHasTranspiled: false,
      }))
    }
  }
  function renameContext(event: React.ChangeEvent<HTMLInputElement>) {
    updateContext(context => ({
      ...context,
      name: event.target.value
    }))
  }
  return (
    <Card className={cn(isRunning && '_pointer-events-none')}>
      <CardHeader>
        <div className="w-full flex justify-between items-center">
          <Input type="text" value={context.name ?? `#${context.id.slice(0, 8)}`} onChange={renameContext} className='border-none' autoFocus={false} />
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
              {isRunning ? "Running" : "Run Context"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative" onKeyDownCapture={handleKeyDown}>
          <Editor
            height={Math.max(height ?? 64, 64)}
            language="typescript"
            theme="vs-dark"
            onChange={updateExecutionContext}
            value={context.displayedContent ?? '// Press ⌘+Enter to run context, Tab to indent and Backspace to delete an empty context'}
            options={{
              formatOnType: true,

            }}
            path={`${context.id}.ts`}
            className='!bg-none'
          />
          {/* <Textarea
            value={context.displayedContent}
            spellCheck={false}
            autoCorrect='off'
            autoComplete='off'
            onChange={updateExecutionContext}
            onKeyDown={handleKeyDown}
            style={{ height }}
            placeholder='Press ⌘+Enter to run context, Tab to indent and Backspace to delete an empty context'
          /> */}
          <span ref={shadowRef} className='absolute bg-green-500 top-0 left-0 roght-0 px-3 py-2 text-xs whitespace-pre-wrap opacity-0 -z-50' />
        </div>
      </CardContent>
      {context.lastRun ? (
        <>
          <CardFooter>
            <div className="w-full grid grid-cols-1">
              <span className="text-xs text-muted">
                {context.lastRun.duration}ms on {displayDate(context.lastRun.date)}
              </span>
              {context.lastRun.result ? (
                <pre className="text-xs mt-1 whitespace-pre-wrap">
                  {context.lastRun.result}
                </pre>
              ) : null}
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
  const { project } = useProject()
  const [queryClient] = React.useState(() => new QueryClient())
  React.useEffect(() => {
    window.nodebook_logs ??= (() => {
      const a = [] as unknown[]
      a.push = function (...args) {
        console.log(...args)
        return Array.prototype.push.apply(this, args)
      }
      return a
    })()
  }, [])
  const HeaderPortal = React.useCallback(() => {
    if (!("window" in globalThis)) return <></>
    const element = document.querySelector('header #actions')
    if (!element) return <></>
    return ReactDOM.createPortal(<Header />, element)
  }, [project])
  return (
    <QueryClientProvider client={queryClient}>
      <HeaderPortal />
      <div className='w-screen max-w-4xl mx-auto mt-4 px-5'>
        <ExecutionContextList />
      </div>
    </QueryClientProvider>
  )
}

export default App

declare global {
  interface Window {
    nodebook_logs: unknown[];
  }
}