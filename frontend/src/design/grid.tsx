export function GridBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        backgroundImage:
          'radial-gradient(var(--color-grid) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    />
  )
}
