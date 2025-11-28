export default class Inventory {
  constructor(graph) {
    this.graph = graph
    this.products = graph.signal([
      { id: 1, name: '🥭 Mango', price: 2.99, stock: 12, category: 'Exotic' },
      { id: 2, name: '🥝 Kiwi', price: 1.99, stock: 10, category: 'Exotic' },
      { id: 3, name: '🍍 Pineapple', price: 3.49, stock: 8, category: 'Exotic' },
      { id: 4, name: '🍈 Melon', price: 4.99, stock: 5, category: 'Exotic' },
      { id: 5, name: '🍌 Banana', price: 1.49, stock: 15, category: 'Exotic' },
      { id: 6, name: '🥑 Avocado', price: 2.79, stock: 7, category: 'Exotic' },
      { id: 7, name: '🍉 Watermelon', price: 5.99, stock: 4, category: 'Exotic' },
      { id: 8, name: '🍋 Lemon', price: 1.29, stock: 9, category: 'Exotic' },
      { id: 9, name: '🍒 Cherry', price: 3.99, stock: 6, category: 'Exotic' },
      { id: 10, name: '🍇 Grapes', price: 2.99, stock: 11, category: 'Exotic' },
      { id: 11, name: '🍏 Green Apple', price: 2.49, stock: 13, category: 'Exotic' },
      { id: 12, name: '🍑 Peach', price: 2.19, stock: 3, category: 'Exotic' },
      { id: 13, name: '🍐 Pear', price: 1.79, stock: 14, category: 'Exotic' },
      { id: 14, name: '🍊 Orange', price: 1.99, stock: 10, category: 'Exotic' },
      { id: 15, name: '🍅 Tomato', price: 1.59, stock: 8, category: 'Exotic' },
      { id: 16, name: '🫐 Blueberry', price: 2.99, stock: 5, category: 'Exotic' }
    ])

    // Computed: Stock status map { id -> 'ok' | 'low' | 'out' }
    // This is the reactive way to track stock status changes
    this.stockStatus = graph.computed(() => {
      const map = new Map()
      for (const p of this.products.get()) {
        if (p.stock === 0) {
          map.set(p.id, 'out')
        } else if (p.stock <= 5) {
          map.set(p.id, 'low')
        } else {
          map.set(p.id, 'ok')
        }
      }
      return map
    })

    // Computed: Low stock products (stock <= 5)
    this.lowStockProducts = graph.computed(() => {
      return this.products.get().filter(p => p.stock > 0 && p.stock <= 5)
    })

    // Computed: Out of stock products
    this.outOfStockProducts = graph.computed(() => {
      return this.products.get().filter(p => p.stock === 0)
    })

    // Computed: Out of stock count
    this.outOfStockCount = graph.computed(() => {
      return this.outOfStockProducts.get().length
    })

    // Computed: Total inventory value
    this.totalInventoryValue = graph.computed(() => {
      return this.products.get().reduce((sum, p) => sum + p.price * p.stock, 0)
    })
  }

  getProduct(id) {
    return this.products.get().find(p => p.id === id)
  }

  decrementStock(productId, quantity) {
    this.products.set(
      this.products.get().map(p => (p.id === productId ? { ...p, stock: Math.max(0, p.stock - quantity) } : p))
    )
  }

  incrementStock(productId, quantity) {
    this.products.set(this.products.get().map(p => (p.id === productId ? { ...p, stock: p.stock + quantity } : p)))
  }
}
