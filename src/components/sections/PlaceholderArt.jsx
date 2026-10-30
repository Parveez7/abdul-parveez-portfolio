import React from 'react'

/**
 * Auto-detect any real image dropped into `src/assets/journey/<id>.{webp,jpg,jpeg,png}`
 */
const globImages = import.meta.glob(
  '../../assets/journey/*.{webp,jpg,jpeg,png}',
  { eager: true, import: 'default' }
)

const REAL_IMAGE_MAP = {}
for (const [path, url] of Object.entries(globImages)) {
  const match = path.match(/\/([^/]+)\.(webp|jpg|jpeg|png)$/i)
  if (match && match[1]) {
    REAL_IMAGE_MAP[match[1]] = url
  }
}

export function getRealJourneyImage(id) {
  return REAL_IMAGE_MAP[id] || null
}

/**
 * Renders either the auto-detected real image from `src/assets/journey/`
 * (lazy-decoded when within ~3.5 steps of the camera) OR a matte, moody,
 * warm-grey duotone SVG stand-in / ivory certificate document.
 */
export default function PlaceholderArt({
  entry,
  isNearCamera = true,
}) {
  const realUrl = getRealJourneyImage(entry.id)
  const isDev = import.meta.env.DEV
  const isCertificate = entry.imageType === 'certificate'

  // 1. Real Image Found in `src/assets/journey/`
  if (realUrl) {
    return (
      <div
        className={`journey-card__media ${
          isCertificate ? 'journey-card__media--certificate-mat' : ''
        }`}
      >
        {isNearCamera && (
          <img
            src={realUrl}
            alt={entry.title}
            loading="lazy"
            decoding="async"
            className={
              isCertificate
                ? 'journey-card__img journey-card__img--certificate'
                : 'journey-card__img journey-card__img--photo'
            }
            style={
              !isCertificate
                ? { objectPosition: entry.imageFocus || 'center center' }
                : undefined
            }
          />
        )}
      </div>
    )
  }

  // 2. Certificate Placeholder: Ivory paper document (#EDE8DF) on a dark mat (-1deg)
  if (isCertificate) {
    return (
      <div
        className="journey-card__media journey-card__media--certificate-mat"
        aria-hidden="true"
      >
        <div className="journey-cert-doc">
          <svg
            viewBox="0 0 180 230"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="journey-cert-svg"
          >
            {/* Outer double border */}
            <rect
              x="10"
              y="10"
              width="160"
              height="210"
              stroke="#B8B0A2"
              strokeWidth="1"
            />
            <rect
              x="14"
              y="14"
              width="152"
              height="202"
              stroke="#D2C9BA"
              strokeWidth="0.6"
            />

            {/* Header crest */}
            <circle cx="90" cy="38" r="10" stroke="#7A7267" strokeWidth="1" />
            <circle cx="90" cy="38" r="6" stroke="#7A7267" strokeWidth="0.6" />

            {/* Title rules */}
            <line x1="48" y1="62" x2="132" y2="62" stroke="#3A3632" strokeWidth="2.2" />
            <line x1="62" y1="72" x2="118" y2="72" stroke="#7A7267" strokeWidth="1" />

            {/* Recipient line */}
            <line x1="38" y1="94" x2="142" y2="94" stroke="#2C2926" strokeWidth="1.8" />
            <line x1="34" y1="98" x2="146" y2="98" stroke="#C2B9AA" strokeWidth="0.6" />

            {/* Body text lines */}
            <line x1="32" y1="114" x2="148" y2="114" stroke="#6E675F" strokeWidth="1" />
            <line x1="36" y1="123" x2="144" y2="123" stroke="#6E675F" strokeWidth="1" />
            <line x1="32" y1="132" x2="148" y2="132" stroke="#6E675F" strokeWidth="1" />
            <line x1="50" y1="141" x2="130" y2="141" stroke="#6E675F" strokeWidth="1" />

            {/* Ribbon & Crimson Seal */}
            <path d="M85 178 L80 202 L87 197 L90 203 L90 178 Z" fill="#9E2A35" />
            <path d="M95 178 L100 202 L93 197 L90 203 L90 178 Z" fill="#7D1E27" />
            <circle cx="90" cy="175" r="11" fill="#B82937" />
            <circle cx="90" cy="175" r="8" stroke="#E6C6B8" strokeWidth="0.6" strokeDasharray="2 1.5" />

            {/* Signatures */}
            <line x1="28" y1="184" x2="66" y2="184" stroke="#8C8378" strokeWidth="0.8" />
            <path d="M34 180 Q44 173 52 179 T62 176" stroke="#4A453F" strokeWidth="0.9" fill="none" />
            <line x1="114" y1="184" x2="152" y2="184" stroke="#8C8378" strokeWidth="0.8" />
            <path d="M120 180 Q130 174 138 179 T148 175" stroke="#4A453F" strokeWidth="0.9" fill="none" />
          </svg>
        </div>
        {isDev && <span className="journey-card__dev-badge">PLACEHOLDER</span>}
      </div>
    )
  }

  // 3. Category-Specific Moody Tonal Warm-Grey Duotone Photo Stand-In
  return (
    <div className="journey-card__media" aria-hidden="true">
      {renderCategoryArt(entry.category)}
      <div className="journey-card__media-vignette" />
      {isDev && <span className="journey-card__dev-badge">PLACEHOLDER</span>}
    </div>
  )
}

