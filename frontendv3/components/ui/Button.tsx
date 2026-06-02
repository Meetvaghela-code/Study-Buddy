import React from 'react'
import Link from 'next/link'
import clsx from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  href?: string
  target?: string
  rel?: string
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  href,
  target,
  rel,
  ...props
}) => {
  const baseStyles = 'font-medium transition-all duration-300 ease-in-out rounded-lg inline-flex items-center justify-center gap-2 cursor-pointer'

  const variants = {
    primary: 'bg-gradient-to-r from-accent to-green-500 text-white hover:shadow-glow hover:scale-105 active:scale-95',
    secondary: 'bg-white text-dark-bg hover:bg-gray-100 active:scale-95',
    outline: 'border border-accent text-accent hover:bg-accent/10 active:scale-95',
    ghost: 'text-white hover:bg-white/10 active:scale-95',
  }

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  const buttonClasses = clsx(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className)

  if (href) {
    return (
      <Link href={href} target={target} rel={rel} className={buttonClasses}>
        {children}
      </Link>
    )
  }

  return (
    <button className={buttonClasses} {...props}>
      {children}
    </button>
  )
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
}

export const Card: React.FC<CardProps> = ({ hoverable = true, className, children, ...props }) => {
  return (
    <div
      className={clsx(
        'glass-effect rounded-2xl p-6 transition-all duration-300',
        hoverable && 'hover:shadow-glow hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', className, children, ...props }) => {
  const variants = {
    default: 'bg-accent/20 text-accent',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
  }

  return (
    <span
      className={clsx('px-3 py-1 rounded-full text-sm font-medium', variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}
