import { describe, it, expect } from 'vitest'
import Graph from './Graph.js'

describe('Reaction', () => {
  it('runs immediately when created', () => {
    const g = new Graph()
    const s = g.signal(1)
    let count = 0

    g.reaction(() => {
      s.get()
      count++
    })

    expect(count).toBe(1)
  })

  it('re-runs when signal changes', () => {
    const g = new Graph()
    const s = g.signal(1)
    let count = 0

    g.reaction(() => {
      s.get()
      count++
    })

    expect(count).toBe(1)
    s.set(2)
    expect(count).toBe(2)
  })

  it('does not re-run when value is unchanged', () => {
    const g = new Graph()
    const s = g.signal(5)
    let count = 0

    g.reaction(() => {
      s.get()
      count++
    })
    expect(count).toBe(1)
    s.set(5)
    expect(count).toBe(1)
  })

  it('can track multiple signals', () => {
    const g = new Graph()
    const a = g.signal(1)
    const b = g.signal(2)
    let count = 0

    g.reaction(() => {
      a.get()
      b.get()
      count++
    })
    expect(count).toBe(1)
    a.set(10)
    expect(count).toBe(2)
    b.set(20)
    expect(count).toBe(3)
  })

  it('can dispose reaction to stop updates', () => {
    const g = new Graph()
    const s = g.signal(1)
    let count = 0
    const r = g.reaction(() => {
      s.get()
      count++
    })

    expect(count).toBe(1)

    s.set(2)
    expect(count).toBe(2)

    r.dispose()
    s.set(3)
    expect(count).toBe(2) // no further runs
  })

  it('batching prevents multiple runs within a batch', () => {
    const g = new Graph()
    const s = g.signal(1)
    let count = 0

    g.reaction(() => {
      s.get()
      count++
    })

    expect(count).toBe(1)

    g.beginBatch()
    s.set(2)
    s.set(3)
    s.set(4)
    expect(count).toBe(1)
    g.endBatch()

    expect(count).toBe(2)
  })

  it('reacts to computed values too', () => {
    const g = new Graph()
    const s = g.signal(2)
    const double = g.computed(() => s.get() * 2)
    let reactionValue = 0

    g.reaction(() => {
      reactionValue = double.get()
    })

    expect(reactionValue).toBe(4)
    s.set(5)
    expect(reactionValue).toBe(10)
  })

  it('removes itself from computed observers on dispose', () => {
    const g = new Graph()
    const s = g.signal(1)

    const double = g.computed(() => s.get() * 2)
    const r = g.reaction(() => {
      double.get() // reaction depends on computed
    })

    expect(double._observers.has(r)).toBe(true)

    r.dispose()

    expect(double._observers.has(r)).toBe(false)
  })

  it('cleans up Computed dependencies on dispose', () => {
    const g = new Graph()
    const s = g.signal(1)
    const double = g.computed(() => s.get() * 2)

    const r = g.reaction(() => {
      double.get() // Reaction depends on a Computed
    })

    // change s to cause re-run
    s.set(2)

    // Dispose reaction
    r.dispose()

    // Now changing s should not trigger any more re-runs
    s.set(3)
  })

  it('supports nested reactions with independent tracking', () => {
    const g = new Graph()
    const a = g.signal(1)
    const b = g.signal(10)

    let outerCount = 0
    let innerCount = 0
    let innerReaction

    g.reaction(() => {
      a.get()
      outerCount++

      if (!innerReaction) {
        // Create nested reaction during first run
        innerReaction = g.reaction(() => {
          b.get()
          innerCount++
        })
      }
    })

    // Outer runs once on creation
    expect(outerCount).toBe(1)
    // Inner also runs once; created during outer
    expect(innerCount).toBe(1)

    // Change a – should only affect outer
    a.set(2)
    expect(outerCount).toBe(2)

    expect(innerCount).toBe(1)

    // Change b – should only affect inner
    b.set(20)
    expect(outerCount).toBe(2)

    expect(innerCount).toBe(2)

    // Disposing the inner should stop its updates
    innerReaction.dispose()
    b.set(30)
    expect(innerCount).toBe(2)

    // Outer still works
    a.set(3)
    expect(outerCount).toBe(3)
  })

  it('flushes cascading reactions in the same batch', () => {
    const g = new Graph()
    const s = g.signal(0)
    const s2 = g.signal(0)

    let r1Calls = 0
    let r2Calls = 0

    // Reaction 1: observes s, sets s2
    g.reaction(() => {
      r1Calls++
      if (s.get() > 0) {
        s2.set(s.get())
      }
    })

    // Reaction 2: observes s2
    g.reaction(() => {
      r2Calls++
      s2.get()
    })

    // Initial run
    expect(r1Calls).toBe(1)
    expect(r2Calls).toBe(1)

    // Update s
    s.set(1)

    // s changes -> r1 runs -> sets s2 -> r2 runs
    expect(r1Calls).toBe(2)
    expect(r2Calls).toBe(2)
  })
})
