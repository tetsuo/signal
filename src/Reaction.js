import Computed from './Computed.js'

// Reaction: side-effect that re-runs whenever its dependencies change
export default class Reaction {
  constructor(graph, effectFn) {
    this.graph = graph
    this._effectFn = effectFn
    this._dependencies = new Set()
    this._isDisposed = false
    this._isRunning = false
  }

  _run() {
    if (this._isDisposed || this._isRunning) {
      return
    }
    this._isRunning = true
    // Unsubscribe from any previous dependencies
    for (const dep of this._dependencies) {
      if (dep instanceof Computed) {
        dep._removeObserver(this)
      } else {
        dep._observers.delete(this) // dep is a Signal
      }
    }
    this._dependencies.clear()
    // Run the side-effect in a tracking context to collect new dependencies
    this.graph._startTracking(this)
    try {
      this._effectFn()
    } finally {
      this.graph._endTracking()
      this._isRunning = false
    }
    // (Any Signal/Computed accessed in the effectFn will add this Reaction as observer)
  }

  _addDependency(dep) {
    this._dependencies.add(dep)
  }

  dispose() {
    if (!this._isDisposed) {
      for (const dep of this._dependencies) {
        if (dep instanceof Computed) {
          dep._removeObserver(this)
        } else {
          dep._observers.delete(this)
        }
      }
      this._dependencies.clear()
      this._isDisposed = true
    }
  }
}
