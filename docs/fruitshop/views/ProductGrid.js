import { View } from '../../../src/index.js'

// Displays all products with add-to-cart functionality
export default class ProductGrid extends View {
  constructor(graph, inventory, cart) {
    super(graph, {
      elementId: 'products-grid',
      templateId: 'product-template'
    })
    this.inventory = inventory
    this.cart = cart
    this.setup()
  }

  setup() {
    // Event delegation for add buttons
    this.onClick('.add-btn', (e, btn) => {
      if (!btn.disabled) {
        const productEl = btn.closest('.product')
        const productId = parseInt(productEl.dataset.id)
        this.cart.addItem(productId)
      }
    })

    this.observe(() => this.render())
  }

  render() {
    const products = this.inventory.products.get()

    this.renderList(products, (product, el) => {
      const outOfStock = product.stock === 0
      const lowStock = product.stock > 0 && product.stock <= 5

      el.dataset.id = product.id
      if (outOfStock) {
        el.classList.add('out-of-stock')
      }

      // Badge
      const badge = el.querySelector('.product-badge')
      if (lowStock) {
        badge.textContent = 'LOW STOCK'
      } else if (outOfStock) {
        badge.textContent = 'OUT OF STOCK'
      } else {
        badge.remove()
      }

      // Product info
      this.setText(el, '.product-name', product.name)
      this.setText(el, '.product-price', `€${product.price.toFixed(2)}`)

      // Stock
      const stockEl = el.querySelector('.product-stock')
      stockEl.textContent = `Stock: ${product.stock}`
      if (lowStock) {
        stockEl.classList.add('low')
      }

      // Button
      const button = el.querySelector('.add-btn')
      if (outOfStock) {
        button.disabled = true
      }
    })
  }
}
