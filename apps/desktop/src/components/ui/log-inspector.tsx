import { type ReactNode, useEffect, useMemo, useRef } from 'react'

import { CopyButton } from '@/components/ui/copy-button'
import { Button } from '@/components/ui/button'
import { Tip } from '@/components/ui/tooltip'
import { AlertCircle, AlertTriangle, ArrowUp, ChevronDown, CircleIcon, Info } from '@/lib/icons'
import { type LogDisplayEntry, logEntryMatches } from '@/lib/log-lines'
import { cn } from '@/lib/utils'

interface LogInspectorProps {
  entries: LogDisplayEntry[]
  emptyLabel: string
  labels: {
    bottom: string
    pageDown: string
    pageUp: string
    top: string
  }
  loading?: boolean
  query: string
}

function severityPresentation(entry: LogDisplayEntry) {
  switch (entry.level) {
    case 'CRITICAL':
      return {
        icon: AlertCircle,
        iconClass: 'text-red-600',
        rowClass: 'bg-red-500/[0.08]',
        label: 'CRITICAL'
      }
    case 'ERROR':
      return {
        icon: AlertCircle,
        iconClass: 'text-red-500',
        rowClass: 'bg-red-500/[0.05]',
        label: 'ERROR'
      }
    case 'WARNING':
      return {
        icon: AlertTriangle,
        iconClass: 'text-amber-500',
        rowClass: 'bg-amber-500/[0.04]',
        label: 'WARNING'
      }
    case 'INFO':
      return {
        icon: Info,
        iconClass: 'text-sky-500',
        rowClass: '',
        label: 'INFO'
      }
    case 'DEBUG':
      return {
        icon: CircleIcon,
        iconClass: 'text-(--ui-text-tertiary)',
        rowClass: '',
        label: 'DEBUG'
      }
    default:
      return {
        icon: CircleIcon,
        iconClass: 'text-(--ui-text-tertiary)/35',
        rowClass: '',
        label: 'LOG'
      }
  }
}

function highlightedText(text: string, query: string): ReactNode {
  const needle = query.trim()

  if (!needle) {
    return text
  }

  const lowerText = text.toLocaleLowerCase()
  const lowerNeedle = needle.toLocaleLowerCase()
  const parts: ReactNode[] = []
  let cursor = 0
  let matchIndex = lowerText.indexOf(lowerNeedle)

  while (matchIndex >= 0) {
    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex))
    }

    parts.push(
      <mark
        className="rounded-[2px] bg-yellow-300/80 px-px text-black"
        key={`match-${matchIndex}`}
      >
        {text.slice(matchIndex, matchIndex + needle.length)}
      </mark>
    )

    cursor = matchIndex + needle.length
    matchIndex = lowerText.indexOf(lowerNeedle, cursor)
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor))
  }

  return parts.length ? parts : text
}

