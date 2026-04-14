export default function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-lg p-4 text-sm" style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid rgba(255,59,48,0.3)', color: '#FF6B6B' }}>
      {message}
    </div>
  )
}
