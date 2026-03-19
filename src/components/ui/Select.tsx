import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {label}
            {props.required && <span className="text-red-400 ml-1 normal-case">*</span>}
          </label>
        )}
        <select
          id={selectId}
          ref={ref}
          className={`
            w-full px-3.5 py-2.5 rounded-xl text-sm font-medium
            text-white border outline-none transition-all duration-150 cursor-pointer
            appearance-none
            disabled:opacity-40 disabled:cursor-not-allowed
            focus:ring-2
            ${className}
          `}
          style={{
            background: 'rgba(255,255,255,0.05)',
            borderColor: error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='rgba(255,255,255,0.35)' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
            backgroundSize: '16px',
            paddingRight: '40px',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#00d68f'
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,214,143,0.12)'
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.1)'
            e.currentTarget.style.boxShadow = 'none'
            props.onBlur?.(e)
          }}
          {...props}
        >
          {placeholder && (
            <option value="" style={{ background: '#132619', color: 'rgba(255,255,255,0.35)' }}>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} style={{ background: '#132619', color: '#fff' }}>
              {opt.label}
            </option>
          ))}
        </select>
        {hint && !error && <p className="text-xs text-white/35">{hint}</p>}
        {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
