type DealIconProps = {
  size?: number;
};

export default function DealIcon({ size = 28 }: DealIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <rect x="8" y="20" width="48" height="34" rx="8" fill="var(--cream)" />
      <path
        d="M24 20v-4.5a8 8 0 0 1 16 0V20"
        fill="none"
        stroke="var(--bg-1)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <rect x="28" y="32" width="8" height="10" rx="2" fill="var(--bg-1)" />
      <path d="M8 34h48" stroke="var(--accent)" strokeWidth="2.4" opacity="0.85" />
    </svg>
  );
}
