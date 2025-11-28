import { Observer } from '../../../src/index.js'
import CustomerProfile from './CustomerProfile.js'
import ProductGrid from './ProductGrid.js'
import Cart from './Cart.js'
import Analytics from './Analytics.js'
import ActivityFeed from './ActivityFeed.js'
import StockObserver from '../observers/StockObserver.js'
import LevelUpgradeObserver from '../observers/LevelUpgradeObserver.js'

// Root component that manages all views and observers
export default class App extends Observer {
  constructor(graph, store) {
    super(graph)
    this.store = store
    this.setup()
  }

  setup() {
    // Views
    this.addChild(new CustomerProfile(this.graph, this.store.customer))
    this.addChild(new ProductGrid(this.graph, this.store.inventory, this.store.cart))
    this.addChild(new Cart(this.graph, this.store.cart, this.store.customer))
    this.addChild(new Analytics(this.graph, this.store.analytics, this.store.inventory))
    this.addChild(new ActivityFeed(this.graph, this.store.activity))

    // Observers
    this.addChild(new StockObserver(this.graph, this.store.inventory, this.store.activity))
    this.addChild(new LevelUpgradeObserver(this.graph, this.store.customer, this.store.activity))
  }
}
