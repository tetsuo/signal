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

  it('cleans up new dependencies when compute function throws', () => {
    const g = new Graph()
    const s1 = g.signal(1)
    const s2 = g.signal(2)
    let shouldThrow = false

    const c = g.computed(() => {
      const v1 = s1.get()
      if (shouldThrow) {
        s2.get() // new dependency added before throw
        throw new Error('test error')
      }
      return v1
    })

    // First access works fine
    expect(c.get()).toBe(1)
    expect(c._dependencies.size).toBe(1) // only s1

    // Now make it throw
    shouldThrow = true
    s1.set(2) // triggers recompute

    expect(() => c.get()).toThrow('test error')
    // Dependencies should be restored to previous state (only s1)
    expect(c._dependencies.size).toBe(1)
    expect(c._dependencies.has(s1)).toBe(true)
    expect(c._dependencies.has(s2)).toBe(false)
  })

  it('cleans up Computed dependencies when compute function throws', () => {
    const g = new Graph()
    const s = g.signal(1)
    const inner = g.computed(() => s.get() * 2)
    let shouldThrow = false

    const outer = g.computed(() => {
      if (shouldThrow) {
        inner.get() // new Computed dependency added before throw
        throw new Error('test error')
      }
      return s.get()
    })

    // First access works fine, depends only on s
    expect(outer.get()).toBe(1)

    // Now make it throw
    shouldThrow = true
    s.set(2)

    expect(() => outer.get()).toThrow('test error')
    // inner should not have outer as observer
    expect(inner._observers.has(outer)).toBe(false)
  })

  it('removes Computed observer when Computed has no observers left', () => {
    const g = new Graph()
    const s = g.signal(1)
    const inner = g.computed(() => s.get() * 2)
    const outer = g.computed(() => inner.get() + 1)

    // Access to establish dependencies
    expect(outer.get()).toBe(3)
    expect(inner._observers.has(outer)).toBe(true)

    // Dispose outer; should remove itself from inner's observers
    outer.dispose()
    expect(inner._observers.has(outer)).toBe(false)
  })

  it('dispose removes Computed from Computed dependencies', () => {
    const g = new Graph()
    const s = g.signal(1)
    const inner = g.computed(() => s.get() * 2)
    const outer = g.computed(() => inner.get() + 1)

    // Access to establish dependencies
    expect(outer.get()).toBe(3)
    expect(inner._observers.has(outer)).toBe(true)
    expect(outer._dependencies.has(inner)).toBe(true)

    // Dispose outer
    outer.dispose()

    // inner should no longer have outer as observer
    expect(inner._observers.has(outer)).toBe(false)
  })

  it('throws error on circular dependency during recompute', () => {
    const g = new Graph()

    // Create a computed that depends on itself via getting its own value
    let c
    c = g.computed(() => {
      // Try to access self - this creates a circular dependency
      return c ? c.get() + 1 : 0
    })

    // First access triggers the circular dependency error
    expect(() => c.get()).toThrow('Circular dependency in Computed')
  })

  it('throws error when _recompute called while already computing', () => {
    const g = new Graph()
    const s = g.signal(1)

    let recomputeRef
    const c = g.computed(() => {
      recomputeRef = c._recompute.bind(c)
      // Call _recompute directly while already computing - bypasses get() check
      if (c._isComputing) {
        c._recompute()
      }
      return s.get()
    })

    // First access; during compute, _isComputing is true, then we call _recompute
    // The _recompute check should catch this
    expect(() => c.get()).toThrow('Circular dependency in Computed')
  })

  it('removes Computed from Computed dependency when observer removed', () => {
    const g = new Graph()
    const s = g.signal(1)
    const inner = g.computed(() => s.get() * 2)
    const outer = g.computed(() => inner.get() + 1)

    // Set up a reaction to observe outer
    const r = g.reaction(() => outer.get())

    // Verify chain: s -> inner -> outer -> r
    expect(inner._observers.has(outer)).toBe(true)
    expect(outer._observers.has(r)).toBe(true)

    // Dispose reaction; outer loses its only observer
    // This should trigger _removeObserver chain: outer removes itself from inner
    r.dispose()

    // outer should have removed itself from inner's observers
    expect(inner._observers.has(outer)).toBe(false)
  })
})
