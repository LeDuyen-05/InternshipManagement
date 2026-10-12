import { createContext, useContext, useMemo, useState } from 'react'
import apiClient from '../services/api'

const AuthContext = createContext(null)
const TOKEN_KEY = 'internship_token'
const USER_KEY = 'internship_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem(USER_KEY) || 'null'))

  const login = async (payload) => {
    const { data } = await apiClient.post('/auth/login', payload)
    localStorage.setItem(TOKEN_KEY, data.token)
    localStorage.setItem(USER_KEY, JSON.stringify(data))
    setUser(data)
    return data
  }
  const logout = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); setUser(null) }
  const value = useMemo(() => ({ user, login, logout }), [user])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
export function useAuth() { return useContext(AuthContext) }
