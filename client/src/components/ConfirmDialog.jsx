export default function ConfirmDialog({ open, title, message, confirmText = 'Confirm', danger = false, onConfirm, onCancel }) {
  if (!open) return null;
  return <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
    <div className="confirm-dialog" role="dialog" aria-modal="true" onMouseDown={(e) => e.stopPropagation()}>
      <h3>{title}</h3><p>{message}</p>
      <div className="dialog-actions"><button className="btn btn-ghost" onClick={onCancel}>Cancel</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm}>{confirmText}</button></div>
    </div>
  </div>;
}
