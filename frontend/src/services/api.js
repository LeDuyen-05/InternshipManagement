import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5100/api',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('internship_token')
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(r => r, (err) => {
  const url = err.config?.url || ''
  if (err.response?.status === 401 && !url.includes('/auth/login')) {
    const failedAuthorization = err.config?.headers?.Authorization
    const currentToken = localStorage.getItem('internship_token')
    if (!failedAuthorization || failedAuthorization === `Bearer ${currentToken}`) {
      localStorage.removeItem('internship_token')
      localStorage.removeItem('internship_user')
      if (window.location.pathname !== '/auth' && window.location.pathname !== '/auth/') {
        window.location.assign('/auth')
      }
    }
  }
  return Promise.reject(err)
})

export default apiClient
