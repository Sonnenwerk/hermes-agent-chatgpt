import { describe, expect, it } from 'vitest'

import { normalizeLogEntries } from './log-lines'

describe('normalizeLogEntries', () => {
  it('uses backend metadata when available', () => {
    const entries = normalizeLogEntries({
      file: 'agent',
      lines: ['raw'],
      entries: [
        {
          explicit_level: 'ERROR',
          level: 'ERROR',
          logger: 'gateway.run',
          text: 'friendly',
          timestamp: '2026-09-23 22:00:00'
        }
      ]
    })

    expect(entries[0]).toMatchObject({
      explicitLevel: 'ERROR',
      level: 'ERROR',
      logger: 'gateway.run',
      text: 'friendly'
    })
  })

  it('inherits severity for multiline tracebacks on older backends', () => {
    const entries = normalizeLogEntries({
      file: 'agent',
      lines: [
        '2026-09-23 22:00:00 ERROR gateway.run: failed\n',
        'Traceback (most recent call last):\n',
        '  File "gateway.py", line 4\n'
      ]
    })

    expect(entries.map(entry => entry.level)).toEqual(['ERROR', 'ERROR', 'ERROR'])
    expect(entries[1].explicitLevel).toBeNull()
  })

  it('resets inherited severity on a new timestamped raw record', () => {
    const entries = normalizeLogEntries({
      file: 'agent',
      lines: ['2026-09-23 22:00:00 WARNING x: slow', 'continued', '2026-09-23 22:00:01 raw', 'continued raw']
    })

    expect(entries.map(entry => entry.level)).toEqual(['WARNING', 'WARNING', null, null])
  })
})
