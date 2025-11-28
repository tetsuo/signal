import { describe, it, expect } from 'vitest'
import Graph from './Graph'

describe('Graph', () => {
  it('batch(fn) wraps begin/endBatch correctly', () => {
    const g = new Graph()
    const s = g.signal(1)
    let computedRuns = 0

    const c = g.computed(() => {
      computedRuns++
      return s.get() + 1
    })

    expect(c.get()).toBe(2)
    expect(computedRuns).toBe(1)

    g.batch(() => {
      s.set(2)
      s.set(3)
    })

    expect(c.get()).toBe(4)
    expect(computedRuns).toBe(2)
  })

  it('schedules async flush with custom scheduler', async () => {
    const called = []
    const g = new Graph({
      asyncFlush: true,
      scheduler: cb => {
        called.push('scheduled')
        cb()
      }
    })

    const s = g.signal(1)
    let count = 0
    g.reaction(() => {
      s.get()
      count++
    })

    expect(count).toBe(1)

    s.set(2)
    expect(count).toBe(2)
    expect(called).toContain('scheduled')
  })

  it('uses injected async scheduler to flush reactions', async () => {
    let scheduledFn
    const g = new Graph({
      asyncFlush: true,
      scheduler: cb => {
        scheduledFn = cb
      }
    })

    const s = g.signal(1)
    const log = []

    g.reaction(() => {
      log.push(s.get())
    })

    expect(log).toEqual([1])

    // Trigger an update
    s.set(2)

    // The scheduler should now hold the reaction flush
    expect(typeof scheduledFn).toBe('function')
    expect(log).toEqual([1]) // still not flushed

    // Run the scheduled callback manually
    scheduledFn()

    expect(log).toEqual([1, 2]) // reaction ran
  })

  it('uses queueMicrotask as default async scheduler', async () => {
    const flushed = []

    const g = new Graph({ asyncFlush: true })

    const s = g.signal(1)

    g.reaction(() => {
      flushed.push(s.get())
    })

    expect(flushed).toEqual([1])

    // This triggers a change outside a batch
    s.set(2)

    expect(flushed).toEqual([1]) // not flushed yet

    // Let the microtask queue flush
    await Promise.resolve()

    expect(flushed).toEqual([1, 2])
  })

  it('skips async flush if new batch started before flush runs', async () => {
    let scheduledFn
    const g = new Graph({
      asyncFlush: true,
      scheduler: cb => {
        scheduledFn = cb
      }
    })

    const s = g.signal(1)
    const log = []

    g.reaction(() => {
      log.push(s.get())
    })

    expect(log).toEqual([1])

    // Trigger update; schedules async flush
    s.set(2)
    expect(log).toEqual([1])

    // Start a new batch BEFORE the scheduled flush runs
    g.beginBatch()

    // Now run the scheduled flush; should skip because we're in a batch
    scheduledFn()

    expect(log).toEqual([1]) // still not flushed

    // End the batch; now it should flush
    g.endBatch()

    // Run the newly scheduled flush
    scheduledFn()

    expect(log).toEqual([1, 2])
  })

  it('throws error when max computed flush iterations exceeded', () => {
    const g = new Graph()
    const s = g.signal(0)

    // Create two computeds that mark each other dirty in a loop
    // c1 recomputes -> marks c2 dirty -> c2 recomputes -> marks c1 dirty -> ...
    let c1, c2

    c1 = g.computed(() => {
      const val = s.get()
      if (c2 && c2._observers.size > 0) {
        c2._isDirty = true
        g._dirtyComputeds.add(c2)
      }
      return val
    })

    c2 = g.computed(() => {
      const val = c1.get()
      if (c1._observers.size > 0) {
        c1._isDirty = true
        g._dirtyComputeds.add(c1)
      }
      return val
    })

    // Set up observer so both computeds stay active
    g.reaction(() => c2.get())

    // This should eventually throw due to c1 <-> c2 ping-pong
    expect(() => {
      s.set(1)
    }).toThrow('Maximum computed flush iterations exceeded')
  })
})
