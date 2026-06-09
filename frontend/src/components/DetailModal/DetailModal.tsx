import React, { ReactNode } from 'react'
import { X } from 'lucide-react'
import './DetailModal.css'

interface DetailModalProps {
  isOpen: boolean
  onClose: () => void
  title: ReactNode
  subtitle?: ReactNode
  children: ReactNode
  footerActions?: ReactNode
  width?: string | number
}

export default function DetailModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footerActions,
  width = 800,
}: DetailModalProps) {
  if (!isOpen) return null

  return (
    <div className="detail-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="detail-modal-container" 
        style={{ maxWidth: width }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-modal-header">
          <div className="detail-modal-header-text">
            <h2 className="detail-modal-title">{title}</h2>
            {subtitle && <p className="detail-modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="detail-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>
        
        <div className="detail-modal-body">
          {children}
        </div>

        {footerActions && (
          <div className="detail-modal-footer">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  )
}

DetailModal.Card = function DetailModalCard({ title, children, className = '' }: { title?: ReactNode, children: ReactNode, className?: string }) {
  return (
    <div className={`detail-modal-card ${className}`}>
      {title && <h3 className="detail-modal-card-title">{title}</h3>}
      <div className="detail-modal-card-content">
        {children}
      </div>
    </div>
  )
}

DetailModal.Row = function DetailModalRow({ label, value }: { label: ReactNode, value: ReactNode }) {
  return (
    <div className="detail-modal-row">
      <span className="detail-modal-row-label">{label}</span>
      <span className="detail-modal-row-value">{value}</span>
    </div>
  )
}

DetailModal.Table = function DetailModalTable({ children, className = '' }: { children: ReactNode, className?: string }) {
  return (
    <div className={`detail-modal-table-wrap ${className}`}>
      <table className="detail-modal-table">
        {children}
      </table>
    </div>
  )
}
