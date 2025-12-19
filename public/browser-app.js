// --- Auth + Dashboard SPA logic ---
const authContainer = document.querySelector('.auth-container')
const dashboard = document.querySelector('.dashboard')

const authForm = document.getElementById('auth-form')
const authTitle = document.getElementById('auth-title')
const toggleAuth = document.getElementById('toggle-auth')
const themeToggle = document.getElementById('theme-toggle')
const authUsername = document.getElementById('auth-username')
const authEmail = document.getElementById('auth-email')
const authPassword = document.getElementById('auth-password')
const authSubmit = document.getElementById('auth-submit')
const authAlert = document.getElementById('auth-alert')
const logoutBtn = document.getElementById('logout-btn')
// header username element removed; we only render into the sidebar

// Theme handling
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  document.body.classList.add('dark-mode')
}
if (themeToggle) {
  themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode')
    const isDark = document.body.classList.contains('dark-mode')
    localStorage.setItem('theme', isDark ? 'dark' : 'light')
  })
}

const tasksDOM = document.querySelector('.tasks')
const loadingDOM = document.querySelector('.loading-text')
const formDOM = document.querySelector('.task-form')
const taskInputDOM = document.querySelector('.task-input')
const formAlertDOM = document.querySelector('.form-alert')

let isLogin = true

// Helper: show auth or dashboard
const showAuth = () => {
  authContainer.style.display = 'block'
  dashboard.style.display = 'none'
}
const showDashboard = () => {
  authContainer.style.display = 'none'
  dashboard.style.display = 'block'
}

// Toggle login/register
toggleAuth.addEventListener('click', (e) => {
  e.preventDefault()
  isLogin = !isLogin
  authTitle.textContent = isLogin ? 'Login' : 'Register'
  toggleAuth.textContent = isLogin ? 'Register' : 'Login'
  // show/hide username field for login vs register
  authUsername.parentElement.style.display = isLogin ? 'none' : 'block'
})

// Initialize auth form UI state
authUsername.parentElement.style.display = 'none'

// Set axios base URL
axios.defaults.baseURL = '/api/v1'

// Set token if available and validate it
const token = localStorage.getItem('token')
const validateToken = async () => {
  try {
    // call a protected endpoint to ensure token is valid
    await axios.get('/tasks')
    return true
  } catch (err) {
    if (err?.response?.status === 401) return false
    // treat other errors (server down etc.) as valid token for now
    return true
  }
}

if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    ; (async () => {
      const ok = await validateToken()
      if (ok) {
        showDashboard()
        // fetch username if not stored
        if (!localStorage.getItem('username')) {
          try {
            const { data } = await axios.get('/auth/me')
            const { user } = data
            if (user && user.username) localStorage.setItem('username', user.username)
          } catch (err) {
            // ignore
          }
        }
        renderUser()
        // initialize socket and load tasks after dashboard shown
        initSocket()
        showTasks()
      } else {
        // invalid token: clear and show auth
        localStorage.removeItem('token')
        localStorage.removeItem('username')
        delete axios.defaults.headers.common['Authorization']
        showAuth()
      }
    })()
} else {
  showAuth()
}

// Socket client instance
let socket = null

function initSocket() {
  try {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    const token = localStorage.getItem('token')
    if (!token) return
    socket = io({ auth: { token } })
    socket.on('connect_error', (err) => {
      console.warn('Socket connect error', err.message)
    })
    // refresh task list when changes happen
    socket.on('task:added', (task) => {
      showTasks()
    })
    socket.on('task:updated', (task) => {
      showTasks()
    })
    socket.on('task:deleted', ({ id }) => {
      showTasks()
    })
  } catch (err) {
    console.warn('initSocket error', err)
  }
}

// Helper: show temporary styled alerts
const showAlert = (el, message, type = 'error', timeout = 3000) => {
  if (!el) return
  el.textContent = message
  el.style.display = 'block'
  el.classList.remove('text-success', 'text-danger')
  if (type === 'success') el.classList.add('text-success')
  else el.classList.add('text-danger')
  clearTimeout(el._hideTimer)
  el._hideTimer = setTimeout(() => {
    el.style.display = 'none'
    el.classList.remove('text-success', 'text-danger')
  }, timeout)
}

// Logout: clear token and redirect to the auth page (root)
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem('token')
  localStorage.removeItem('username')
  delete axios.defaults.headers.common['Authorization']
  // navigate back to root which shows auth UI
  window.location.href = '/'
})

