import { Observer } from '../../../src/index.js'

// Watches for customer level transitions and logs activity
export default class LevelUpgradeObserver extends Observer {
  constructor(graph, customer, activity) {
    super(graph)
    this.customer = customer
    this.activity = activity
    this.previousLevel = customer.level.get()
    this.setup()
  }

  setup() {
    this.observe(() => {
      const newLevel = this.customer.level.get()

      if (newLevel !== this.previousLevel) {
        const emoji = newLevel === 'platinum' ? '💎' : newLevel === 'gold' ? '👑' : '🥈'
        this.activity.add(`${emoji} Upgraded to ${newLevel.toUpperCase()} status!`, 'checkout')
        this.previousLevel = newLevel
      }
    })
  }
}
