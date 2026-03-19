import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {label}
            {props.required && <span className="text-red-400 ml-1 normal-case">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full px-3.5 py-2.5 rounded-xl text-sm font-medium
            text-white placeholder:text-white/25 placeholder:font-normal
            outline-none transition-all duration-150
            ${error
              ? 'border border-red-500/40 focus:border-red-400 focus:ring-2 focus:ring-red-400/15'
              : 'border focus:ring-2'
            }
            disabled:opacity-40 disabled:cursor-not-allowed
            ${className}
          `}
          style={error ? {
            background: 'rgba(239,68,68,0.08)',
            borderColor: 'rgba(239,68,68,0.4)',
          } : {
            background: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.1)',
          }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = '#00d68f'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,214,143,0.12)'
              e.currentTarget.style.background = 'rgba(0,214,143,0.04)'
            }
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
            }
            props.onBlur?.(e)
          }}
          {...props}
        />
        {hint && !error && <p className="text-xs text-white/35">{hint}</p>}
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
