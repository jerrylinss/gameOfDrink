export default function DiceIcon({ size = 28 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <rect
        x="8"
        y="8"
        width="48"
        height="48"
        rx="14"
        fill="var(--cream)"
        stroke="var(--accent)"
        strokeWidth="2.4"
      />
      <circle cx="22" cy="22" r="4.2" fill="var(--bg-1)" />
      <circle cx="42" cy="22" r="4.2" fill="var(--bg-1)" />
      <circle cx="32" cy="32" r="4.2" fill="var(--bg-1)" />
      <circle cx="22" cy="42" r="4.2" fill="var(--bg-1)" />
      <circle cx="42" cy="42" r="4.2" fill="var(--bg-1)" />
    </svg>
  );
}
