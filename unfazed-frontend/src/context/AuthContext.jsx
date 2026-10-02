import { useEffect, useState } from 'react'
import api from '../api/axiosInstance'
import AuthContext from './authContext'

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('unfazed_token'))
  const [therapist, setTherapist] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return

    api.get('/auth/profile')
      .then(({ data }) => setTherapist(data.therapist))
      .catch(() => {
        localStorage.removeItem('unfazed_token')
        setToken(null)
        setTherapist(null)
      })
      .finally(() => setLoading(false))
  }, [token])

  const login = async (credentials) => {
    const { data } = await api.post('/auth/login', credentials)
    localStorage.setItem('unfazed_token', data.token)
    setToken(data.token)
    setTherapist(data.therapist)
    return data.therapist
  }

  const register = async (details) => {
    const { data } = await api.post('/auth/register', details)
    return data.therapist
  }

  const refreshProfile = async () => {
    const { data } = await api.get('/auth/profile')
    setTherapist(data.therapist)
    return data.therapist
  }

  const logout = () => {
    localStorage.removeItem('unfazed_token')
    setToken(null)
    setTherapist(null)
  }

  return (
    <AuthContext.Provider value={{ token, therapist, setTherapist, loading, login, register, refreshProfile, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
