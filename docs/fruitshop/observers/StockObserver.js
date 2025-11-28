import { Observer } from '../../../src/index.js'

// Watches stock status
export default class StockObserver extends Observer {
  constructor(graph, inventory, activity) {
    super(graph)
    this.inventory = inventory
    this.activity = activity
    // Track previous status to detect TRANSITIONS (not just current state)
    this.previousStatus = new Map()
    this.setup()
  }

  setup() {
    this.observe(() => {
      const currentStatus = this.inventory.stockStatus.get()
      const products = this.inventory.products.get()

      for (const product of products) {
        const prevStatus = this.previousStatus.get(product.id)
        const currStatus = currentStatus.get(product.id)

        // Skip if no previous status (initial run handled by Store.initialize)
        if (prevStatus === undefined) {
          this.previousStatus.set(product.id, currStatus)
          continue
        }

        // Detect transitions
        if (prevStatus !== currStatus) {
          if (currStatus === 'low' && prevStatus === 'ok') {
            this.activity.add(`⚠️ ${product.name} is now low stock (${product.stock} remaining)`, 'warning')
          } else if (currStatus === 'out') {
            this.activity.add(`⛔ ${product.name} is now OUT OF STOCK`, 'warning')
          }
          this.previousStatus.set(product.id, currStatus)
        }
      }
    })
  }
}
