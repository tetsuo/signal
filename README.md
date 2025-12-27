# signal

Reactive dependency-tracking library for managing application state.

> 👉 **[See demos](https://tetsuo.github.io/signal/)**

## Installation

```sh
npm install @tetsuo/signal
```

## Example

```js
import { Graph } from '@tetsuo/signal'

const g = new Graph()

const count = g.signal(1)
const double = g.computed(() => count.get() * 2)

g.reaction(() => {
  console.log('Double is', double.get())
})

count.set(4)

// Double is 2
// Double is 8
```

## Signal

Signals hold **mutable** values. Calling `get()` returns the current value. Calling `set()` updates the value and notifies any dependents.

```js
const count = graph.signal(1) // start with an initial value

count.get() // 1
count.set(42) // updates dependents
```

## Computed

Computed values **derive** their result from other signals or computeds. They are lazy (evaluated on demand) and cached until dependencies change. Dependencies are tracked automatically during execution.

```js
const double = graph.computed(() => count.get() * 2)
```

💡 To disable dynamic dependency tracking, pass `{ static: true }`. This prevents recalculating dependencies when they are fixed.

## Reaction

Reactions are **side effects** that run whenever their dependencies change. They run once on setup to establish tracking, then re-run when needed.

```js
graph.reaction(() => {
  console.log(double.get())
})
```

## Batching

Group multiple updates into a single flush:

```js
graph.batch(() => {
  count.set(1)
  other.set(2)
})
```

## Async flushing

Schedule updates in a microtask instead of running immediately. A custom scheduler can also be provided:

```js
new Graph({ asyncFlush: true }) // uses queueMicrotask by default

// You can also pass a custom scheduler:
new Graph({
  asyncFlush: true,
  scheduler: cb => requestIdleCallback(cb)
})
```

## Observer

Base class for building reactive components. Useful for background watchers or coordinating children.

```js
import { Observer } from '@tetsuo/signal'

class StockWatcher extends Observer {
  constructor(graph, inventory) {
    super(graph)
    this.inventory = inventory

    this.observe(() => {
      const lowStock = this.inventory.lowStockProducts.get()
      // React to stock changes...
    })
  }
}
```

## View

Extends `Observer` with DOM rendering capabilities. Uses template cloning.

```js
import { View } from '@tetsuo/signal'

class ProductList extends View {
  constructor(graph, products) {
    super(graph, {
      elementId: 'product-list',
      templateId: 'product-template'
    })
    this.products = products

    this.onClick('.add-btn', (e, el) => {
      const id = el.closest('.product').dataset.id
      // Handle click...
    })

    this.observe(() => this.render())
  }

  render() {
    this.renderList(this.products.get(), (product, el) => {
      el.dataset.id = product.id
      this.setText(el, '.name', product.name)
      this.setText(el, '.price', product.price)
    })
  }
}
```

## License

MIT license
