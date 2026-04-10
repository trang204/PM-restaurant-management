import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  CheckCircle,
  XCircle,
  Info,
  AlertTriangle,
  X,
  AlertCircle,
} from 'lucide-react'
import './NotificationsContext.css'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export type ConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type ToastItem = { id: string; message: string; variant: ToastVariant }

type NotificationsValue = {
  toast: (message: string, opts?: { variant?: ToastVariant }) => void
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const NotificationsContext = createContext<NotificationsValue | null>(null)

function nextId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const TOAST_DURATION = 4500

function ToastIcon({ variant }: { variant: ToastVariant }) {
  const size = 18
  if (variant === 'success') return <CheckCircle size={size} />
  if (variant === 'error')   return <XCircle size={size} />
  if (variant === 'warning') return <AlertTriangle size={size} />
  return <Info size={size} />
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [confirmOptions, setConfirmOptions] = useState<ConfirmOptions | null>(null)
  const confirmResolverRef = useRef<((value: boolean) => void) | null>(null)

  const removeToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback((message: string, opts?: { variant?: ToastVariant }) => {
    const id = nextId()
    const variant = opts?.variant ?? 'info'
    setToasts((t) => [...t, { id, message, variant }])
    window.setTimeout(() => removeToast(id), TOAST_DURATION)
  }, [removeToast])

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      confirmResolverRef.current = resolve
      setConfirmOptions(options)
    })
  }, [])

  const closeConfirm = useCallback((value: boolean) => {
    confirmResolverRef.current?.(value)
    confirmResolverRef.current = null
    setConfirmOptions(null)
  }, [])

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  return (
    <NotificationsContext.Provider value={value}>
      {children}

      {/* ── Toast region ── */}
      <div className="notify-toastRegion" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`notify-toast notify-toast--${t.variant}`} role="status">
            <span className="notify-toast__icon">
              <ToastIcon variant={t.variant} />
            </span>
            <span className="notify-toast__msg">{t.message}</span>
            <button
              type="button"
              className="notify-toast__close"
              aria-label="Đóng thông báo"
              onClick={() => removeToast(t.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Confirm dialog ── */}
      {confirmOptions ? (
        <div
          className="notify-backdrop"
          role="presentation"
          onClick={() => closeConfirm(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') closeConfirm(false) }}
        >
          <div
            className="notify-confirm"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={confirmOptions.title ? 'notify-confirm-title' : undefined}
            aria-describedby="notify-confirm-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`notify-confirm__icon ${confirmOptions.danger ? 'notify-confirm__icon--danger' : 'notify-confirm__icon--warning'}`}>
              {confirmOptions.danger
                ? <AlertCircle size={24} />
                : <AlertTriangle size={24} />}
            </div>

            {confirmOptions.title ? (
              <h2 id="notify-confirm-title" className="notify-confirm__title">
                {confirmOptions.title}
              </h2>
            ) : null}

            <p id="notify-confirm-desc" className="notify-confirm__msg">
              {confirmOptions.message}
            </p>

            <div className="notify-confirm__actions">
              <button
                type="button"
                className="notify-confirm__btn"
                onClick={() => closeConfirm(false)}
              >
                {confirmOptions.cancelLabel ?? 'Hủy'}
              </button>
              <button
                type="button"
                className={`notify-confirm__btn ${confirmOptions.danger ? 'notify-confirm__btn--danger' : 'notify-confirm__btn--confirm'}`}
                onClick={() => closeConfirm(true)}
              >
                {confirmOptions.confirmLabel ?? 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext)
  if (!ctx) {
    throw new Error('useNotifications phải dùng bên trong NotificationsProvider')
  }
  return ctx
}
