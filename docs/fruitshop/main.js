import { Graph } from '../../src/index.js'
import Store from './domain/Store.js'
import App from './views/App.js'

const graph = new Graph()
const store = new Store(graph)
const app = new App(graph, store)

store.initialize()

// Dev tools

window.disposeApp = () => {
  app.dispose()
  console.log('🗑️ App disposed, all reactions stopped')
}

window.store = store
window.graph = graph

console.log('🚀 fruitshop started. Try: window.store, window.graph, or window.disposeApp')
