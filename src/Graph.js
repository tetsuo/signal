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
            // Skip flush if we're in a new batch (will be flushed when batch ends)
            if (this._batchDepth > 0) {
              return
            }
            this._flushDirtyComputeds()
            // Run all queued side effects after computed values are updated
            // Collect reactions first to avoid iterator invalidation
            const reactionsToRun = Array.from(this._pendingReactions)
            this._pendingReactions.clear()
            for (const reaction of reactionsToRun) {
              if (!reaction._isDisposed) {
                reaction._run()
              }
            }
          })
        }
      } else {
        // Sync flush: process all computations and reactions now
        this._flushDirtyComputeds()
        this._flushReactions()
      }
    }
  }

  _flushDirtyComputeds() {
    // Recompute all dirty Computed values in topological order; lower depth first
    // Safety limit to prevent infinite loops from circular dependencies
    let iterations = 0
    const maxIterations = 1000
    while (this._dirtyComputeds.size) {
      if (++iterations > maxIterations) {
        this._dirtyComputeds.clear()
        throw new Error('Maximum computed flush iterations exceeded - possible circular dependency')
      }
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
    // Don't schedule a reaction that's currently running to avoid infinite loops
    if (reaction._isRunning) {
      return
    }
    // Add to pending reactions
    const wasEmpty = this._pendingReactions.size === 0
    this._pendingReactions.add(reaction)

    // If not in a batch and this is the first reaction added, flush now
    if (this._batchDepth === 0 && wasEmpty) {
      this._flushReactions()
    }
  }

  _flushReactions() {
    // Always flush dirty computeds first for consistent state
    this._flushDirtyComputeds()
    const reactionsToRun = Array.from(this._pendingReactions)
    this._pendingReactions.clear()
    for (const r of reactionsToRun) {
      if (!r._isDisposed) {
        r._run()
      }
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
