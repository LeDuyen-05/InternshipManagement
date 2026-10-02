import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// TODO: gắn interceptor đính kèm JWT token khi module đăng nhập hoàn thiện.

export default apiClient
