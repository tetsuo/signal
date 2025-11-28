import { Observer } from '@tetsuo/signal'
import PromoBanner from './PromoBanner.js'

// Displays customer info and stats
export default class CustomerProfile extends Observer {
  constructor(graph, customer) {
    super(graph)
    this.customer = customer
    this.setup()
  }

  setup() {
    this.observe(() => {
      document.getElementById('user-name').textContent = this.customer.name.get()
      document.getElementById('user-email').textContent = this.customer.email.get()

      const level = this.customer.level.get()
      const levelEl = document.getElementById('user-level')
      levelEl.textContent = level.toUpperCase()
      levelEl.className = `user-level ${level}`

      document.getElementById('stat-orders').textContent = this.customer.orderCount.get()
      document.getElementById('stat-spent').textContent = `€${this.customer.totalSpent.get().toFixed(2)}`
      document.getElementById('stat-points').textContent = this.customer.loyaltyPoints.get()
    })

    this.addChild(new PromoBanner(this.graph, this.customer))
  }
}
