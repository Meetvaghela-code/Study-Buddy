import React from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className={clsx(
            'w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-text-secondary',
            'transition-all duration-300 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
            icon && 'pl-10',
            className
          )}
          {...props}
        />
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
            {icon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}
      <textarea
        className={clsx(
          'w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-text-secondary',
          'transition-all duration-300 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: Array<{ value: string; label: string }>
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}
      <select
        className={clsx(
          'w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white',
          'transition-all duration-300 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20',
          error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
          className
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-red-500 text-sm mt-1">{error}</p>
      )}
    </div>
  )
}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...props }) => {
  return (
    <div className="flex items-center gap-3">
      <input
        type="checkbox"
        className="w-4 h-4 rounded accent-accent cursor-pointer"
        {...props}
      />
      {label && (
        <label className="text-sm text-white cursor-pointer">{label}</label>
      )}
    </div>
  )
}
