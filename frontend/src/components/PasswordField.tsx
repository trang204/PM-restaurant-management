import { useId, useState } from 'react'

type Props = {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  /** class thêm cho wrapper (vd. authField--compact) */
  className?: string
}

function IconEyeOpen() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconEyeOff() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function PasswordField({
  label,
  value,
  onChange,
  autoComplete = 'current-password',
  required,
  disabled,
  placeholder,
  className = '',
}: Props) {
  const uid = useId()
  const inputId = `pw-${uid}`
  const [visible, setVisible] = useState(false)

  return (
    <div className={`authField ${className}`.trim()}>
      <label htmlFor={inputId} className="authField__label">
        {label}
      </label>
      <div className="authField__passwordWrap">
        <input
          id={inputId}
          className="authField__input authField__input--withToggle"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="authField__togglePw"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiển thị mật khẩu'}
          aria-pressed={visible}
          disabled={disabled}
        >
          {visible ? <IconEyeOff /> : <IconEyeOpen />}
        </button>
      </div>
    </div>
  )
}
