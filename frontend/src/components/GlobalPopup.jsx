import { createContext, useContext, useState } from 'react';

const PopupContext = createContext({ showPopup: () => {} });

function GlobalPopup({ open, type = 'info', title, message, onClose }) {
  if (!open) return null;
  const tone = type === 'error'
    ? 'border-red-500/60 text-red-300'
    : type === 'success'
    ? 'border-emerald-500/60 text-emerald-300'
    : 'border-cyan-500/60 text-cyan-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`w-[320px] rounded-xl border bg-surface p-5 shadow-xl ${tone}`}>
        <div className="text-sm uppercase tracking-[0.2em] text-muted">{type}</div>
        <div className="mt-2 text-lg font-bold text-text">{title}</div>
        <div className="mt-2 text-sm text-text">{message}</div>
        <button
          className="mt-4 w-full rounded-md bg-card py-2 text-sm font-bold text-text border border-border"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}

export function PopupProvider({ children }) {
  const [popup, setPopup] = useState(null);

  const showPopup = (payload) => {
    setPopup({
      open: true,
      type: payload?.type || 'info',
      title: payload?.title || 'Notification',
      message: payload?.message || '',
    });
  };

  const closePopup = () => setPopup(null);

  return (
    <PopupContext.Provider value={{ showPopup }}>
      {children}
      <GlobalPopup
        open={Boolean(popup)}
        type={popup?.type}
        title={popup?.title}
        message={popup?.message}
        onClose={closePopup}
      />
    </PopupContext.Provider>
  );
}

export function usePopup() {
  return useContext(PopupContext);
}

export default GlobalPopup;