export function LogInspector({ emptyLabel, entries, labels, loading = false, query }: LogInspectorProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const stickRef = useRef(true)

  const matchLines = useMemo(() => {
    if (!query.trim()) {
      return new Set<number>()
    }

    return new Set(entries.filter(entry => logEntryMatches(entry, query)).map(entry => entry.line))
  }, [entries, query])

  useEffect(() => {
    const el = scrollRef.current

    if (el && stickRef.current && !query.trim()) {
      el.scrollTop = el.scrollHeight
    }
  }, [entries, query])

  useEffect(() => {
    const el = scrollRef.current

    if (!el || !query.trim()) {
      return
    }

    const firstMatch = el.querySelector<HTMLElement>('[data-log-match="true"]')
    firstMatch?.scrollIntoView({ block: 'center' })
  }, [query])

  const scrollTo = (target: 'bottom' | 'pageDown' | 'pageUp' | 'top') => {
    const el = scrollRef.current

    if (!el) {
      return
    }

    if (target === 'top') {
      el.scrollTo({ top: 0, behavior: 'smooth' })
      stickRef.current = false
      return
    }

    if (target === 'bottom') {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      stickRef.current = true
      return
    }

    const amount = Math.max(80, Math.round(el.clientHeight * 0.85))
    el.scrollBy({ top: target === 'pageUp' ? -amount : amount, behavior: 'smooth' })
    stickRef.current = false
  }

  return (
    <div className="group/logs relative flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-(--ui-stroke-tertiary) bg-(--ui-bg-quinary)">
      <div className="absolute right-2 top-1.5 z-20 flex items-center gap-0.5 rounded-md bg-(--ui-bg-quinary)/90 p-0.5 opacity-20 shadow-sm backdrop-blur-sm transition-opacity group-hover/logs:opacity-100 focus-within:opacity-100">
        <NavButton label={labels.top} onClick={() => scrollTo('top')}>
          <ArrowUp className="size-3" />
        </NavButton>
        <NavButton label={labels.pageUp} onClick={() => scrollTo('pageUp')}>
          <ChevronDown className="size-3 rotate-180" />
        </NavButton>
        <NavButton label={labels.pageDown} onClick={() => scrollTo('pageDown')}>
          <ChevronDown className="size-3" />
        </NavButton>
        <NavButton label={labels.bottom} onClick={() => scrollTo('bottom')}>
          <ArrowUp className="size-3 rotate-180" />
        </NavButton>
        <CopyButton
          appearance="inline"
          className="h-5 gap-0 rounded-md px-1"
          iconClassName="size-3"
          showLabel={false}
          text={() => entries.map(entry => entry.text).join('\n')}
        />
      </div>

      <div
        className="h-full min-h-0 overflow-y-auto py-1 [scrollbar-gutter:stable]"
        data-selectable-text="true"
        onScroll={event => {
          const el = event.currentTarget
          stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
        }}
        ref={scrollRef}
        tabIndex={0}
        onKeyDown={event => {
          if (event.key === 'Home') {
            event.preventDefault()
            scrollTo('top')
          } else if (event.key === 'End') {
            event.preventDefault()
            scrollTo('bottom')
          } else if (event.key === 'PageUp') {
            event.preventDefault()
            scrollTo('pageUp')
          } else if (event.key === 'PageDown') {
            event.preventDefault()
            scrollTo('pageDown')
          }
        }}
      >
        {loading && entries.length === 0 ? (
          <p className="px-2 py-1.5 font-mono text-[0.7rem] leading-relaxed text-muted-foreground/50">…</p>
        ) : entries.length === 0 ? (
          <p className="px-2 py-1.5 font-mono text-[0.7rem] leading-relaxed text-muted-foreground/50">
            {emptyLabel}
          </p>
        ) : (
          <div className="min-w-max py-0.5 font-mono text-[0.6875rem] leading-[1.5] text-(--ui-text-secondary)">
            {entries.map(entry => {
              const severity = severityPresentation(entry)
              const SeverityIcon = severity.icon
              const matched = matchLines.has(entry.line)

              return (
                <div
                  className={cn(
                    'grid grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-1.5 px-2 py-px',
                    'hover:bg-(--chrome-action-hover)',
                    severity.rowClass
                  )}
                  data-log-match={matched ? 'true' : undefined}
                  key={entry.line}
                  title={entry.logger ? `${severity.label} · ${entry.logger}` : severity.label}
                >
                  <span
                    aria-label={severity.label}
                    className={cn(
                      'mt-[0.16rem] inline-flex size-4 items-center justify-center',
                      severity.iconClass,
                      entry.explicitLevel ? 'opacity-100' : 'opacity-55'
                    )}
                  >
                    <SeverityIcon className="size-3.5" />
                  </span>
                  <span className="whitespace-pre-wrap break-words pr-24">
                    {highlightedText(entry.text, query)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function NavButton({ children, label, onClick }: { children: ReactNode; label: string; onClick: () => void }) {
  return (
    <Tip label={label}>
      <Button aria-label={label} className="h-5 w-5" onClick={onClick} size="icon-xs" type="button" variant="ghost">
        {children}
      </Button>
    </Tip>
  )
}
