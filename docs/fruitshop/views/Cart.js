import { Observer } from '../../../src/index.js'
import CartItemList from './CartItemList.js'
import CartSummary from './CartSummary.js'

export default class Cart extends Observer {
  constructor(graph, cart, customer) {
    super(graph)
    this.cartModel = cart
    this.customer = customer
    this.setup()
  }

  setup() {
    // Own the child views
    this.addChild(new CartItemList(this.graph, this.cartModel))
    this.addChild(new CartSummary(this.graph, this.cartModel, this.customer))
  }
}
