import { useRef, useState, useEffect } from 'react'
import { Upload } from 'lucide-react'

const STORAGE_KEY = 'tv_logo_base64'

interface TVLogoProps {
  accentHex?: string
}

export function TVLogo({ accentHex = '#3b82f6' }: TVLogoProps) {
  const [logo, setLogo] = useState<string | null>(null)
  const [hover, setHover] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setLogo(saved)
  }, [])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      localStorage.setItem(STORAGE_KEY, base64)
      setLogo(base64)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div
      className="relative cursor-pointer flex-shrink-0"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => inputRef.current?.click()}
      title="Clique para trocar o logo"
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {logo ? (
        <img src={logo} alt="Logo" className="h-10 w-auto object-contain max-w-[160px]" />
      ) : (
        <div
          className="h-10 px-3 flex items-center gap-2 rounded-xl"
          style={{ border: `1px dashed ${accentHex}4d`, background: `${accentHex}0f` }}
        >
          <Upload size={14} style={{ color: `${accentHex}99` }} />
          <span className="text-xs font-medium" style={{ color: `${accentHex}99` }}>Subir logo</span>
        </div>
      )}

      {hover && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-sm" style={{ background: 'rgba(0,0,0,0.4)' }}>
          <Upload size={14} className="text-white" />
        </div>
      )}
    </div>
  )
}
