import React, { useState } from 'react';

/**
 * Vite eager glob import for real journey assets placed in src/assets/journey/.
 * Any image matching entry.image (or entry.id) will automatically replace
 * the editorial SVG fallback without code changes.
 */
const journeyAssetModules = import.meta.glob(
  '../../assets/journey/*.{webp,jpg,jpeg,png,avif}',
  { eager: true, import: 'default' }
);

function resolveJourneyAssetUrl(entry) {
  if (!entry) return null;
  const candidates = [
    entry.image,
    `${entry.id}.webp`,
    `${entry.id}.jpg`,
    `${entry.id}.jpeg`,
    `${entry.id}.png`,
  ].filter(Boolean);

  for (const [modulePath, assetUrl] of Object.entries(journeyAssetModules)) {
    const fileName = modulePath.split('/').pop()?.toLowerCase();
    if (!fileName) continue;
    if (candidates.some((cand) => cand.toLowerCase() === fileName)) {
      return assetUrl;
    }
  }
  return null;
}

/**
 * Category-specific geometric line motifs for fallback cards whose image file is not yet added
 */
function renderCategoryMotif(category) {
  switch (category) {
    case 'University':
      return (
        <g stroke="rgba(245, 242, 238, 0.24)" strokeWidth="1.2" fill="none">
          <path d="M 46 156 L 46 74 L 120 42 L 194 74 L 194 156" />
          <line x1="34" y1="156" x2="206" y2="156" />
          <line x1="76" y1="156" x2="76" y2="92" />
          <line x1="120" y1="156" x2="120" y2="82" />
          <line x1="164" y1="156" x2="164" y2="92" />
          <circle cx="120" cy="64" r="6" stroke="#E8283C" strokeWidth="1.4" />
        </g>
      );
    case 'Projects':
      return (
        <g stroke="rgba(245, 242, 238, 0.24)" strokeWidth="1.2" fill="none">
          <rect x="44" y="48" width="152" height="104" rx="4" />
          <line x1="44" y1="70" x2="196" y2="70" />
          <circle cx="58" cy="59" r="2.5" fill="#E8283C" stroke="none" />
          <circle cx="68" cy="59" r="2.5" fill="rgba(245,242,238,0.35)" stroke="none" />
          <path d="M 76 112 L 106 88 L 134 122 L 166 96" stroke="#E8283C" strokeWidth="1.5" />
          <circle cx="106" cy="88" r="3.5" fill="#141416" stroke="#F5F2EE" />
          <circle cx="166" cy="96" r="3.5" fill="#E8283C" stroke="none" />
        </g>
      );
    case 'Hackathons':
      return (
        <g stroke="rgba(245, 242, 238, 0.24)" strokeWidth="1.2" fill="none">
          <polygon points="120,38 182,74 182,138 120,170 58,138 58,74" />
          <polygon
            points="120,58 162,82 162,128 120,150 78,128 78,82"
            stroke="rgba(232, 40, 60, 0.55)"
          />
          <circle cx="120" cy="104" r="6" fill="#E8283C" stroke="none" />
        </g>
      );
    case 'Research':
      return (
        <g stroke="rgba(245, 242, 238, 0.24)" strokeWidth="1.2" fill="none">
          <circle cx="96" cy="102" r="38" />
          <circle cx="144" cy="102" r="38" />
          <circle cx="120" cy="74" r="32" stroke="rgba(232, 40, 60, 0.55)" />
          <line x1="42" y1="154" x2="198" y2="154" stroke="rgba(245,242,238,0.16)" />
          <circle cx="120" cy="96" r="4" fill="#E8283C" stroke="none" />
        </g>
      );
    case 'Exchange':
      return (
        <g stroke="rgba(245, 242, 238, 0.24)" strokeWidth="1.2" fill="none">
          <circle cx="120" cy="102" r="52" />
          <ellipse cx="120" cy="102" rx="26" ry="52" />
          <line x1="68" y1="102" x2="172" y2="102" />
          <path d="M 76 78 Q 120 92 164 78" />
          <path d="M 76 126 Q 120 112 164 126" />
          <circle cx="142" cy="84" r="4.5" fill="#E8283C" stroke="none" />
        </g>
      );
    case 'Leadership':
      return (
        <g stroke="rgba(245, 242, 238, 0.24)" strokeWidth="1.2" fill="none">
          <circle cx="120" cy="64" r="10" stroke="#E8283C" strokeWidth="1.5" />
          <circle cx="72" cy="132" r="9" />
          <circle cx="168" cy="132" r="9" />
          <line x1="113" y1="72" x2="78" y2="124" />
          <line x1="127" y1="72" x2="162" y2="124" />
          <line x1="81" y1="132" x2="159" y2="132" strokeDasharray="3 3" />
        </g>
      );
    case 'Milestones':
    default:
      return (
        <g stroke="rgba(245, 242, 238, 0.24)" strokeWidth="1.2" fill="none">
          <path d="M 48 146 Q 120 42 192 146" />
          <line x1="40" y1="146" x2="200" y2="146" />
          <line x1="120" y1="42" x2="120" y2="146" strokeDasharray="3 4" />
          <circle cx="120" cy="92" r="7" fill="#E8283C" stroke="none" />
        </g>
      );
  }
}

