import { useEffect, useState, type CSSProperties } from 'react'

interface Props {
  text: string
  bracket?: boolean
  typewriter?: boolean
  charDelay?: number
  color?: string
}

export function TacticalLabel({ text, bracket = true, typewriter = false, charDelay = 12, color }: Props) {
  const fullText = bracket ? `[${text}]` : text
  const [shown, setShown] = useState(typewriter ? '' : fullText)

  useEffect(() => {
    if (!typewriter) {
      setShown(fullText)
      return
    }
    let i = 0
    setShown('')
    const id = window.setInterval(() => {
      i += 1
      setShown(fullText.slice(0, i))
      if (i >= fullText.length) window.clearInterval(id)
    }, charDelay)
    return () => window.clearInterval(id)
  }, [fullText, typewriter, charDelay])

  const style: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--text-mono-xs)',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: color ?? 'var(--color-data)',
  }
  return <span style={style}>{shown}</span>
}
