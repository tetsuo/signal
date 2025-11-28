import Inventory from './Inventory.js'
import Customer from './Customer.js'
import Cart from './Cart.js'
import Activity from './Activity.js'
import Analytics from './Analytics.js'

export default class Store {
  constructor(graph) {
    this.graph = graph

    // Initialize all domain models
    this.inventory = new Inventory(graph)
    this.customer = new Customer(graph)
    this.activity = new Activity(graph)
    this.cart = new Cart(graph, this.inventory, this.customer, this.activity)
    this.analytics = new Analytics(graph, this.inventory, this.cart, this.customer)
  }

  // Helper: Initialize with welcome messages
  initialize() {
    this.graph.batch(() => {
      this.activity.add('🚀 Store opened for business!')
      this.activity.add(`Welcome back, ${this.customer.name.get()}!`)

      // Log initial low stock warnings
      const lowStock = this.inventory.lowStockProducts.get()
      lowStock.forEach(product => {
        this.activity.add(`⚠️ ${product.name} is low stock (${product.stock} remaining)`, 'warning')
      })
    })
  }
}
