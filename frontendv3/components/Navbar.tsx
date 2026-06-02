'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Button } from './ui/Button'

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  const navLinks = [
    { href: '/learn', label: 'Learn' },
    { href: '/practice', label: 'Practice' },
    { href: '/coach', label: 'Coach' },
    { href: '/dashboard', label: 'Dashboard' },
  ]

  return (
    <nav className="fixed left-0 right-0 top-4 z-50 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-black/35 shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-4 sm:px-5 lg:px-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-green-500 transition-all duration-300 group-hover:scale-105 group-hover:shadow-glow">
              <span className="text-lg font-bold text-white">λ</span>
            </div>
            <span className="hidden text-xl font-bold gradient-text sm:inline">StudyBuddy</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-secondary transition-colors duration-300 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden items-center gap-4 sm:flex">
            <Button href="/login" variant="primary" size="sm">Get Started</Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white transition-colors hover:bg-white/10 md:hidden"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="border-t border-white/10 px-4 pb-4 pt-3 md:hidden">
            <div className="flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-xl px-4 py-3 text-white transition-colors hover:bg-white/10"
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-1">
                <Button href="/login" variant="primary" size="sm" fullWidth>Get Started</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
