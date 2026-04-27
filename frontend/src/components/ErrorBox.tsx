export default function ErrorBox({ message }: { message: string }) {
  return (
    <div
      style={{
        padding: 16,
        fontSize: 14,
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-alert)',
        background: 'var(--color-fire-soft)',
        border: '1px solid rgba(255,61,20,0.35)',
        borderRadius: 'var(--radius-sm)',
        letterSpacing: '0.05em',
      }}
    >
      {message}
    </div>
  )
}
