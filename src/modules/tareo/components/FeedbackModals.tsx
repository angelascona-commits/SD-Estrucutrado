import React from 'react'

interface AlertModalProps {
  isOpen: boolean
  message: string
  onClose: () => void
}

export function AlertModal({ isOpen, message, onClose }: AlertModalProps) {
  if (!isOpen) return null

  return (
    <div style={{ zIndex: 1100, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '380px', padding: '24px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#eab308' }}>⚠️</span> Atención
        </h3>
        <p style={{ margin: '0 0 24px 0', color: '#4b5563', fontSize: '14px', lineHeight: '1.5' }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ height: '38px', padding: '0 20px', borderRadius: '8px', border: 'none', background: '#111827', fontWeight: 600, color: '#fff', cursor: 'pointer', transition: '0.2s' }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}

interface ConfirmModalProps {
  isOpen: boolean
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ isOpen, message, onConfirm, onCancel }: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div style={{ zIndex: 1100, position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '380px', padding: '24px', position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#3b82f6' }}></span> Confirmación
        </h3>
        <p style={{ margin: '0 0 24px 0', color: '#4b5563', fontSize: '14px', lineHeight: '1.5' }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{ height: '38px', padding: '0 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', fontWeight: 600, color: '#374151', cursor: 'pointer', transition: '0.2s' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{ height: '38px', padding: '0 16px', borderRadius: '8px', border: 'none', background: '#2563eb', fontWeight: 600, color: '#fff', cursor: 'pointer', transition: '0.2s' }}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  )
}
