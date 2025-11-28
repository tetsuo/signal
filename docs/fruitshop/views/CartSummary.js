import { View } from '@tetsuo/signal'

// Displays cart totals and checkout button
export default class CartSummary extends View {
  constructor(graph, cart, customer) {
    super(graph, {
      elementId: 'cart-summary',
      templateId: 'cart-summary-template'
    })
    this.cart = cart
    this.customer = customer
    this.setup()
  }

  setup() {
    // Checkout button
    this.onClick('.checkout-btn', (e, btn) => {
      if (!btn.disabled) {
        this.cart.checkout()
      }
    })

    this.observe(() => this.render())
  }

  render() {
    const isEmpty = this.cart.isEmpty.get()

    if (isEmpty) {
      this.clear()
      return
    }

    const subtotal = this.cart.subtotal.get()
    const discount = this.cart.discount.get()
    const tax = this.cart.tax.get()
    const total = this.cart.total.get()
    const points = this.cart.pointsToEarn.get()
    const discountRate = this.customer.discountRate.get()
    const level = this.customer.level.get()

    const clone = this.cloneTemplate()

    this.setText(clone, '.subtotal-value', `€${subtotal.toFixed(2)}`)
    this.setText(clone, '.discount-label', `Discount (${(discountRate * 100).toFixed(0)}% - ${level} member):`)
    this.setText(clone, '.discount-value', `−€${discount.toFixed(2)}`)
    this.setText(clone, '.tax-value', `€${tax.toFixed(2)}`)
    this.setText(clone, '.total-value', `€${total.toFixed(2)}`)
    this.setText(clone, '.points-value', `+${points} pts`)

    this.replaceContent(clone)
  }
}
