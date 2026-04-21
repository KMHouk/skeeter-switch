interface HeroGraphicProps {
  isOn: boolean;
  winterMode: boolean;
}

export const HeroGraphic = ({ isOn, winterMode }: HeroGraphicProps) => {
  const renderOnState = () => (
    <svg viewBox="0 0 800 160" style={{ width: '100%', height: '160px' }}>
      <defs>
        <linearGradient id="night-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0a0f1e', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#1e3a5f', stopOpacity: 1 }} />
        </linearGradient>
        <radialGradient id="glow-gradient">
          <stop offset="0%" style={{ stopColor: '#16a34a', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: '#16a34a', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <rect width="800" height="160" fill="url(#night-gradient)" />
      <circle cx="100" cy="40" r="1.5" fill="white" opacity="0.9" />
      <circle cx="250" cy="25" r="1" fill="white" opacity="0.7" />
      <circle cx="450" cy="35" r="1.2" fill="white" opacity="0.8" />
      <circle cx="650" cy="50" r="1" fill="white" opacity="0.6" />
      <circle cx="720" cy="30" r="1.3" fill="white" opacity="0.85" />
      <circle cx="180" cy="60" r="0.8" fill="white" opacity="0.5" />
      <ellipse cx="400" cy="145" rx="60" ry="8" fill="#000000" opacity="0.3" />
      <rect x="390" y="80" width="20" height="50" rx="2" fill="#6b7280" />
      <rect x="370" y="60" width="60" height="40" rx="4" fill="#4b5563" />
      <ellipse cx="400" cy="50" rx="35" ry="8" fill="#374151" />
      <circle cx="400" cy="70" r="60" fill="url(#glow-gradient)">
        <animate attributeName="r" values="60;70;60" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="400" cy="70" r="45" fill="url(#glow-gradient)">
        <animate attributeName="r" values="45;55;45" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <text x="400" y="155" textAnchor="middle" fill="white" fontSize="14" fontWeight="600" opacity="0.9">
        System Active
      </text>
    </svg>
  );

  const renderOffState = () => (
    <svg viewBox="0 0 800 160" style={{ width: '100%', height: '160px' }}>
      <defs>
        <linearGradient id="day-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#e0f2fe', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#bae6fd', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect width="800" height="160" fill="url(#day-gradient)" />
      <circle cx="120" cy="35" r="20" fill="#fbbf24" opacity="0.9" />
      <circle cx="120" cy="35" r="24" fill="#fbbf24" opacity="0.4" />
      <ellipse cx="400" cy="145" rx="60" ry="8" fill="#000000" opacity="0.15" />
      <rect x="390" y="80" width="20" height="50" rx="2" fill="#9ca3af" />
      <rect x="370" y="60" width="60" height="40" rx="4" fill="#6b7280" />
      <ellipse cx="400" cy="50" rx="35" ry="8" fill="#4b5563" />
      <text x="400" y="155" textAnchor="middle" fill="#1e293b" fontSize="14" fontWeight="600" opacity="0.8">
        System Offline
      </text>
    </svg>
  );

  const renderWinterMode = () => (
    <svg viewBox="0 0 800 160" style={{ width: '100%', height: '160px' }}>
      <defs>
        <linearGradient id="winter-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#94a3b8', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#cbd5e1', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect width="800" height="160" fill="url(#winter-gradient)" />
      <g transform="translate(120, 40)" opacity="0.7">
        <path d="M 0,-8 L 0,8 M -8,0 L 8,0 M -6,-6 L 6,6 M -6,6 L 6,-6" stroke="white" strokeWidth="1.5" fill="none" />
      </g>
      <g transform="translate(280, 55)" opacity="0.6">
        <path d="M 0,-6 L 0,6 M -6,0 L 6,0 M -4,-4 L 4,4 M -4,4 L 4,-4" stroke="white" strokeWidth="1.2" fill="none" />
      </g>
      <g transform="translate(620, 45)" opacity="0.65">
        <path d="M 0,-7 L 0,7 M -7,0 L 7,0 M -5,-5 L 5,5 M -5,5 L 5,-5" stroke="white" strokeWidth="1.3" fill="none" />
      </g>
      <ellipse cx="400" cy="145" rx="50" ry="6" fill="#000000" opacity="0.2" />
      <rect x="395" y="90" width="10" height="40" rx="1" fill="#9ca3af" opacity="0.6" />
      <rect x="380" y="75" width="40" height="30" rx="3" fill="#9ca3af" opacity="0.6" />
      <ellipse cx="400" cy="65" rx="25" ry="6" fill="#9ca3af" opacity="0.5" />
      <text x="400" y="155" textAnchor="middle" fill="#475569" fontSize="14" fontWeight="600" opacity="0.85">
        Stored for Winter ❄️
      </text>
    </svg>
  );

  return (
    <div className="hero-graphic-wrapper">
      {winterMode ? renderWinterMode() : isOn ? renderOnState() : renderOffState()}
    </div>
  );
};
