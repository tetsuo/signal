import Computed from './Computed.js'
import Reaction from './Reaction.js'
import Signal from './Signal.js'

// Graph: scheduler and context that manages batched updates and dependency tracking
export default class Graph {
  constructor(options = {}) {
    // Batch tracking
    this._batchDepth = 0
    this._pendingReactions = new Set()
    this._dirtyComputeds = new Set()
    // Derivation tracking (for dependency collection)
    this._derivationStack = []
    this._currentDerivation = null
    // Optional asynchronous flush scheduler
    this._asyncFlush = !!options.asyncFlush
    this._flushScheduled = false
    this._scheduler = options.scheduler || (this._asyncFlush ? queueMicrotask : null)
  }

  beginBatch() {
    this._batchDepth++
  }

  endBatch() {
    // End a batch: when outermost batch completes, flush all pending updates
    if (--this._batchDepth === 0) {
      // Outer batch ended: either flush immediately or schedule async flush
      if (this._asyncFlush) {
        // Async flush
        if (!this._flushScheduled) {
          this._flushScheduled = true
          this._scheduler(() => {
            this._flushScheduled = false
            this._flushDirtyComputeds()
            // Run all queued side effects after computed values are updated
            for (const reaction of this._pendingReactions) {
              this._pendingReactions.delete(reaction)
              if (!reaction._isDisposed) {
                reaction._run()
              }
            }
          })
        }
      } else {
        // Sync flush: process all computations and reactions now
        this._flushDirtyComputeds()
        for (const reaction of this._pendingReactions) {
          this._pendingReactions.delete(reaction)
          if (!reaction._isDisposed) {
            reaction._run()
          }
        }
      }
    }
  }

  _flushDirtyComputeds() {
    // Recompute all dirty Computed values in topological order; lower depth first
    while (this._dirtyComputeds.size) {
      const toRecompute = Array.from(this._dirtyComputeds)
      this._dirtyComputeds.clear()
      // Sort by depth to ensure dependencies are evaluated before dependents
      toRecompute.sort((a, b) => a._depth - b._depth)
      for (const comp of toRecompute) {
        // Only recompute if still dirty and still in use (has observers)
        if (comp._isDirty && comp._observers.size > 0) {
          comp._recompute()
        }
      }
      // Loop again in case recomputing any computed marked additional ones dirty
    }
  }

  _scheduleReaction(reaction) {
    // Queue a Reaction to run after the current batch completes
    if (this._batchDepth > 0) {
      this._pendingReactions.add(reaction)
    } else {
      // No batch active: start a mini-batch to schedule and run the reaction
      this.beginBatch()
      this._pendingReactions.add(reaction)
      this.endBatch()
    }
  }

  // Internal: push a derivation onto the tracking stack
  _startTracking(node) {
    this._derivationStack.push(node)
    this._currentDerivation = node
  }

  // Internal: pop a derivation from the tracking stack
  _endTracking() {
    this._derivationStack.pop()
    this._currentDerivation = this._derivationStack[this._derivationStack.length - 1] || null
  }

  // Factory methods to create observables associated with this graph
  signal(initialValue) {
    return new Signal(this, initialValue)
  }

  computed(computeFn, options = {}) {
    return new Computed(this, computeFn, options)
  }

  reaction(effectFn) {
    const reaction = new Reaction(this, effectFn)
    // Immediately run the effect once to establish initial dependencies
    reaction._run()
    return reaction
  }

  // Convenience method to execute multiple updates in a single batch
  batch(fn) {
    this.beginBatch()
    try {
      fn()
    } finally {
      this.endBatch()
    }
  }
}
