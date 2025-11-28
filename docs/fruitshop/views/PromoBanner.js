import { View } from '@tetsuo/signal'

// Shows promotional messages based on customer spending
export default class PromoBanner extends View {
  constructor(graph, customer) {
    super(graph, {
      elementId: 'promo-container',
      templateId: 'promo-banner-template'
    })
    this.customer = customer
    this.setup()
  }

  setup() {
    this.observe(() => this.render())
  }

  render() {
    const spent = this.customer.totalSpent.get()
    const level = this.customer.level.get()

    let message = null

    if (level === 'silver' && spent >= 45 && spent < 50) {
      const needed = (50 - spent).toFixed(2)
      message = `🏅 Spend €${needed} more to unlock GOLD status with 10% discount!`
    } else if (level === 'gold' && spent >= 80 && spent < 100) {
      const needed = (100 - spent).toFixed(2)
      message = `✨ Spend €${needed} more to unlock PLATINUM status with 15% discount!`
    }

    if (message) {
      const clone = this.cloneTemplate()
      this.setText(clone, '.promo-banner', message)
      this.replaceContent(clone)
    } else {
      this.clear()
    }
  }
}
