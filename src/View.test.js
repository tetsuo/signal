import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import Graph from './Graph.js'
import View from './View.js'

describe('View', () => {
  let g
  let dom
  let document

  beforeEach(() => {
    g = new Graph()
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="app"></div>
          <template id="item-template">
            <div class="item">
              <span class="name"></span>
            </div>
          </template>
        </body>
      </html>
    `)
    document = dom.window.document
    global.document = document
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    delete global.document
  })

  it('creates view with element by ID', () => {
    const view = new View(g, { elementId: 'app' })
    expect(view.element).toBe(document.getElementById('app'))
  })

  it('creates view with element reference', () => {
    const el = document.createElement('div')
    const view = new View(g, { element: el })
    expect(view.element).toBe(el)
  })

  it('creates view without element', () => {
    const view = new View(g)
    expect(view.element).toBeNull()
  })

  it('creates view with template by ID', () => {
    const view = new View(g, { templateId: 'item-template' })
    expect(view.template).toBe(document.getElementById('item-template').content)
  })

  it('creates view with non-existent template ID', () => {
    const view = new View(g, { templateId: 'non-existent' })
    expect(view.template).toBeNull()
  })

  it('cloneTemplate clones the template', () => {
    const view = new View(g, { templateId: 'item-template' })
    const clone = view.cloneTemplate()
    expect(clone.querySelector('.item')).toBeDefined()
  })

  it('cloneTemplate throws if no template', () => {
    const view = new View(g, { elementId: 'app' })
    expect(() => view.cloneTemplate()).toThrow('No template defined')
  })

  it('clear removes all children', () => {
    const view = new View(g, { elementId: 'app' })
    view.element.innerHTML = '<div>child1</div><div>child2</div>'

    view.clear()

    expect(view.element.children.length).toBe(0)
  })

  it('clear does nothing without element', () => {
    const view = new View(g)
    view.clear() // should not throw
  })

  it('append adds node to element', () => {
    const view = new View(g, { elementId: 'app' })
    const div = document.createElement('div')
    div.className = 'new-item'

    view.append(div)

    expect(view.element.querySelector('.new-item')).toBe(div)
  })

  it('append does nothing without element', () => {
    const view = new View(g)
    const div = document.createElement('div')
    view.append(div) // should not throw
  })

  it('replaceContent replaces all children with node', () => {
    const view = new View(g, { elementId: 'app' })
    view.element.innerHTML = '<div>old</div>'
    const newDiv = document.createElement('div')
    newDiv.textContent = 'new'

    view.replaceContent(newDiv)

    expect(view.element.children.length).toBe(1)
    expect(view.element.textContent).toBe('new')
  })

  it('replaceContent does nothing without element', () => {
    const view = new View(g)
    const div = document.createElement('div')
    view.replaceContent(div) // should not throw
  })

  it('setText sets text content of child element', () => {
    const view = new View(g, { elementId: 'app' })
    view.element.innerHTML = '<span class="target"></span>'

    view.setText(view.element, '.target', 'Hello')

    expect(view.element.querySelector('.target').textContent).toBe('Hello')
  })

  it('setText does nothing if selector not found', () => {
    const view = new View(g, { elementId: 'app' })
    view.setText(view.element, '.nonexistent', 'Hello') // should not throw
  })

  it('toggleClass toggles class on selected element', () => {
    const view = new View(g, { elementId: 'app' })
    view.element.innerHTML = '<div class="target"></div>'

    view.toggleClass(view.element, '.target', 'active', true)
    expect(view.element.querySelector('.target').classList.contains('active')).toBe(true)

    view.toggleClass(view.element, '.target', 'active', false)
    expect(view.element.querySelector('.target').classList.contains('active')).toBe(false)
  })

  it('toggleClass toggles class on root if no selector', () => {
    const view = new View(g, { elementId: 'app' })

    view.toggleClass(view.element, null, 'active', true)

    expect(view.element.classList.contains('active')).toBe(true)
  })

  it('toggleClass does nothing if selector not found', () => {
    const view = new View(g, { elementId: 'app' })
    view.toggleClass(view.element, '.nonexistent', 'active', true) // should not throw
  })

  it('showEmpty creates and displays empty state message', () => {
    const view = new View(g, { elementId: 'app' })

    view.showEmpty('No items')

    expect(view.element.querySelector('.empty-state').textContent).toBe('No items')
  })

  it('showEmpty uses custom class name', () => {
    const view = new View(g, { elementId: 'app' })

    view.showEmpty('No items', 'custom-empty')

    expect(view.element.querySelector('.custom-empty').textContent).toBe('No items')
  })

  it('renderList renders items using template', () => {
    const view = new View(g, {
      elementId: 'app',
      templateId: 'item-template'
    })

    const items = [{ name: 'Apple' }, { name: 'Banana' }]

    view.renderList(items, (item, el) => {
      el.querySelector('.name').textContent = item.name
    })

    const rendered = view.element.querySelectorAll('.item')
    expect(rendered.length).toBe(2)
    expect(rendered[0].querySelector('.name').textContent).toBe('Apple')
    expect(rendered[1].querySelector('.name').textContent).toBe('Banana')
  })

  it('renderList throws without template', () => {
    const view = new View(g, { elementId: 'app' })

    expect(() => {
      view.renderList([{ name: 'test' }], () => {})
    }).toThrow('No template for renderList')
  })

  it('delegate sets up event delegation', () => {
    const view = new View(g, { elementId: 'app' })
    view.element.innerHTML = '<button class="btn">Click</button>'
    let clicked = false

    view.delegate('.btn', 'click', () => {
      clicked = true
    })

    const btn = view.element.querySelector('.btn')
    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }))

    expect(clicked).toBe(true)
  })

  it('delegate ignores events on elements outside', () => {
    const view = new View(g, { elementId: 'app' })
    view.element.innerHTML = '<button class="btn">Click</button>'
    let clicked = false

    view.delegate('.other', 'click', () => {
      clicked = true
    })

    const btn = view.element.querySelector('.btn')
    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }))

    expect(clicked).toBe(false)
  })

  it('delegate does nothing without element', () => {
    const view = new View(g)
    view.delegate('.btn', 'click', () => {}) // should not throw
  })

  it('onClick is shorthand for click delegation', () => {
    const view = new View(g, { elementId: 'app' })
    view.element.innerHTML = '<button class="btn">Click</button>'
    let clicked = false

    view.onClick('.btn', () => {
      clicked = true
    })

    const btn = view.element.querySelector('.btn')
    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }))

    expect(clicked).toBe(true)
  })

  it('dispose removes event listeners', () => {
    const view = new View(g, { elementId: 'app' })
    view.element.innerHTML = '<button class="btn">Click</button>'
    let clickCount = 0

    view.onClick('.btn', () => {
      clickCount++
    })

    const btn = view.element.querySelector('.btn')
    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }))
    expect(clickCount).toBe(1)

    view.dispose()

    btn.dispatchEvent(new dom.window.Event('click', { bubbles: true }))
    expect(clickCount).toBe(1) // no more clicks registered
  })

  it('dispose clears event delegates array', () => {
    const view = new View(g, { elementId: 'app' })
    view.onClick('.btn', () => {})

    view.dispose()

    expect(view._eventDelegates).toEqual([])
  })
})
