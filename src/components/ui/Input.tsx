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
          <label htmlFor={inputId} className="text-xs font-medium text-[#71717a]">
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`
            w-full px-3 py-2 rounded-md text-sm
            bg-white text-[#09090b] placeholder:text-[#a1a1aa]
            border outline-none transition-all duration-150
            ${error
              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-[#e4e4e7] focus:border-[#09090b] focus:ring-2 focus:ring-[#09090b]/10'
            }
            disabled:bg-[#f4f4f5] disabled:text-[#a1a1aa] disabled:cursor-not-allowed
            ${className}
          `}
          {...props}
        />
        {hint && !error && <p className="text-xs text-[#a1a1aa]">{hint}</p>}
        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
