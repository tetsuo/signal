export default class Activity {
  constructor(graph) {
    this.graph = graph
    this.entries = graph.signal([])
    this.maxEntries = 20
  }

  add(message, type = 'info') {
    const entry = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }

    const current = this.entries.get()
    this.entries.set([entry, ...current].slice(0, this.maxEntries))
  }
}
