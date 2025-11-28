export default class Customer {
  constructor(graph) {
    this.graph = graph
    this.name = graph.signal('Jane Doe')
    this.email = graph.signal('jane.d@example.com')
    this.totalSpent = graph.signal(46.83)
    this.orderCount = graph.signal(5)
    this.loyaltyPoints = graph.signal(25)

    // Computed: User level based on spending
    this.level = graph.computed(() => {
      const spent = this.totalSpent.get()
      if (spent >= 100) {
        return 'platinum'
      }
      if (spent >= 50) {
        return 'gold'
      }
      return 'silver'
    })

    // Computed: Discount percentage based on level
    this.discountRate = graph.computed(() => {
      const level = this.level.get()
      if (level === 'platinum') {
        return 0.15
      }
      if (level === 'gold') {
        return 0.1
      }
      return 0.05
    })

    // Computed: Points earned per dollar
    this.pointsMultiplier = graph.computed(() => {
      const level = this.level.get()
      if (level === 'platinum') {
        return 2
      }
      if (level === 'gold') {
        return 1.5
      }
      return 1
    })
  }

  recordPurchase(amount, earnedPoints) {
    this.totalSpent.set(this.totalSpent.get() + amount)
    this.orderCount.set(this.orderCount.get() + 1)
    this.loyaltyPoints.set(this.loyaltyPoints.get() + earnedPoints)
  }
}
