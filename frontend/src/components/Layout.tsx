// src/components/Layout.tsx
import { Outlet } from 'react-router-dom'
import { GridBackground } from '../design/grid'
import Navbar from './Navbar'
import Footer from './Footer'
import LiveBar from './LiveBar'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-bg)' }}>
      <GridBackground />

      <Navbar />

      <main className="flex-1 relative z-10" style={{ paddingTop: 56, paddingBottom: 64 }}>
        <Outlet />
      </main>

      <Footer />
      <LiveBar />
    </div>
  )
}
