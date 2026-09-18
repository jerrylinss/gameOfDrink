export default function WineGlassIcon({ size = 28 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wineFill" x1="18" y1="8" x2="46" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="1" stopColor="var(--wine-deep)" />
        </linearGradient>
      </defs>
      <path fill="url(#wineFill)" d="M20.5 14c.8 9.2 5.2 16.5 11.5 16.5S42.7 23.2 43.5 14Z" />
      <path
        fill="none"
        stroke="var(--cream)"
        strokeWidth="2.4"
        strokeLinecap="round"
        d="M18 8c1.2 12.8 6.6 24 14 24s12.8-11.2 14-24"
      />
      <path fill="none" stroke="var(--cream)" strokeWidth="2.2" strokeLinecap="round" d="M32 32v18" />
      <path
        fill="none"
        stroke="var(--cream)"
        strokeWidth="2.4"
        strokeLinecap="round"
        d="M22 54c3.2-2.2 6.6-3.2 10-3.2S38.8 51.8 42 54"
      />
      <path
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.7"
        d="M22.5 12.5h19"
      />
    </svg>
  );
}
