// src/components/Layout.tsx
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      {/* Global ambient glow — fixed, always visible */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0 rounded-full motion-safe-glow"
        style={{
          width: '800px',
          height: '600px',
          background: 'rgba(255, 138, 0, 0.05)',
          filter: 'blur(150px)',
        }}
      />
      <div
        className="fixed bottom-[-180px] right-[-160px] pointer-events-none z-0 rounded-full motion-safe-glow"
        style={{
          width: '620px',
          height: '520px',
          background: 'rgba(0, 209, 255, 0.045)',
          filter: 'blur(140px)',
          animationDelay: '-2s',
        }}
      />
      <div className="ambient-grid fixed inset-0 pointer-events-none z-0 opacity-60" />

      <Navbar />

      <main className="flex-1 pt-[60px] pb-16 relative z-10">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
