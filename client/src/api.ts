import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sb_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      // Invalid or expired token: clear and redirect to login
      localStorage.removeItem('sb_token')
      try {
        window.dispatchEvent(
          new CustomEvent('sb:toast', { detail: { type: 'error', message: 'Session expired, please log in' } })
        )
      } catch (e) {
        console.error('Failed to dispatch toast event:', e)
      }
      if (typeof window !== 'undefined' && window.location.pathname !== '/') {
        window.location.href = '/'
      }
    }
    return Promise.reject(error)
  }
)

export default api