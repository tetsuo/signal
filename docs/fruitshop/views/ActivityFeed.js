import { View } from '@tetsuo/signal'

// Displays activity log entries
export default class ActivityFeed extends View {
  constructor(graph, activity) {
    super(graph, {
      elementId: 'activity-log',
      templateId: 'activity-item-template'
    })
    this.activity = activity
    this.emptyTemplate = document.getElementById('empty-state-template').content
    this.setup()
  }

  setup() {
    this.observe(() => this.render())
  }

  render() {
    const entries = this.activity.entries.get()

    if (entries.length === 0) {
      const empty = this.emptyTemplate.cloneNode(true)
      const el = empty.querySelector('.empty-state')
      el.textContent = 'No activity yet'
      el.style.cssText = 'text-align: center; color: #999; padding: 20px;'
      this.replaceContent(empty)
      return
    }

    this.renderList(entries, (entry, el) => {
      el.classList.add(entry.type)
      this.setText(el, '.activity-message', entry.message)
      this.setText(el, '.activity-time', entry.timestamp)
    })
  }
}
