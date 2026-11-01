import React from 'react'
import CollectionPage from '../common/CollectionPage'
import dubaiPhotoUrl from '../../assets/journey/event-10.webp'
import './ExchangePage.css'

export default function ExchangePage() {
  return (
    <CollectionPage
      eyebrowNum="03"
      eyebrowLabel="SEMESTER EXCHANGE"
      titleLead="A semester in"
      titleAccent="Dubai"
      subtitle="Studying abroad at Ajman University: the courses, the culture and what it changed."
      documentTitle="Semester Exchange | Abdul Parveez"
      nextPage={{ label: 'Projects', route: '/projects' }}
    >
      <div className="exchange-showcase">
        <article className="exchange-panel">
          <div className="exchange-panel__media">
            <img
              src={dubaiPhotoUrl}
              alt="Abdul Parveez in Dubai during student exchange"
              className="exchange-panel__img"
            />
            <div className="exchange-panel__media-overlay" />
          </div>

          <div className="exchange-panel__content">
            <div className="exchange-panel__badge">
              <span className="exchange-panel__dot" />
              <span>FALL 2025 · AJMAN UNIVERSITY</span>
            </div>

            <h2 className="exchange-panel__title">International Student Exchange</h2>
            <p className="exchange-panel__role">Dubai & Ajman, United Arab Emirates</p>

            <p className="exchange-panel__desc">
              Selected for an international semester abroad, immersing in advanced computer science coursework, cross-cultural collaboration, and expanding perspectives across global technology ecosystems.
            </p>

            <div className="exchange-panel__meta-grid">
              <div className="exchange-meta-item">
                <span className="exchange-meta-item__label">INSTITUTION</span>
                <span className="exchange-meta-item__val">Ajman University</span>
              </div>
              <div className="exchange-meta-item">
                <span className="exchange-meta-item__label">LOCATION</span>
                <span className="exchange-meta-item__val">United Arab Emirates</span>
              </div>
              <div className="exchange-meta-item">
                <span className="exchange-meta-item__label">FOCUS</span>
                <span className="exchange-meta-item__val">AI & Data Systems</span>
              </div>
            </div>

            <div className="exchange-panel__tags">
              <span className="exp-tag-chip">International Exchange</span>
              <span className="exp-tag-chip">Global Perspective</span>
              <span className="exp-tag-chip">Ajman University</span>
              <span className="exp-tag-chip">Dubai</span>
            </div>
          </div>
        </article>
      </div>
    </CollectionPage>
  )
}

