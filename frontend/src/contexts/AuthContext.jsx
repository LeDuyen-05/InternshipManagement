import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import apiClient from '../services/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'internship_token'
const USER_KEY = 'internship_user'

const isExpired = (token) => {
  try {
    const part = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/')
    const exp = JSON.parse(atob(part)).exp
    return !Number.isFinite(exp) || exp * 1000 <= Date.now()
  } catch {
    return true
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token || isExpired(token)) {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        return null
      }
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      return null
    }
  })

  const login = async (payload) => {
    const { data } = await apiClient.post('/auth/login', payload)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data))
    setUser(data)
    return data
  }

  const logout = ({ revoke = true } = {}) => {
    const token = localStorage.getItem(TOKEN_KEY)
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    localStorage.removeItem('selected_dot_thuc_tap')
    setUser(null)
    if (revoke && token) {
      void apiClient.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    }
  }

  const updateUser = (updates) => {
    setUser((current) => {
      const next = { ...current, ...updates }
      localStorage.setItem(USER_KEY, JSON.stringify(next))
      return next
    })
  }

  // Phiên đăng nhập cũ (trước khi có nhiều khoa) chưa lưu tên khoa: lấy lại từ hồ sơ tài khoản.
  useEffect(() => {
    if (user && (!user.hoTen || user.tenKhoa === undefined)) {
      apiClient.get('/auth/profile').then((res) => {
        updateUser({ hoTen: res.data?.hoTen || user.hoTen, maKhoa: res.data?.maKhoa ?? null, tenKhoa: res.data?.tenKhoa ?? null })
      }).catch(() => {})
    }
  }, [user?.token, user?.hoTen, user?.tenKhoa])

  const value = useMemo(() => ({ user, login, logout, updateUser }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { return useContext(AuthContext) }

/** Tên khoa của người đang đăng nhập; QTV, doanh nghiệp hoặc khi chưa rõ thì dùng cách gọi chung. */
export function useTenKhoa(fallback = 'Khoa') { return useContext(AuthContext)?.user?.tenKhoa || fallback }
