import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axiosInstance'

function updateMeta(property, content) {
  let element = document.head.querySelector(`meta[property="${property}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute('property', property)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export default function PublicProfile() {
  const { slug } = useParams()
  const [profileState, setProfileState] = useState({ slug: null, therapist: null, error: '' })
  const loading = profileState.slug !== slug
  const therapist = loading ? null : profileState.therapist
  const error = loading ? '' : profileState.error

  useEffect(() => {
    let active = true
    api.get(`/therapists/${encodeURIComponent(slug)}`)
      .then(({ data }) => {
        if (active) setProfileState({ slug, therapist: data.therapist, error: '' })
      })
      .catch((requestError) => {
        if (active) setProfileState({
          slug,
          therapist: null,
          error: requestError.response?.data?.message || 'This profile could not be loaded.',
        })
      })

    return () => { active = false }
  }, [slug])

  useEffect(() => {
    if (!therapist) return
    const description = therapist.bio || `Learn about ${therapist.name}, their approach, and areas of focus.`
    document.title = `${therapist.name} | Unfazed`
    updateMeta('og:title', `${therapist.name} | Unfazed`)
    updateMeta('og:description', description)
    updateMeta('og:type', 'profile')
    updateMeta('og:url', window.location.href)
    const descriptionTag = document.head.querySelector('meta[name="description"]')
    if (descriptionTag) descriptionTag.setAttribute('content', description)
  }, [therapist])

  if (loading) return <main className="public-state">Loading profile…</main>
  if (error || !therapist) {
    return <main className="public-state"><p className="eyebrow">PROFILE NOT FOUND</p><h1>{error || 'This profile is unavailable.'}</h1><Link className="text-link" to="/login">Therapist sign in <span aria-hidden="true">→</span></Link></main>
  }

  return (
    <main className="public-profile-page">
      <header className="public-topbar">
        <Link className="wordmark" to="/">unfazed<span>.</span></Link>
        <span className="public-label">THERAPIST PROFILE</span>
      </header>
      <section className="profile-hero">
        <div className="profile-hero-copy">
          <p className="eyebrow">A SPACE FOR YOUR WELLBEING</p>
          <h1>{therapist.name}</h1>
          <p className="profile-lede">Thoughtful support, shaped around you.</p>
          {therapist.specializations?.length > 0 && (
            <div className="specialization-list" aria-label="Specializations">
              {therapist.specializations.map((item) => <span className="specialization-tag" key={item}>{item}</span>)}
            </div>
          )}
          <Link className="button button-primary profile-book-link" to={`/book/${therapist.slug}`}>Book a session <span aria-hidden="true">↗</span></Link>
          <Link className="text-link profile-intake-link" to={`/intake/${therapist.slug}`}>Complete client intake <span aria-hidden="true">→</span></Link>
          <Link className="text-link profile-intake-link" to={`/packages/${therapist.slug}`}>Explore session packages <span aria-hidden="true">→</span></Link>
        </div>
        <div className="portrait-shape" aria-hidden="true"><span>{therapist.name.slice(0, 1)}</span><i /></div>
      </section>

      <section className="public-content">
        <div className="about-section">
          <div><p className="eyebrow">01 / ABOUT</p><h2>A little about my practice</h2></div>
          <p className="about-copy">{therapist.bio || 'More about this therapist’s approach will be shared here soon.'}</p>
        </div>

        {therapist.services?.length > 0 && (
          <section className="services-section">
            <div className="section-heading"><div><p className="eyebrow">02 / SERVICES</p><h2>Ways we can work together</h2></div></div>
            <div className="service-grid">
              {therapist.services.map((service) => (
                <article className="service-card" key={service._id || service.title}>
                  <span className="service-number" aria-hidden="true">↗</span>
                  <h3>{service.title}</h3>
                  {service.description && <p>{service.description}</p>}
                </article>
              ))}
            </div>
          </section>
        )}

        {therapist.languages?.length > 0 && (
          <section className="languages-section">
            <p className="eyebrow">LANGUAGES</p>
            <p>{therapist.languages.join(' · ')}</p>
          </section>
        )}
      </section>
      <footer className="public-footer"><Link className="wordmark" to="/">unfazed<span>.</span></Link><span>A more considered space for care.</span></footer>
    </main>
  )
}