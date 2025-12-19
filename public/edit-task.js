// ensure axios talks to API and includes token from localStorage
axios.defaults.baseURL = '/api/v1'
const _token = localStorage.getItem('token')
if (_token) axios.defaults.headers.common['Authorization'] = `Bearer ${_token}`

// Apply theme if set
const savedTheme = localStorage.getItem('theme')
if (savedTheme === 'dark') {
  document.body.classList.add('dark-mode')
}

const taskIDDOM = document.querySelector('.task-edit-id')
const taskNameDOM = document.querySelector('.task-edit-name')
const taskCompletedDOM = document.querySelector('.task-edit-completed')
const editFormDOM = document.querySelector('.single-task-form')
const editBtnDOM = document.querySelector('.task-edit-btn')
const formAlertDOM = document.querySelector('.form-alert')
const params = window.location.search
const id = new URLSearchParams(params).get('id')
let tempName

const showTask = async () => {
  try {
    const {
      data: { singleTask },
    } = await axios.get(`/tasks/${id}`)
    const { _id: taskID, completed, name } = singleTask

    taskIDDOM.textContent = taskID
    taskNameDOM.value = name
    tempName = name
    if (completed) {
      taskCompletedDOM.checked = true
    }
  } catch (error) {
    if (error?.response?.status === 401) {
      // not authorized -> go back to auth page
      return (window.location.href = '/')
    }
    console.log(error)
  }
}

showTask()

editFormDOM.addEventListener('submit', async (e) => {
  editBtnDOM.textContent = 'Loading...'
  e.preventDefault()
  try {
    const taskName = taskNameDOM.value
    const taskCompleted = taskCompletedDOM.checked

    const {
      data: { updatedTask },
    } = await axios.patch(`/tasks/${id}`, {
      name: taskName,
      completed: taskCompleted,
    })

    const { _id: taskID, completed, name } = updatedTask

    taskIDDOM.textContent = taskID
    taskNameDOM.value = name
    tempName = name
    if (completed) {
      taskCompletedDOM.checked = true
    }
    formAlertDOM.style.display = 'block'
    formAlertDOM.textContent = `success, edited task`
    formAlertDOM.classList.add('text-success')
  } catch (error) {
    if (error?.response?.status === 401) {
      return (window.location.href = '/')
    }
    console.error(error)
    taskNameDOM.value = tempName
    formAlertDOM.style.display = 'block'
    formAlertDOM.innerHTML = `error, please try again`
  }
  editBtnDOM.textContent = 'Edit'
  setTimeout(() => {
    formAlertDOM.style.display = 'none'
    formAlertDOM.classList.remove('text-success')
  }, 3000)
})

// Sync token changes from other tabs: if token removed, redirect to auth
window.addEventListener('storage', (e) => {
  if (e.key !== 'token') return
  if (!e.newValue) {
    // logged out elsewhere
    try {
      delete axios.defaults.headers.common['Authorization']
    } catch (err) { }
    window.location.href = '/'
  } else {
    // token added/changed elsewhere
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${e.newValue}`
    } catch (err) { }
  }
})
