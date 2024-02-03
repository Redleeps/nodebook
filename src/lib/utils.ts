import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function quit(message?: string): never {
  if (message) {
    console.log(`Quit: ${message}`)
  }
  throw new Error(message)
}
export function hasId<T extends { id: string }>(item: T, id: string): boolean {
  return item.id === id
}
export function findId<T extends { id: string }>(array: T[], id: string): T | undefined {
  return array.find(item => hasId(item, id))
}
export function displayDate(date: Date | string | number) {
  return Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric"
  }).format(new Date(date))
}
export function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
type types = {
  string: string,
  number: number,
  boolean: boolean,
  object: object,
  function: (...args: unknown[]) => unknown,
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
export function is<T extends keyof types>(value: unknown, type: T): value is types[T] {
  if (type === 'null') return value === null
  return typeof value === typeStrings[type]
}