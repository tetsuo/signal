import { View } from '../../../src/index.js'

// Displays cart items with quantity controls
export default class CartItemList extends View {
  constructor(graph, cart) {
    super(graph, {
      elementId: 'cart-items',
      templateId: 'cart-item-template'
    })
    this.cart = cart
    this.emptyTemplate = document.getElementById('empty-cart-template').content
    this.setup()
  }

  setup() {
    // Event delegation for cart controls
    this.onClick('button[data-action]', (e, btn) => {
      const cartItem = btn.closest('.cart-item')
      const productId = parseInt(cartItem.dataset.id)
      const action = btn.dataset.action

      if (action === 'remove') {
        this.cart.removeItem(productId)
      } else if (action === 'increment' || action === 'decrement') {
        const items = this.cart.cartWithDetails.get()
        const item = items.find(i => i.productId === productId)
        if (item) {
          const newQty = action === 'increment' ? item.quantity + 1 : item.quantity - 1
          this.cart.updateQuantity(productId, newQty)
        }
      }
    })

    this.observe(() => this.render())
  }

  render() {
    const items = this.cart.cartWithDetails.get()

    if (items.length === 0) {
      const empty = this.emptyTemplate.cloneNode(true)
      this.replaceContent(empty)
      return
    }

    this.renderList(items, (item, el) => {
      el.dataset.id = item.productId
      this.setText(el, '.cart-item-name', item.product.name)
      this.setText(
        el,
        '.cart-item-price',
        `€${item.product.price.toFixed(2)} × ${item.quantity} = €${item.subtotal.toFixed(2)}`
      )
      this.setText(el, '.qty', item.quantity)
    })
  }
}
