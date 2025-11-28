import { Graph } from '@tetsuo/signal'

// Create the reactive graph
const g = new Graph()

// State: Array of todo items
const todos = g.signal([])

// State: Current filter ('all', 'active', 'completed')
const filter = g.signal('all')

// State: ID of todo currently being edited (or null)
const editingId = g.signal(null)

// Computed: Filtered todos based on current filter
const filteredTodos = g.computed(() => {
  const allTodos = todos.get()
  const currentFilter = filter.get()

  if (currentFilter === 'active') {
    return allTodos.filter(todo => !todo.completed)
  }
  if (currentFilter === 'completed') {
    return allTodos.filter(todo => todo.completed)
  }
  return allTodos
})

// Computed: Count of active (incomplete) todos
const activeCount = g.computed(() => todos.get().filter(todo => !todo.completed).length)

// Computed: Count of completed todos
const completedCount = g.computed(() => todos.get().filter(todo => todo.completed).length)

// Computed: Are all todos completed?
const allCompleted = g.computed(() => {
  const allTodos = todos.get()
  return allTodos.length > 0 && allTodos.every(todo => todo.completed)
})

// Helper: Generate unique ID
let nextId = 1
function generateId() {
  return nextId++
}

// Actions: Todo operations
function addTodo(title) {
  const trimmed = title.trim()
  if (!trimmed) {
    return
  }

  const newTodo = {
    id: generateId(),
    title: trimmed,
    completed: false
  }

  todos.set([...todos.get(), newTodo])
}

function toggleTodo(id) {
  todos.set(todos.get().map(todo => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)))
}

function destroyTodo(id) {
  todos.set(todos.get().filter(todo => todo.id !== id))
}

function editTodo(id, newTitle) {
  const trimmed = newTitle.trim()

  if (!trimmed) {
    // Empty title means delete
    destroyTodo(id)
    return
  }

  todos.set(todos.get().map(todo => (todo.id === id ? { ...todo, title: trimmed } : todo)))
}

function toggleAll() {
  const shouldComplete = !allCompleted.get()
  todos.set(todos.get().map(todo => ({ ...todo, completed: shouldComplete })))
}

function clearCompleted() {
  todos.set(todos.get().filter(todo => !todo.completed))
}

// DOM References
const newTodoInput = document.querySelector('.new-todo')
const todoList = document.querySelector('.todo-list')
const footer = document.querySelector('.footer')
const todoCount = document.querySelector('.todo-count')
const toggleAllCheckbox = document.querySelector('#toggle-all')
const clearCompletedBtn = document.querySelector('.clear-completed')
const filterLinks = document.querySelectorAll('.filters a')

// Reaction: Render the todo list
g.reaction(() => {
  const currentTodos = filteredTodos.get()
  const editing = editingId.get()

  // Clear and rebuild the list
  todoList.innerHTML = ''

  currentTodos.forEach(todo => {
    const li = document.createElement('li')
    li.className = 'todo-item'
    if (todo.completed) {
      li.classList.add('completed')
    }
    if (todo.id === editing) {
      li.classList.add('editing')
    }

    li.innerHTML = `
      <div class="view">
        <input class="todo-toggle" type="checkbox" ${todo.completed ? 'checked' : ''}>
        <label class="todo-toggle-label"></label>
        <div class="todo-text">${escapeHtml(todo.title)}</div>
        <button class="destroy">×</button>
      </div>
      <input class="edit-input" value="${escapeHtml(todo.title)}">
    `

    // Event: Toggle completion
    const toggleCheckbox = li.querySelector('.todo-toggle')
    const toggleLabel = li.querySelector('.todo-toggle-label')
    toggleCheckbox.addEventListener('change', () => toggleTodo(todo.id))
    toggleLabel.addEventListener('click', () => toggleTodo(todo.id))

    // Event: Start editing on double click
    const todoText = li.querySelector('.todo-text')
    todoText.addEventListener('dblclick', () => {
      editingId.set(todo.id)
      // Focus the input after render
      setTimeout(() => {
        const input = li.querySelector('.edit-input')
        if (input) {
          input.focus()
          input.setSelectionRange(input.value.length, input.value.length)
        }
      }, 0)
    })

    // Event: Destroy todo
    const destroyBtn = li.querySelector('.destroy')
    destroyBtn.addEventListener('click', () => destroyTodo(todo.id))

    // Event: Handle editing
    const editInput = li.querySelector('.edit-input')

    editInput.addEventListener('blur', () => {
      if (editingId.get() === todo.id) {
        editTodo(todo.id, editInput.value)
        editingId.set(null)
      }
    })

    editInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        editTodo(todo.id, editInput.value)
        editingId.set(null)
      } else if (e.key === 'Escape') {
        editingId.set(null)
      }
    })

    todoList.appendChild(li)
  })
})

// Reaction: Update footer visibility and content
g.reaction(() => {
  const total = todos.get().length

  if (total === 0) {
    footer.classList.add('hidden')
    toggleAllCheckbox.parentElement.style.display = 'none'
  } else {
    footer.classList.remove('hidden')
    toggleAllCheckbox.parentElement.style.display = 'flex'
  }
})

// Reaction: Update active count display
g.reaction(() => {
  const count = activeCount.get()
  const plural = count === 1 ? 'item' : 'items'
  todoCount.textContent = `${count} ${plural} left`
})

// Reaction: Update "toggle all" checkbox state
g.reaction(() => {
  toggleAllCheckbox.checked = allCompleted.get()
})

// Reaction: Update "clear completed" button visibility
g.reaction(() => {
  const completed = completedCount.get()
  if (completed > 0) {
    clearCompletedBtn.style.display = 'block'
    clearCompletedBtn.textContent = `Clear completed (${completed})`
  } else {
    clearCompletedBtn.style.display = 'none'
  }
})

// Reaction: Update filter link styling
g.reaction(() => {
  const currentFilter = filter.get()
  filterLinks.forEach(link => {
    const href = link.getAttribute('href')
    if (
      (href === '#/' && currentFilter === 'all') ||
      (href === '#/active' && currentFilter === 'active') ||
      (href === '#/completed' && currentFilter === 'completed')
    ) {
      link.classList.add('selected')
    } else {
      link.classList.remove('selected')
    }
  })
})

// Event: Add new todo
newTodoInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    addTodo(newTodoInput.value)
    newTodoInput.value = ''
  }
})

// Event: Toggle all todos
toggleAllCheckbox.addEventListener('change', toggleAll)

// Event: Clear completed todos
clearCompletedBtn.addEventListener('click', clearCompleted)

// Event: Filter navigation
filterLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault()
    const href = link.getAttribute('href')

    if (href === '#/') {
      filter.set('all')
    } else if (href === '#/active') {
      filter.set('active')
    } else if (href === '#/completed') {
      filter.set('completed')
    }

    // Update URL hash
    window.location.hash = href
  })
})

// Initialize filter from URL hash
function updateFilterFromHash() {
  const hash = window.location.hash
  if (hash === '#/active') {
    filter.set('active')
  } else if (hash === '#/completed') {
    filter.set('completed')
  } else {
    filter.set('all')
  }
}

updateFilterFromHash()
window.addEventListener('hashchange', updateFilterFromHash)

// Utility: Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}
