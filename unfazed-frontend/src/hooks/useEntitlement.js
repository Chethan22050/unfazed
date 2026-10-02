import { useEffect, useState } from 'react'
import api from '../api/axiosInstance'

export default function useEntitlement(featureKey) {
  const [state, setState] = useState(null)

  useEffect(() => {
    let active = true
    api.get('/entitlements/check', { params: { featureKey } })
      .then(({ data }) => {
        if (active) setState({ ...data, featureKey, loading: false, error: '' })
      })
      .catch((requestError) => {
        if (!active) return
        setState({
          ...requestError.response?.data,
          featureKey,
          loading: false,
          allowed: false,
          error: requestError.response?.data?.message || 'Could not verify feature access.',
        })
      })
    return () => { active = false }
  }, [featureKey])

  const current = state?.featureKey === featureKey ? state : null
  return {
    loading: !current || current.loading,
    allowed: Boolean(current?.allowed),
    tier: current?.tier || null,
    message: current?.message || current?.error || '',
    upgradeRequired: Boolean(current?.upgradeRequired),
    featureKey,
  }
}