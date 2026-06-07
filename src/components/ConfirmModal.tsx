import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="confirm-box">
        <h3 id="confirm-title">{title}</h3>
        <p>{message}</p>
        <div className="confirm-actions">
          <button className="btn btn-outline" onClick={onCancel} autoFocus>
            {cancelLabel}
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        .confirm-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 16px;
        }
        .confirm-box {
          background: var(--surface);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: var(--border-radius);
          padding: 24px;
          max-width: 360px;
          width: 100%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .confirm-box h3 {
          margin: 0 0 10px;
          font-size: 1rem;
        }
        .confirm-box p {
          font-size: 0.875rem;
          opacity: 0.8;
          line-height: 1.5;
          margin: 0 0 20px;
        }
        .confirm-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
        .btn-danger {
          background: var(--error);
          color: #fff;
          border: none;
        }
      `}</style>
    </div>
  );
};

export default ConfirmModal;
