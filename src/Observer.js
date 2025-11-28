// Observer: base class for reactive subscriptions
export default class Observer {
  constructor(graph) {
    this.graph = graph
    this.reactions = []
    this.children = []
    this._isDisposed = false
  }

  observe(fn) {
    if (this._isDisposed) {
      console.warn(`[${this.constructor.name}] cannot observe on disposed observer`)
      return null
    }
    const reaction = this.graph.reaction(() => {
      fn()
    })
    this.reactions.push(reaction)
    return reaction
  }

  // Add child observer/view
  addChild(child) {
    this.children.push(child)
    return child
  }

  removeChild(child) {
    const index = this.children.indexOf(child)
    if (index !== -1) {
      this.children.splice(index, 1)
      child.dispose()
    }
    return child
  }

  dispose() {
    if (this._isDisposed) {
      return
    }
    this._isDisposed = true

    // Dispose all reactions
    for (const r of this.reactions) {
      r.dispose()
    }
    this.reactions = []

    // Dispose all children
    for (const c of this.children) {
      c.dispose()
    }
    this.children = []
  }
}
