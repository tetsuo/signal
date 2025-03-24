import { describe, it, expect } from 'vitest'
import Graph from './Graph.js'

describe('Computed', () => {
  it('lazily computes on first read', () => {
    const g = new Graph()
    const s = g.signal(2)
    let calls = 0

    const c = g.computed(() => {
      calls++
      return s.get() * 10
    })

    expect(c.rev()).toBe(0)
    expect(c.get()).toBe(20)
    expect(c.rev()).toBe(1)
    expect(c.get()).toBe(20) // no extra compute
    expect(calls).toBe(1)
  })

  it('recomputes when dependency changes', () => {
    const g = new Graph()
    const s = g.signal(1)
    let calls = 0

    const c = g.computed(() => {
      calls++
      return s.get() + 1
    })

    expect(c.get()).toBe(2)
    expect(c.rev()).toBe(1)

    s.set(3)
    expect(c.get()).toBe(4)
    expect(c.rev()).toBe(2)
    expect(calls).toBe(2)
  })

  it('skips recompute if value is unchanged', () => {
    const g = new Graph()
    const s = g.signal(1)
    let calls = 0

    const c = g.computed(() => {
      calls++
      return s.get() > 0 ? 1 : -1
    })

    expect(c.get()).toBe(1)
    s.set(2) // different input, same output
    expect(c.get()).toBe(1) // should not notify
    expect(calls).toBe(2) // it will still run the fn
    expect(c.rev()).toBe(1) // but output was same, so no bump
  })

  it('drops unused dependencies', () => {
    const g = new Graph()
    const a = g.signal(1)
    const b = g.signal(2)
    const toggle = g.signal(true)
    let calls = 0

    const c = g.computed(() => {
      calls++
      return toggle.get() ? a.get() : b.get()
    })

    expect(c.get()).toBe(1)
    expect(c.rev()).toBe(1)
    toggle.set(false)
    expect(c.get()).toBe(2)
    expect(c.rev()).toBe(2)
    a.set(999)
    expect(c.get()).toBe(2) // still reading b only
    expect(calls).toBe(2)
  })

  it('supports static computeds', () => {
    const g = new Graph()
    const s = g.signal(2)
    let calls = 0

    const c = g.computed(
      () => {
        calls++
        return s.get() * 2
      },
      { static: true }
    )

    expect(c.get()).toBe(4)
    s.set(3)
    expect(c.get()).toBe(6)
    expect(calls).toBe(2)
  })

  it('chained computeds recompute in order', () => {
    const g = new Graph()
    const s = g.signal(1)

    const a = g.computed(() => s.get() + 1)
    const b = g.computed(() => a.get() * 10)

    expect(b.get()).toBe(20)
    s.set(2)
    expect(b.get()).toBe(30)
    expect(a.get()).toBe(3)
  })

  it('only recomputes once per batch', () => {
    const g = new Graph()
    const a = g.signal(1)
    const b = g.signal(2)
    let count = 0

    const sum = g.computed(() => {
      count++
      return a.get() + b.get()
    })

    expect(sum.get()).toBe(3)
    g.beginBatch()
    a.set(5)
    b.set(7)
    expect(count).toBe(1) // hasn't recomputed yet
    g.endBatch()
    expect(sum.get()).toBe(12)
    expect(count).toBe(2)
  })

  it('disposes correctly', () => {
    const g = new Graph()
    const s = g.signal(1)
    let count = 0
    const c = g.computed(() => {
      count++
      return s.get() + 1
    })

    expect(c.get()).toBe(2)
    expect(count).toBe(1)
    c.dispose()
    s.set(10)
    expect(c.get()).toBe(11)
    expect(count).toBe(2) // re-evaluates on demand only
  })

  it('does not recompute if not dirty', () => {
    const g = new Graph()
    const s = g.signal(1)
    let runCount = 0

    const c = g.computed(() => {
      runCount++
      return s.get() + 1
    })

    expect(c.get()).toBe(2)
    expect(runCount).toBe(1)

    // Force a second _recompute() call manually
    c._recompute() // should do nothing
    expect(runCount).toBe(1) // still 1 - no recompute
  })

  it('throws on circular dependency', () => {
    const g = new Graph()

    let c
    c = g.computed(() => {
      // Reference itself
      return c.get()
    })

    expect(() => c.get()).toThrow('Circular dependency')
  })

  it('dispose notifies downstream computed observers', () => {
    const g = new Graph()
    const s = g.signal(1)

    const base = g.computed(() => s.get() * 2)
    const derived = g.computed(() => base.get() + 1)

    expect(derived.get()).toBe(3)
    expect(base.rev()).toBe(1)
    expect(derived.rev()).toBe(1)

    // Dispose base; should mark derived dirty
    base.dispose()

    // derived still returns cached, but will recompute on access
    expect(derived.get()).toBe(3)
    s.set(2)
    expect(derived.get()).toBe(5)
    expect(derived.rev()).toBe(2)
  })

  it('updates depth based on dependencies', () => {
    const g = new Graph()
    const a = g.signal(1)
    const base = g.computed(() => a.get() * 2)
    const mid = g.computed(() => base.get() + 1)
    const deep = g.computed(() => mid.get() + 1)

    expect(deep.get()).toBe(4)

    // base.depth = 1, mid = 2, deep = 3
    expect(base._depth).toBe(1)
    expect(mid._depth).toBe(2)
    expect(deep._depth).toBe(3)
  })

  it('removes unused Computed dep on second run', () => {
    const g = new Graph()

    const a = g.signal(1)
    const b = g.signal(1)
    const toggle = g.signal(true)

    const inner = g.computed(() => b.get() * 10)

    let computeCount = 0
    const outer = g.computed(() => {
      computeCount++
      if (toggle.get()) {
        return a.get() + inner.get()
      } else {
        return a.get()
      }
    })

    expect(outer.get()).toBe(11) // 1 + (1 * 10)
    expect(computeCount).toBe(1)

    toggle.set(false)

    // recompute drops inner from deps
    expect(outer.get()).toBe(1)
    expect(computeCount).toBe(2)
  })

  it('dispose notifies downstream reactions 1', () => {
    const g = new Graph()
    const s = g.signal(1)
    const c = g.computed(() => s.get() * 2)

    let reactionRuns = 0
    g.reaction(() => {
      if (!c._isDirty) {
        c.get()
      }
      reactionRuns++
    })

    expect(reactionRuns).toBe(1)

    c.dispose()

    // reaction re-runs because it depended on s
    expect(reactionRuns).toBe(1)
  })

  it('dispose notifies downstream reactions directly 2', () => {
    const g = new Graph()
    const s = g.signal(1)

    const c = g.computed(() => s.get() + 1)
    let log = []

    g.reaction(() => {
      log.push(c.get())
    })

    expect(log).toEqual([2])
    c.dispose()
    expect(log).toEqual([2, 2]) // reaction re-runs because it depended on c
  })
})
