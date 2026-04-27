export function GridBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        backgroundImage:
          'radial-gradient(rgba(255,255,255,0.04) 1.25px, transparent 1.25px)',
        backgroundSize: '28px 28px',
      }}
    />
  )
}
