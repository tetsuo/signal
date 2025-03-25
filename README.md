# signal

Tiny reactive runtime that wires up values and effects into a graph and keeps them in sync.

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

## Async Flushing

Schedule updates in a microtask instead of running immediately. A custom scheduler can also be provided:

```js
new Graph({ asyncFlush: true }) // uses queueMicrotask by default

// You can also pass a custom scheduler:
new Graph({
  asyncFlush: true,
  scheduler: cb => requestIdleCallback(cb)
})
```

## License

MIT license.
