import { createContext, useContext, useState } from 'react'

// Context kỹ thuật cho đăng nhập/phân quyền — KHÔNG thuộc sơ đồ lớp phân tích.
// Nội dung cụ thể (JWT, roles) sẽ hoàn thiện khi module Auth được triển khai.
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
