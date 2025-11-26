import Reaction from './Reaction.js'

// Computed: derived value that caches output and updates when dependencies change
export default class Computed {
  constructor(graph, computeFn, options = {}) {
    this.graph = graph
    this._computeFn = computeFn
    this._observers = new Set() // downstream observers (Computeds or Reactions)
    this._dependencies = new Set() // upstream observables (Signals or Computeds)
    this._value = undefined
    this._isDirty = true // start dirty so it computes on first access
    this._depth = 0 // depth in dependency graph (for scheduling order)
    this._static = options.static || false // if true, skip re-tracking dependencies
    this._isComputing = false
    this._rev = 0 // revision count
  }

  get() {
    if (this._isComputing) {
      throw new Error('Circular dependency in Computed')
    }
    // Register as dependency if being accessed inside another derivation
    const node = this.graph._currentDerivation
    if (node && node.graph === this.graph) {
      node._addDependency(this)
      this._observers.add(node)
    }
    // Compute lazily on first access or if marked dirty
    if (this._isDirty) {
      this._recompute()
    }
    return this._value
  }

  _markDirty() {
    if (!this._isDirty) {
      this._isDirty = true
      for (const obs of this._observers) {
        if (obs instanceof Computed) {
          obs._markDirty()
        } else if (obs instanceof Reaction) {
          this.graph._scheduleReaction(obs)
        }
      }
      // Queue this computed for recomputation in the batch flush
      this.graph._dirtyComputeds.add(this)
    }
  }

  _recompute() {
    if (!this._isDirty) {
      return // already up to date
    }
    if (this._isComputing) {
      throw new Error('Circular dependency in Computed')
    }
    this._isComputing = true
    const oldValue = this._value
    // If dynamic, swap out the set
    let oldDeps
    if (!this._static) {
      oldDeps = this._dependencies
      this._dependencies = new Set()
    }
    // Execute compute function in a tracking context to gather dependencies
    this.graph._startTracking(this)
    try {
      this._value = this._computeFn()
    } catch (e) {
      if (!this._static) {
        // Clean up any new dependencies collected during the failed run
        for (const dep of this._dependencies) {
          if (!oldDeps.has(dep)) {
            if (dep instanceof Computed) {
              dep._removeObserver(this)
            } else {
              dep._observers.delete(this)
            }
          }
        }
        this._dependencies = oldDeps
      }
      throw e
    } finally {
      this.graph._endTracking()
      this._isComputing = false
    }
    this._isDirty = false
    // For dynamic graphs: Unsubscribe from any dependencies that were not used this time
    if (!this._static) {
      for (const dep of oldDeps) {
        if (!this._dependencies.has(dep)) {
          if (dep instanceof Computed) {
            dep._removeObserver(this)
          } else {
            dep._observers.delete(this) // dep is a Signal
          }
        }
      }
    }
    // Update depth for topological order (depth = 1 + max depth of dependencies)
    this._updateDepth()
    // If the value actually changed, increment revision and notify observers
    if (!Object.is(this._value, oldValue)) {
      this._rev++
      for (const obs of Array.from(this._observers)) {
        if (obs instanceof Computed) {
          obs._markDirty()
        } else if (obs instanceof Reaction) {
          this.graph._scheduleReaction(obs)
        }
      }
    }
  }

  _updateDepth() {
    let maxDepth = 0
    for (const dep of this._dependencies) {
      if (dep instanceof Computed && dep._depth > maxDepth) {
        maxDepth = dep._depth
      }
    }
    this._depth = maxDepth + 1
  }

  _addDependency(dep) {
    this._dependencies.add(dep)
  }

  _removeObserver(node) {
    this._observers.delete(node)
    if (this._observers.size === 0) {
      // No observers left: suspend this computed to save work
      for (const dep of this._dependencies) {
        if (dep instanceof Computed) {
          dep._removeObserver(this)
        } else {
          dep._observers.delete(this)
        }
      }
      this._isDirty = true // mark dirty so it'll recompute if accessed again
    }
  }

  dispose() {
    for (const dep of this._dependencies) {
      if (dep instanceof Computed) {
        dep._removeObserver(this)
      } else {
        dep._observers.delete(this)
      }
    }
    this._dependencies.clear()
    // Mark dirty to force a fresh computation if revived
    this._isDirty = true
    // Invalidate downstream observers
    for (const obs of Array.from(this._observers)) {
      if (obs instanceof Computed) {
        obs._markDirty()
      } else if (obs instanceof Reaction) {
        this.graph._scheduleReaction(obs)
      }
    }
    this._observers.clear()
  }

  rev() {
    return this._rev
  }
}