const PlaceholderArt = React.memo(function PlaceholderArt({ entry }) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveJourneyAssetUrl(entry);
  const hasRealImage = Boolean(resolvedUrl) && !imgError;
  const isCertificate = entry?.imageType === 'certificate';
  const imgMeta = entry?.imageMeta || null;

  if (hasRealImage) {
    if (isCertificate) {
      return (
        <div
          className="journey-card__media journey-card__media--certificate-mat"
          data-image-aspect={imgMeta ? imgMeta.aspect : undefined}
        >
          <div className="journey-card__cert-frame">
            <img
              src={resolvedUrl}
              alt={entry.imageAlt || entry.title}
              width={imgMeta ? imgMeta.width : undefined}
              height={imgMeta ? imgMeta.height : undefined}
              loading="eager"
              decoding="async"
              onError={() => setImgError(true)}
              className="journey-card__img journey-card__img--certificate"
            />
          </div>
        </div>
      );
    }

    return (
      <div
        className="journey-card__media journey-card__media--photo"
        data-image-aspect={imgMeta ? imgMeta.aspect : undefined}
      >
        <img
          src={resolvedUrl}
          alt={entry.imageAlt || entry.title}
          width={imgMeta ? imgMeta.width : undefined}
          height={imgMeta ? imgMeta.height : undefined}
          loading="eager"
          decoding="async"
          onError={() => setImgError(true)}
          className="journey-card__img journey-card__img--photo"
          style={{
            objectPosition: entry.imageFocus || 'center center',
            maxWidth: imgMeta ? `${imgMeta.naturalWidth}px` : undefined,
            maxHeight: imgMeta ? `${imgMeta.naturalHeight}px` : undefined,
          }}
        />
      </div>
    );
  }

  // Fallback editorial plate when an entry's image file is not yet present (e.g., event-11)
  return (
    <div className="journey-card__media journey-card__media--photo-placeholder">
      <svg
        viewBox="0 0 240 200"
        className="journey-placeholder-svg"
        aria-label={entry?.imageAlt || entry?.title}
        role="img"
      >
        <defs>
          <linearGradient id={`plateGrad-${entry?.id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E1D1B" />
            <stop offset="55%" stopColor="#161515" />
            <stop offset="100%" stopColor="#111113" />
          </linearGradient>
        </defs>
        <rect width="240" height="200" fill={`url(#plateGrad-${entry?.id})`} />
        <g stroke="#222120" strokeWidth="1">
          <line x1="0" y1="40" x2="240" y2="40" />
          <line x1="0" y1="160" x2="240" y2="160" />
          <line x1="40" y1="0" x2="40" y2="200" />
          <line x1="200" y1="0" x2="200" y2="200" />
        </g>
        {renderCategoryMotif(entry?.category)}
        <text
          x="18"
          y="26"
          fill="#8E8B86"
          fontSize="8.5"
          fontFamily="Inter, sans-serif"
          letterSpacing="2.2"
        >
          {entry?.catalogueNumber || 'NO. 01'}
        </text>
        <text
          x="18"
          y="184"
          fill="#7A7874"
          fontSize="8"
          fontFamily="Inter, sans-serif"
          letterSpacing="2"
        >
          {(entry?.category || 'ARCHIVE').toUpperCase()} — {entry?.year}
        </text>
      </svg>
    </div>
  );
});

export default PlaceholderArt;
