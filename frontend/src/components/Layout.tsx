// src/components/Layout.tsx
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-background)' }}>
      {/* Global ambient glow — fixed, always visible */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 pointer-events-none z-0 rounded-full"
        style={{
          width: '800px',
          height: '600px',
          background: 'rgba(255, 138, 0, 0.05)',
          filter: 'blur(150px)',
        }}
      />

      <Navbar />

      <main className="flex-1 pt-[60px] pb-16 relative z-10">
        <Outlet />
      </main>

      <Footer />
    </div>
  )
}
