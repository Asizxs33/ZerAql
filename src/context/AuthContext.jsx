import { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../api/index.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('zeraql_user')
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('zeraql_token')
    if (token) {
      api.getMe()
        .then(u => {
          setUser(u)
          localStorage.setItem('zeraql_user', JSON.stringify(u))
        })
        .catch(() => {
          const cached = localStorage.getItem('zeraql_user')
          if (!cached) {
            localStorage.removeItem('zeraql_token')
            localStorage.removeItem('zeraql_user')
          }
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { user, token } = await api.login(email, password)
    localStorage.setItem('zeraql_token', token)
    localStorage.setItem('zeraql_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const register = async (data) => {
    const { user, token } = await api.register(data)
    localStorage.setItem('zeraql_token', token)
    localStorage.setItem('zeraql_user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const logout = () => {
    localStorage.removeItem('zeraql_token')
    localStorage.removeItem('zeraql_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
