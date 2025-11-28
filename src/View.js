import Observer from './Observer.js'

// View: base class for DOM-bound reactive views
export default class View extends Observer {
  constructor(graph, options = {}) {
    super(graph)

    // Resolve element
    if (options.elementId) {
      this.element = document.getElementById(options.elementId)
    } else if (options.element) {
      this.element = options.element
    } else {
      this.element = null
    }

    // Resolve template
    if (options.templateId) {
      const templateEl = document.getElementById(options.templateId)
      this.template = templateEl ? templateEl.content : null
    } else {
      this.template = null
    }

    this._eventDelegates = []
  }

  cloneTemplate() {
    if (!this.template) {
      throw new Error(`${this.constructor.name}: No template defined`)
    }
    return this.template.cloneNode(true)
  }

  // Clear the element's children
  clear() {
    if (this.element) {
      this.element.replaceChildren()
    }
  }

  // Append a node to the element
  append(node) {
    if (this.element) {
      this.element.appendChild(node)
    }
  }

  // Replace element content with a single node
  replaceContent(node) {
    if (this.element) {
      this.element.replaceChildren(node)
    }
  }

  // Set text content of a child element
  setText(root, selector, text) {
    const el = root.querySelector(selector)
    if (el) {
      el.textContent = text
    }
  }

  // Toggle a class on a child element
  toggleClass(root, selector, className, force) {
    const el = selector ? root.querySelector(selector) : root
    if (el) {
      el.classList.toggle(className, force)
    }
  }

  // Show element by creating from template and displaying message
  showEmpty(message, className = 'empty-state') {
    const div = document.createElement('div')
    div.className = className
    div.textContent = message
    this.replaceContent(div)
  }

  // Render a list of items using the template
  renderList(items, bindFn) {
    this.clear()

    if (!this.template) {
      throw new Error(`${this.constructor.name}: No template for renderList`)
    }

    const fragment = document.createDocumentFragment()

    items.forEach((item, index) => {
      const clone = this.template.cloneNode(true)
      // Get the first element child of the fragment
      const el = clone.firstElementChild
      if (el) {
        bindFn(item, el, index)
      }
      fragment.appendChild(clone)
    })

    this.append(fragment)
  }

  // Setup event delegation on the element
  delegate(selector, eventType, handler) {
    if (!this.element) {
      return
    }

    const delegateHandler = e => {
      const target = e.target.closest(selector)
      if (target && this.element.contains(target)) {
        handler(e, target)
      }
    }

    this.element.addEventListener(eventType, delegateHandler)
    this._eventDelegates.push({ eventType, handler: delegateHandler })
  }

  // Shorthand for click event delegation
  onClick(selector, handler) {
    this.delegate(selector, 'click', handler)
  }

  dispose() {
    // Remove delegated event listeners
    if (this.element) {
      for (const { eventType, handler } of this._eventDelegates) {
        this.element.removeEventListener(eventType, handler)
      }
    }
    this._eventDelegates = []

    super.dispose()
  }
}
