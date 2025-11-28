export default class Cart {
  constructor(graph, inventory, customer, activity) {
    this.graph = graph
    this.inventory = inventory
    this.customer = customer
    this.activity = activity
    this.items = graph.signal([]) // { productId, quantity, product (snapshot) }

    // Computed: Cart items with product details (using snapshots to avoid dependency on products signal)
    this.cartWithDetails = graph.computed(() => {
      return this.items.get().map(item => ({
        ...item,
        subtotal: item.product.price * item.quantity
      }))
    })

    // Computed: Subtotal before discounts
    this.subtotal = graph.computed(() => {
      return this.cartWithDetails.get().reduce((sum, item) => sum + item.subtotal, 0)
    })

    // Computed: Discount amount based on user level
    this.discount = graph.computed(() => {
      return this.subtotal.get() * this.customer.discountRate.get()
    })

    // Computed: Tax (10% of subtotal after discount)
    this.tax = graph.computed(() => {
      return (this.subtotal.get() - this.discount.get()) * 0.1
    })

    // Computed: Final total
    this.total = graph.computed(() => {
      return this.subtotal.get() - this.discount.get() + this.tax.get()
    })

    // Computed: Points that will be earned
    this.pointsToEarn = graph.computed(() => {
      return Math.floor(this.total.get() * this.customer.pointsMultiplier.get())
    })

    // Computed: Item count
    this.itemCount = graph.computed(() => {
      return this.items.get().reduce((sum, item) => sum + item.quantity, 0)
    })

    // Computed: Is cart empty
    this.isEmpty = graph.computed(() => {
      return this.items.get().length === 0
    })
  }

  addItem(productId) {
    const product = this.inventory.getProduct(productId)
    if (!product || product.stock === 0) {
      return
    }

    const currentItems = this.items.get()
    const existingItem = currentItems.find(item => item.productId === productId)

    if (existingItem) {
      // Check if we have enough stock
      if (existingItem.quantity >= product.stock) {
        console.log(`Cannot add more ${product.name} - insufficient stock`)
        return
      }
      this.items.set(
        currentItems.map(item => (item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item))
      )
    } else {
      // Store a snapshot of the product to avoid dependency on products signal
      this.items.set([
        ...currentItems,
        {
          productId,
          quantity: 1,
          product: { ...product } // Snapshot
        }
      ])
    }

    console.log(`Added ${product.name} to cart`)
    this.activity.add(`➕ Added ${product.name} to cart`)
  }

  removeItem(productId) {
    const product = this.inventory.getProduct(productId)
    this.items.set(this.items.get().filter(item => item.productId !== productId))
    console.log(`Removed ${product.name} from cart`)
    this.activity.add(`➖ Removed ${product.name} from cart`)
  }

  updateQuantity(productId, quantity) {
    const product = this.inventory.getProduct(productId)
    const currentItems = this.items.get()
    const currentItem = currentItems.find(item => item.productId === productId)

    if (!currentItem) {
      return
    }

    const oldQuantity = currentItem.quantity

    if (quantity <= 0) {
      this.removeItem(productId)
      return
    }

    if (quantity > product.stock) {
      console.log(`Only ${product.stock} ${product.name}(s) available`)
      quantity = product.stock
    }

    // Only update if quantity actually changed
    if (quantity !== oldQuantity) {
      this.items.set(currentItems.map(item => (item.productId === productId ? { ...item, quantity } : item)))

      const diff = quantity - oldQuantity
      if (diff > 0) {
        this.activity.add(`➕ Added ${diff} more ${product.name} (now ${quantity})`)
      } else {
        this.activity.add(`➖ Removed ${-diff} ${product.name} (now ${quantity})`)
      }
    }
  }

  clear() {
    this.items.set([])
  }

  checkout() {
    if (this.isEmpty.get()) {
      return
    }

    const items = this.cartWithDetails.get()
    const total = this.total.get()
    const points = this.pointsToEarn.get()

    // Batch all signal updates to avoid multiple reaction runs
    this.graph.batch(() => {
      // Update inventory for all items at once
      const currentProducts = this.inventory.products.get()
      const updatedProducts = currentProducts.map(product => {
        const cartItem = items.find(item => item.productId === product.id)
        if (cartItem) {
          return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) }
        }
        return product
      })
      this.inventory.products.set(updatedProducts)

      // Update user stats
      this.customer.totalSpent.set(this.customer.totalSpent.get() + total)
      this.customer.orderCount.set(this.customer.orderCount.get() + 1)
      this.customer.loyaltyPoints.set(this.customer.loyaltyPoints.get() + points)

      // Clear cart
      this.items.set([])
    })

    console.log(`Order completed! Total: €${total.toFixed(2)}, Points earned: ${points}`)
    this.activity.add(`✅ Order completed! Total: €${total.toFixed(2)}, Earned: ${points} pts`, 'checkout')
  }
}
