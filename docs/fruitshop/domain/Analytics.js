export default class Analytics {
  constructor(graph, inventory, cart, customer) {
    this.graph = graph
    this.inventory = inventory
    this.cart = cart
    this.customer = customer

    // Computed: Average cart value
    this.avgOrderValue = graph.computed(() => {
      const orders = this.customer.orderCount.get()
      const spent = this.customer.totalSpent.get()
      return orders > 0 ? spent / orders : 0
    })

    // Computed: Conversion rate simulation (items in cart / total products)
    this.cartFillRate = graph.computed(() => {
      const products = this.inventory.products.get().length
      const cartItems = this.cart.itemCount.get()
      return products > 0 ? (cartItems / products) * 100 : 0
    })

    // Computed: Revenue if cart checked out
    this.potentialRevenue = graph.computed(() => {
      return this.cart.total.get()
    })
  }
}
