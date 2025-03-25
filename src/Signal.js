import Computed from './Computed.js'
import Reaction from './Reaction.js'

// Signal: primitive observable value container
export default class Signal {
  constructor(graph, value) {
    this.graph = graph
    this._value = value
    this._observers = new Set()
    this._rev = 0 // number of changes
  }

  get() {
    // If accessed within an active derivation, register dependency
    const node = this.graph._currentDerivation
    if (node && node.graph === this.graph) {
      node._addDependency(this)
      this._observers.add(node)
    }
    return this._value
  }

  set(newValue) {
    // Skip when no actual change
    if (Object.is(newValue, this._value)) {
      return
    }
    this._value = newValue
    this._rev++
    if (this._observers.size > 0) {
      // Batch the update notifications
      this.graph.beginBatch()
      for (const obs of this._observers) {
        if (obs instanceof Computed) {
          // Mark dependent computed as dirty
          obs._markDirty()
        } else if (obs instanceof Reaction) {
          // Schedule reaction to run after batch
          this.graph._scheduleReaction(obs)
        }
      }
      this.graph.endBatch()
    }
  }

  rev() {
    return this._rev
  }
}
