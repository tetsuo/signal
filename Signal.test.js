import { describe, it, expect } from 'vitest'
import Graph from './Graph.js'

describe('Signal', () => {
  it('returns initial value', () => {
    const g = new Graph()
    const s = g.signal(123)
    expect(s.rev()).toBe(0)
    expect(s.get()).toBe(123)
  })

  it('set() updates the value', () => {
    const g = new Graph()
    const s = g.signal(10)
    expect(s.rev()).toBe(0)
    s.set(42)
    expect(s.rev()).toBe(1)
    expect(s.get()).toBe(42)
  })

  it('set() with same value does not notify observers', () => {
    const g = new Graph()
    const s = g.signal(5)
    let recomputeCount = 0
    g.computed(() => {
      s.get()
      recomputeCount++
    }).get()
    expect(recomputeCount).toBe(1)
    expect(s.rev()).toBe(0)
    s.set(5) // same value
    expect(s.rev()).toBe(0)
    expect(recomputeCount).toBe(1)
  })

  it('notifies dependent computeds on value change', () => {
    const g = new Graph()
    const s = g.signal(2)
    const double = g.computed(() => s.get() * 2)
    expect(double.get()).toBe(4)
    expect(s.rev()).toBe(0)
    s.set(3)
    expect(s.rev()).toBe(1)
    expect(double.get()).toBe(6)
  })

  it('observers are cleared when signal is unused', () => {
    const g = new Graph()
    const a = g.signal(1)
    const b = g.signal(2)
    const useA = g.signal(true)

    const result = g.computed(() => {
      return useA.get() ? a.get() : b.get()
    })

    expect(result.get()).toBe(1)
    expect(result.rev()).toBe(1)
    expect(useA.rev()).toBe(0)
    useA.set(false)
    expect(useA.rev()).toBe(1)
    expect(result.get()).toBe(2)
    expect(result.rev()).toBe(2)

    // change a: shouldn't affect result anymore
    a.set(999)
    expect(result.get()).toBe(2)
    expect(result.rev()).toBe(2)

    expect(a.rev()).toBe(1)

    // change b: should update result
    b.set(7)
    expect(b.rev()).toBe(1)

    expect(result.get()).toBe(7)
    expect(result.rev()).toBe(3)
  })

  it('batching multiple sets does not trigger computed until endBatch', () => {
    const g = new Graph()
    const s = g.signal(1)

    let computeCount = 0
    const c = g.computed(() => {
      computeCount++
      return s.get() * 10
    })

    expect(c.get()).toBe(10)
    expect(computeCount).toBe(1)
    expect(c.rev()).toBe(1)

    g.beginBatch()
    s.set(2)
    expect(s.rev()).toBe(1)
    expect(computeCount).toBe(1)
    expect(c.rev()).toBe(1) // not re-evaluated yet

    s.set(3)
    expect(s.rev()).toBe(2)
    expect(computeCount).toBe(1)
    expect(c.rev()).toBe(1)

    s.set(4)
    expect(s.rev()).toBe(3)
    expect(computeCount).toBe(1)
    expect(c.rev()).toBe(1)

    g.endBatch()

    expect(computeCount).toBe(1)
    expect(c.get()).toBe(40)
    expect(c.rev()).toBe(2)
  })

  it('object identity is respected for equality', () => {
    const g = new Graph()
    const obj = { x: 1 }
    const s = g.signal(obj)

    let count = 0
    const c = g.computed(() => {
      count++
      return s.get()
    })

    const spy = g.computed(() => c.get())

    expect(spy.get()).toBe(obj)
    expect(c.rev()).toBe(1)
    expect(count).toBe(1)

    // Change value; new reference
    s.set({ x: 2 })

    expect(spy.get().x).toBe(2)
    expect(c.rev()).toBe(2)
    expect(count).toBe(2)
  })

  it('same object reference prevents recompute', () => {
    const g = new Graph()
    const obj = { x: 1 }
    const s = g.signal(obj)
    const c = g.computed(() => s.get())
    c.get()
    s.set(obj) // same object; should not trigger
    expect(s.rev()).toBe(0)
    expect(c.get()).toBe(obj)
  })

  it('reactions are scheduled when signal changes', () => {
    const g = new Graph()
    const s = g.signal(1)
    let reactionRuns = 0

    g.reaction(() => {
      s.get()
      reactionRuns++
    })

    expect(reactionRuns).toBe(1)

    // Change value; should schedule reaction
    s.set(2)
    expect(s.rev()).toBe(1)

    expect(reactionRuns).toBe(2)

    // Same value; should not re-run
    s.set(2)
    expect(s.rev()).toBe(1)
    expect(reactionRuns).toBe(2)

    // Another real change
    s.set(3)
    expect(reactionRuns).toBe(3)
  })
})
