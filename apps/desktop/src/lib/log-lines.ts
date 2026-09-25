import type { LogsResponse } from '@/types/hermes'

export type LogSeverity = 'CRITICAL' | 'DEBUG' | 'ERROR' | 'INFO' | 'WARNING'

export interface LogDisplayEntry {
  explicitLevel: null | LogSeverity
  level: null | LogSeverity
  line: number
  logger: null | string
  text: string
  timestamp: null | string
}

const LEVEL_RE = /\s(DEBUG|INFO|WARNING|ERROR|CRITICAL)\s/
const TIMESTAMP_RE = /^(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/
const LOGGER_RE = /\s(?:DEBUG|INFO|WARNING|ERROR|CRITICAL)(?:\s+\[.*?\])?\s+(\S+):/

function severity(value: unknown): null | LogSeverity {
  return value === 'DEBUG' || value === 'INFO' || value === 'WARNING' || value === 'ERROR' || value === 'CRITICAL'
    ? value
    : null
}

function fallbackEntries(lines: string[]): LogDisplayEntry[] {
  let inherited: null | LogSeverity = null

  return lines.map((raw, index) => {
    const levelMatch = LEVEL_RE.exec(raw)
    const timestampMatch = TIMESTAMP_RE.exec(raw)
    const explicitLevel = severity(levelMatch?.[1])

    if (explicitLevel) {
      inherited = explicitLevel
    } else if (timestampMatch) {
      inherited = null
    }

    return {
      explicitLevel,
      level: explicitLevel ?? inherited,
      line: index,
      logger: LOGGER_RE.exec(raw)?.[1] ?? null,
      text: raw.replace(/[\r\n]+$/, ''),
      timestamp: timestampMatch?.[1] ?? null
    }
  })
}

/**
 * Prefer backend-authored log metadata, but keep the desktop compatible with
 * older Hermes runtimes that only return raw lines.
 */
export function normalizeLogEntries(response: LogsResponse): LogDisplayEntry[] {
  if (!response.entries || response.entries.length !== response.lines.length) {
    return fallbackEntries(response.lines)
  }

  return response.entries.map((entry, index) => ({
    explicitLevel: severity(entry.explicit_level),
    level: severity(entry.level),
    line: index,
    logger: entry.logger ?? null,
    text: entry.text,
    timestamp: entry.timestamp ?? null
  }))
}

export function logEntryMatches(entry: LogDisplayEntry, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase()

  return needle.length === 0 || entry.text.toLocaleLowerCase().includes(needle)
}
