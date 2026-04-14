export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex justify-center items-center py-12">
      <div
        className="rounded-full border-2 border-t-transparent animate-spin"
        style={{ width: size, height: size, borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }}
      />
    </div>
  )
}
