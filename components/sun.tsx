export function Sun({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="50" cy="50" r="20" fill="currentColor" />
      {Array.from({ length: 12 }, (_, i) => (
        <path
          key={i}
          d="M50 9V19"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${i * 30} 50 50)`}
        />
      ))}
    </svg>
  );
}
