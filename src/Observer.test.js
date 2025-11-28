import { describe, it, expect, vi, beforeEach } from 'vitest'
import Graph from './Graph.js'
import Observer from './Observer.js'

describe('Observer', () => {
  let g

  beforeEach(() => {
    g = new Graph()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('creates observer with graph reference', () => {
    const obs = new Observer(g)
    expect(obs.graph).toBe(g)
    expect(obs.reactions).toEqual([])
    expect(obs.children).toEqual([])
    expect(obs._isDisposed).toBe(false)
  })

  it('observe creates a reaction and tracks it', () => {
    const obs = new Observer(g)
    const s = g.signal(1)
    let value = 0

    const reaction = obs.observe(() => {
      value = s.get()
    })

    expect(value).toBe(1)
    expect(obs.reactions.length).toBe(1)
    expect(reaction).toBeDefined()

    s.set(2)
    expect(value).toBe(2)
  })

  it('observe returns null and warns when disposed', () => {
    const obs = new Observer(g)
    obs.dispose()

    const reaction = obs.observe(() => {})

    expect(reaction).toBeNull()
    expect(console.warn).toHaveBeenCalledWith('[Observer] cannot observe on disposed observer')
  })

  it('addChild adds child to children array', () => {
    const parent = new Observer(g)
    const child = new Observer(g)

    const result = parent.addChild(child)

    expect(result).toBe(child)
    expect(parent.children).toContain(child)
  })

  it('removeChild removes and disposes child', () => {
    const parent = new Observer(g)
    const child = new Observer(g)
    parent.addChild(child)

    const result = parent.removeChild(child)

    expect(result).toBe(child)
    expect(parent.children).not.toContain(child)
    expect(child._isDisposed).toBe(true)
  })

  it('removeChild does nothing for non-child', () => {
    const parent = new Observer(g)
    const notChild = new Observer(g)

    parent.removeChild(notChild)

    expect(notChild._isDisposed).toBe(false)
  })

  it('dispose disposes all reactions', () => {
    const obs = new Observer(g)
    const s = g.signal(1)
    let count = 0

    obs.observe(() => {
      s.get()
      count++
    })

    expect(count).toBe(1)
    obs.dispose()
    expect(obs._isDisposed).toBe(true)
    expect(obs.reactions).toEqual([])

    s.set(2)
    expect(count).toBe(1) // no more runs
  })

  it('dispose disposes all children', () => {
    const parent = new Observer(g)
    const child1 = new Observer(g)
    const child2 = new Observer(g)

    parent.addChild(child1)
    parent.addChild(child2)

    parent.dispose()

    expect(child1._isDisposed).toBe(true)
    expect(child2._isDisposed).toBe(true)
    expect(parent.children).toEqual([])
  })

  it('dispose is idempotent', () => {
    const obs = new Observer(g)

    obs.dispose()
    obs.dispose() // should not throw

    expect(obs._isDisposed).toBe(true)
  })
})
