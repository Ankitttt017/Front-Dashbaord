import React from 'react';

export const getResultDisplay = (value) => {
  if (value === null || value === undefined || value === '') return 'IN PROCESS';
  const v = String(value).trim().toUpperCase();
  if (v === 'OK') return 'OK';
  if (v === 'NG' || v === 'NOK' || v === 'FAIL') return 'NG';
  return 'IN PROCESS';
};

const BadgeResult = ({ value }) => {
  const display = getResultDisplay(value);
  
  const styles = {
    'OK':         { bg: 'rgba(34,197,94,0.12)',  color: 'var(--accent)', border: 'rgba(34,197,94,0.3)' },
    'NG':         { bg: 'rgba(239,68,68,0.12)',  color: 'var(--danger)', border: 'rgba(239,68,68,0.3)' },
    'IN PROCESS': { bg: 'rgba(245,158,11,0.12)', color: 'var(--warn)',   border: 'rgba(245,158,11,0.3)' },
  };

  const s = styles[display];

  return (
    <span 
      className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[10px] font-rajdhani font-black tracking-wide whitespace-nowrap border backdrop-blur-sm"
      style={{ backgroundColor: s.bg, color: s.color, borderColor: s.border }}
    >
      {display}
    </span>
  );
};

export default BadgeResult;
