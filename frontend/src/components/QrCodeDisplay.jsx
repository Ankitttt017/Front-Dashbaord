import React from 'react';

const QrCodeDisplay = ({ dataUrl, label, size = 160 }) => {
  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-[var(--surface)] border border-[var(--primary)]/40 rounded flex items-center justify-center text-[11px] text-[var(--text-main)] text-center p-4 font-mono font-bold uppercase tracking-[0.12em] shadow-inner"
      >
        Waiting for<br />QR Generation
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="bg-white p-2 rounded" style={{ width: size + 16, height: size + 16 }}>
        <img src={dataUrl} alt="QR Code" width={size} height={size} style={{ imageRendering: 'pixelated' }} />
      </div>
      {label && <div className="mt-2 font-mono text-[12px] font-bold tracking-wider">{label}</div>}
    </div>
  );
};
export default QrCodeDisplay;
