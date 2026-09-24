export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="lqBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6628b4" />
          <stop offset="55%" stopColor="#3a1169" />
          <stop offset="100%" stopColor="#15042c" />
        </linearGradient>
        <linearGradient id="lqGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff6dd" />
          <stop offset="45%" stopColor="#ffc531" />
          <stop offset="100%" stopColor="#d98705" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill="url(#lqBg)" />
      <circle
        cx="32"
        cy="33"
        r="21"
        stroke="url(#lqGold)"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <g
        stroke="url(#lqGold)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M21 12v11a4 4 0 0 0 8 0V12" />
        <path d="M25 23v13" />
        <ellipse cx="43" cy="18" rx="4.6" ry="6.2" />
        <path d="M43 24v12" />
      </g>
      <path
        d="M13 41h38a19 19 0 0 1-38 0Z"
        fill="url(#lqGold)"
        fillOpacity="0.92"
      />
      <path
        d="M11 41h42"
        stroke="url(#lqGold)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  size = 44,
  subtitle = true,
  className = "",
}: {
  size?: number;
  subtitle?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span className="flex flex-col leading-none">
        <span
          className="font-black text-brand-900"
          style={{ fontSize: size * 0.52 }}
        >
          لقمة
        </span>
        {subtitle && (
          <span
            className="font-extrabold tracking-[0.42em] text-gold-500"
            style={{ fontSize: size * 0.2 }}
          >
            LUQMA
          </span>
        )}
      </span>
    </span>
  );
}
