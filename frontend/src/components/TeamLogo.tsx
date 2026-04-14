interface Props { url?: string | null; name: string; size?: number }

export default function TeamLogo({ url, name, size = 40 }: Props) {
  if (url) {
    return <img src={url} alt={name} width={size} height={size} className="rounded object-contain" style={{ width: size, height: size }} />
  }
  return (
    <div
      className="rounded flex items-center justify-center font-bold text-xs"
      style={{ width: size, height: size, background: 'var(--color-secondary)', color: 'var(--color-primary)', border: '1px solid var(--color-border)', flexShrink: 0 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}