// Listen for token changes in other tabs/windows (sync logout/login)
window.addEventListener('storage', (e) => {
  if (e.key !== 'token') return
  const newToken = e.newValue
  if (!newToken) {
    // token removed in another tab -> sign out here too
    try {
      localStorage.removeItem('username')
      delete axios.defaults.headers.common['Authorization']
      if (socket) {
        socket.disconnect()
        socket = null
      }
    } catch (err) {
      // ignore
    }
    // show auth UI without reloading
    showAuth()
  } else {
    // token added/changed in another tab -> update header and reconnect socket
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
      initSocket()
        // optionally fetch username and tasks
        ; (async () => {
          try {
            const { data } = await axios.get('/auth/me')
            if (data?.user?.username) localStorage.setItem('username', data.user.username)
          } catch (err) { }
          renderUser()
          showDashboard()
          showTasks()
        })()
    } catch (err) {
      // ignore
    }
  }
})

// Auth submit (login/register)
authForm.addEventListener('submit', async (e) => {
  e.preventDefault()
  authAlert.textContent = ''
  const username = authUsername.value.trim()
  const email = authEmail.value.trim()
  const password = authPassword.value.trim()

  try {
    if (isLogin) {
      const { data } = await axios.post('/auth/login', { email, password })
      const { token, user } = data
      localStorage.setItem('token', token)
      if (user && user.username) localStorage.setItem('username', user.username)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      renderUser()
      showDashboard()
      initSocket()
      showTasks()
    } else {
      const { data } = await axios.post('/auth/register', { username, email, password })
      const { token, user } = data
      localStorage.setItem('token', token)
      if (user && user.username) localStorage.setItem('username', user.username)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      renderUser()
      showDashboard()
      initSocket()
      showTasks()
    }
  } catch (err) {
    const msg = err?.response?.data?.message || 'Authentication failed'
    showAlert(authAlert, msg, 'error')
  }
})

// Render username in header
function renderUser() {
  try {
    const username = localStorage.getItem('username')
    const sidebarName = document.getElementById('sidebar-username')
    if (sidebarName) sidebarName.textContent = username ? username : ''
  } catch (err) {
    // ignore
  }
}

// ----------------------------------

// Load tasks from /api/tasks
const showTasks = async () => {
  loadingDOM.style.visibility = 'visible'
  try {
    const {
      data: { tasks },
    } = await axios.get('/tasks')

    if (!tasks || tasks.length < 1) {
      tasksDOM.innerHTML = '<h5 class="empty-list">No tasks in your list</h5>'
      loadingDOM.style.visibility = 'hidden'
      return
    }
    const allTasks = tasks
      .map((task) => {
        const { completed, _id: taskID, name, priority } = task
        return `<div class="single-task ${completed && 'task-completed'} priority-${(priority || 'Low').toLowerCase()}">
<h5><span><i class="far fa-check-circle"></i></span>${name}</h5>
<div class="task-links">
<a href="task.html?id=${taskID}"  class="edit-link">
<i class="fas fa-edit"></i>
</a>
<button type="button" class="delete-btn" data-id="${taskID}">
<i class="fas fa-trash"></i>
</button>
</div>
</div>`
      })
      .join('')
    tasksDOM.innerHTML = allTasks
  } catch (error) {
    tasksDOM.innerHTML = '<h5 class="empty-list">There was an error, please try later....</h5>'
  }
  loadingDOM.style.visibility = 'hidden'
}

// delete task /api/tasks/:id
tasksDOM.addEventListener('click', async (e) => {
  const el = e.target
  if (!el) return
  // When clicking the trash icon, the parent is the button; when clicking the button area, target might be button
  const btn = el.closest('.delete-btn')
  if (btn) {
    loadingDOM.style.visibility = 'visible'
    const id = btn.dataset.id
    try {
      await axios.delete(`/tasks/${id}`)
      showTasks()
    } catch (error) {
      console.log(error)
    }
    loadingDOM.style.visibility = 'hidden'
  }
})

// form
formDOM.addEventListener('submit', async (e) => {
  e.preventDefault()
  const name = taskInputDOM.value
  const prioritySelect = formDOM.querySelector('select[name="priority"]')
  const priority = prioritySelect ? prioritySelect.value : 'Low'

  try {
    await axios.post('/tasks', { name, priority })
    showTasks()
    taskInputDOM.value = ''
    showAlert(formAlertDOM, 'Success — task added', 'success')
  } catch (error) {
    showAlert(formAlertDOM, 'Error — please try again', 'error')
  }
  setTimeout(() => {
    formAlertDOM.style.display = 'none'
    formAlertDOM.classList.remove('text-success')
  }, 3000)
})
