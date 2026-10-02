import { useEffect, useState } from 'react'
import api from '../../api/axiosInstance'

export default function UpgradePrompt({ featureKey, currentTier, message }) {
  const [tiers, setTiers] = useState([])

  useEffect(() => {
    api.get('/entitlements/tiers')
      .then(({ data }) => setTiers(data.tiers))
      .catch(() => setTiers([]))
  }, [])

  return (
    <section className="upgrade-prompt" aria-live="polite">
      <div><p className="eyebrow">PLAN ACCESS</p><h2>This feature needs more room.</h2><p>{message || `Your current plan does not include ${featureKey}.`}</p><span className="current-plan">Current plan: {currentTier || 'Current subscription'}</span></div>
      <div className="upgrade-options">{tiers.filter((tier) => tier.key !== currentTier).map((tier) => <article className="upgrade-option" key={tier.key}><div><strong>{tier.name}</strong><span>Up to {tier.activeClientCap} active clients</span><span>{tier.analyticsDepth} analytics</span></div><p>{tier.description}</p></article>)}</div>
    </section>
  )
}