import { View } from '../../../src/index.js'

// Displays store analytics metrics
export default class Analytics extends View {
  constructor(graph, analytics, inventory) {
    super(graph, {
      elementId: 'analytics-grid',
      templateId: 'analytics-item-template'
    })
    this.analytics = analytics
    this.inventory = inventory
    this.setup()
  }

  setup() {
    this.observe(() => this.render())
  }

  render() {
    const metrics = [
      { value: `€${this.analytics.avgOrderValue.get().toFixed(2)}`, label: 'Avg order value' },
      { value: `${this.analytics.cartFillRate.get().toFixed(1)}%`, label: 'Cart fill rate' },
      { value: `€${this.analytics.potentialRevenue.get().toFixed(2)}`, label: 'Potential revenue' },
      { value: `${this.inventory.lowStockProducts.get().length}`, label: 'Low stock items' }
    ]

    this.renderList(metrics, (metric, el) => {
      this.setText(el, '.analytics-value', metric.value)
      this.setText(el, '.analytics-label', metric.label)
    })
  }
}