function renderCategoryArt(category) {
  switch (category) {
    case 'University':
      // Classical architectural facade with colonnade & warm light
      return (
        <svg viewBox="0 0 240 200" fill="none" className="journey-placeholder-svg">
          <defs>
            <linearGradient id="uniSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2A2725" />
              <stop offset="65%" stopColor="#3D3732" />
              <stop offset="100%" stopColor="#1B1918" />
            </linearGradient>
            <linearGradient id="uniStone" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#8B8175" />
              <stop offset="100%" stopColor="#4A443E" />
            </linearGradient>
          </defs>
          <rect width="240" height="200" fill="url(#uniSky)" />
          {/* Warm sunlight glow */}
          <circle cx="185" cy="52" r="46" fill="#6E5D4F" opacity="0.32" />
          {/* Pediment / Roof */}
          <polygon points="28,74 120,34 212,74" fill="#5D554D" stroke="#9E9386" strokeWidth="1" />
          <polygon points="40,72 120,40 200,72" fill="#3E3934" />
          {/* Entablature */}
          <rect x="32" y="74" width="176" height="10" fill="url(#uniStone)" />
          {/* Columns */}
          {[48, 76, 104, 132, 160, 188].map((cx) => (
            <g key={cx}>
              <rect x={cx - 5} y="84" width="10" height="72" fill="url(#uniStone)" />
              <rect x={cx - 7} y="84" width="14" height="4" fill="#A3988B" />
              <rect x={cx - 7} y="152" width="14" height="4" fill="#7D746A" />
            </g>
          ))}
          {/* Steps & Foreground plaza */}
          <rect x="24" y="156" width="192" height="6" fill="#635B52" />
          <rect x="16" y="162" width="208" height="8" fill="#4B453E" />
          <rect x="0" y="170" width="240" height="30" fill="#181716" />
          {/* Foliage silhouettes */}
          <circle cx="22" cy="110" r="28" fill="#1F1D1B" opacity="0.85" />
          <circle cx="222" cy="118" r="24" fill="#1F1D1B" opacity="0.85" />
        </svg>
      )

    case 'Projects':
      // Moody workstation with laptop screen & telemetry curves
      return (
        <svg viewBox="0 0 240 200" fill="none" className="journey-placeholder-svg">
          <rect width="240" height="200" fill="#1C1B1A" />
          {/* Desk surface */}
          <polygon points="0,152 240,152 240,200 0,200" fill="#262320" />
          <line x1="0" y1="152" x2="240" y2="152" stroke="#4D463F" strokeWidth="1" />
          {/* Laptop screen frame */}
          <rect x="46" y="48" width="148" height="96" rx="5" fill="#141312" stroke="#756C62" strokeWidth="1.5" />
          <rect x="52" y="54" width="136" height="82" fill="#23201E" />
          {/* Code / telemetry UI inside screen */}
          <rect x="60" y="62" width="42" height="4" fill="#8C8175" />
          <rect x="60" y="72" width="28" height="3" fill="#59524B" />
          <rect x="60" y="80" width="36" height="3" fill="#59524B" />
          <path
            d="M60 122 Q85 95 110 112 T155 82 L178 74"
            stroke="#B8ACA0"
            strokeWidth="1.6"
            fill="none"
          />
          <path
            d="M60 126 Q90 114 120 118 T178 96"
            stroke="#9E3B42"
            strokeWidth="1.2"
            fill="none"
          />
          {/* Laptop base */}
          <polygon points="34,144 206,144 218,154 22,154" fill="#635B53" />
          <rect x="102" y="145" width="36" height="3" rx="1" fill="#36322E" />
        </svg>
      )

    case 'Hackathons':
      // Stage banner, spotlight beams, and team silhouettes holding award check
      return (
        <svg viewBox="0 0 240 200" fill="none" className="journey-placeholder-svg">
          <rect width="240" height="200" fill="#1D1B1A" />
          {/* Stage lighting beams */}
          <polygon points="50,0 10,200 95,200" fill="#574E46" opacity="0.18" />
          <polygon points="190,0 145,200 230,200" fill="#574E46" opacity="0.18" />
          {/* Backdrop banner */}
          <rect x="28" y="24" width="184" height="76" fill="#2A2623" stroke="#574E45" strokeWidth="1" />
          <line x1="58" y1="44" x2="182" y2="44" stroke="#8C8175" strokeWidth="2" />
          <line x1="78" y1="56" x2="162" y2="56" stroke="#635B53" strokeWidth="1.2" />
          {/* Silhouettes of team on stage */}
          {[72, 104, 136, 168].map((px, idx) => (
            <g key={px}>
              <circle cx={px} cy={102 + (idx % 2) * 3} r="9" fill="#3B3631" stroke="#756C63" strokeWidth="0.8" />
              <path
                d={`M${px - 15} 175 L${px - 13} ${118 + (idx % 2) * 3} Q${px} ${112 + (idx % 2) * 3} ${px + 13} ${118 + (idx % 2) * 3} L${px + 15} 175 Z`}
                fill="#2E2A26"
                stroke="#59524B"
                strokeWidth="0.8"
              />
            </g>
          ))}
          {/* Award board held in center */}
          <rect x="78" y="128" width="84" height="34" rx="2" fill="#C9BFB2" stroke="#8C8175" strokeWidth="1" />
          <line x1="90" y1="140" x2="150" y2="140" stroke="#36322E" strokeWidth="1.8" />
          <line x1="96" y1="149" x2="144" y2="149" stroke="#6E665E" strokeWidth="1" />
          {/* Stage floor */}
          <rect x="0" y="172" width="240" height="28" fill="#141312" />
        </svg>
      )

    case 'Research':
      // Two-column academic publication layout & neural architecture graph
      return (
        <svg viewBox="0 0 240 200" fill="none" className="journey-placeholder-svg">
          <rect width="240" height="200" fill="#1A1918" />
          {/* Paper sheet */}
          <rect x="44" y="18" width="152" height="168" rx="2" fill="#302C28" stroke="#6B6259" strokeWidth="1" />
          {/* Paper Title & Abstract */}
          <line x1="66" y1="36" x2="174" y2="36" stroke="#B8ADA1" strokeWidth="2.2" />
          <line x1="82" y1="45" x2="158" y2="45" stroke="#857B70" strokeWidth="1.2" />
          {/* Left column text */}
          {[62, 69, 76, 83, 90, 97, 104, 111].map((ly) => (
            <line key={ly} x1="56" y1={ly} x2="112" y2={ly} stroke="#635B53" strokeWidth="1" />
          ))}
          {/* Right column diagram */}
          <rect x="124" y="60" width="58" height="52" stroke="#7A7067" strokeWidth="0.8" fill="#24211E" />
          <circle cx="136" cy="74" r="3" fill="#9E9286" />
          <circle cx="136" cy="96" r="3" fill="#9E9286" />
          <circle cx="154" cy="85" r="3.5" fill="#B53842" />
          <circle cx="170" cy="74" r="3" fill="#9E9286" />
          <circle cx="170" cy="96" r="3" fill="#9E9286" />
          <line x1="139" y1="74" x2="151" y2="85" stroke="#7A7067" strokeWidth="0.8" />
          <line x1="139" y1="96" x2="151" y2="85" stroke="#7A7067" strokeWidth="0.8" />
          <line x1="157" y1="85" x2="167" y2="74" stroke="#7A7067" strokeWidth="0.8" />
          <line x1="157" y1="85" x2="167" y2="96" stroke="#7A7067" strokeWidth="0.8" />
          {/* Bottom equations / lines */}
          {[128, 136, 144, 152, 160].map((ly) => (
            <line key={ly} x1="56" y1={ly} x2="182" y2={ly} stroke="#59524B" strokeWidth="1" />
          ))}
        </svg>
      )

    case 'Exchange':
      // Moody warm desert dusk & Dubai Burj skyline silhouette
      return (
        <svg viewBox="0 0 240 200" fill="none" className="journey-placeholder-svg">
          <defs>
            <linearGradient id="dubaiSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#26211E" />
              <stop offset="55%" stopColor="#4A3C33" />
              <stop offset="85%" stopColor="#6E5647" />
              <stop offset="100%" stopColor="#1A1715" />
            </linearGradient>
          </defs>
          <rect width="240" height="200" fill="url(#dubaiSky)" />
          {/* Warm setting sun */}
          <circle cx="166" cy="96" r="26" fill="#9C7A63" opacity="0.38" />
          {/* Burj Khalifa central spire silhouette */}
          <polygon
            points="114,162 117,78 119,46 121,18 122,46 124,78 127,162"
            fill="#1D1A18"
            stroke="#857568"
            strokeWidth="0.7"
          />
          <rect x="111" y="92" width="19" height="70" fill="#1D1A18" />
          <rect x="107" y="118" width="27" height="44" fill="#1D1A18" />
          {/* Surrounding skyline towers */}
          <rect x="42" y="114" width="16" height="48" fill="#24201D" />
          <rect x="64" y="98" width="18" height="64" fill="#1F1C19" />
          <rect x="86" y="124" width="16" height="38" fill="#26221F" />
          <rect x="142" y="104" width="20" height="58" fill="#1F1C19" />
          <rect x="168" y="118" width="15" height="44" fill="#24201D" />
          <rect x="188" y="128" width="18" height="34" fill="#292421" />
          {/* Water reflection baseline */}
          <rect x="0" y="162" width="240" height="38" fill="#141210" />
          <line x1="20" y1="162" x2="220" y2="162" stroke="#7A685A" strokeWidth="1" />
          <line x1="96" y1="170" x2="144" y2="170" stroke="#594C42" strokeWidth="0.8" />
          <line x1="108" y1="177" x2="132" y2="177" stroke="#473D35" strokeWidth="0.8" />
        </svg>
      )

    case 'Leadership':
      // Auditorium podium with microphones & subtle architectural ribs
      return (
        <svg viewBox="0 0 240 200" fill="none" className="journey-placeholder-svg">
          <rect width="240" height="200" fill="#1B1918" />
          {/* Architectural vertical ribs in background */}
          {[36, 68, 100, 132, 164, 196].map((rx) => (
            <line key={rx} x1={rx} y1="16" x2={rx} y2="155" stroke="#2E2A27" strokeWidth="2" />
          ))}
          {/* Podium / Lectern */}
          <polygon points="78,96 162,96 150,185 90,185" fill="#332E2A" stroke="#756B61" strokeWidth="1.2" />
          <rect x="70" y="88" width="100" height="10" rx="2" fill="#595047" />
          {/* Dual gooseneck microphones */}
          <path d="M104 88 Q100 66 112 62" stroke="#9E9286" strokeWidth="1.4" fill="none" />
          <circle cx="113" cy="61" r="2.5" fill="#B8ACA0" />
          <path d="M136 88 Q140 66 128 62" stroke="#9E9286" strokeWidth="1.4" fill="none" />
          <circle cx="127" cy="61" r="2.5" fill="#B8ACA0" />
          {/* Crest on lectern */}
          <circle cx="120" cy="130" r="12" stroke="#85796E" strokeWidth="1" />
          <circle cx="120" cy="130" r="4" fill="#9E3B42" />
        </svg>
      )

    case 'Milestones':
    default:
      // Sculptural monolithic award / convocation emblem on plinth
      return (
        <svg viewBox="0 0 240 200" fill="none" className="journey-placeholder-svg">
          <rect width="240" height="200" fill="#1B1918" />
          <circle cx="120" cy="88" r="54" fill="#3D3630" opacity="0.35" />
          {/* Plinth */}
          <rect x="78" y="148" width="84" height="28" fill="#2E2A26" stroke="#6E645B" strokeWidth="1" />
          <rect x="92" y="138" width="56" height="10" fill="#47413B" />
          {/* Sculptural Trophy / Medallion */}
          <polygon
            points="120,38 142,84 128,138 112,138 98,84"
            fill="#6E645A"
            stroke="#B8ADA0"
            strokeWidth="1.2"
          />
          <line x1="120" y1="38" x2="120" y2="138" stroke="#D1C6B8" strokeWidth="1" />
          <circle cx="120" cy="82" r="9" fill="#9E333C" stroke="#D1C6B8" strokeWidth="1" />
        </svg>
      )
  }
}
