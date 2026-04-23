import React from 'react';
import { STATION_MAP } from '../constants/stationMap';

const StationCard = ({ station, title, passed, failed, inProgress, selected = false, onClick }) => {
    const displayName = title || STATION_MAP[station] || station;

    // Border: red if NG>0, green if all OK, amber if has In Progress
    let borderColor = 'var(--ok-border)';
    if (failed > 0) borderColor = 'var(--ng)';
    else if (inProgress > 0) borderColor = 'var(--warn)';
    else if (passed > 0) borderColor = 'var(--ok)';

    const total = passed + failed; // exclude inProgress from passRate denominator according to rules
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    const primaryValue = failed > 0 ? failed : inProgress > 0 ? '' : passed;
    const primaryColor = failed > 0 ? 'var(--ng)' : inProgress > 0 ? 'var(--warn)' : 'var(--ok)';
    const primaryLabel = failed > 0 ? '' : inProgress > 0 ? '' : 'OK';
    const primaryValueSize = failed > 0 ? '18px' : '22px';

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
            background: 'var(--card)',
            border: `1px solid ${selected ? 'var(--primary)' : borderColor}`,
            borderRadius: 'var(--radius-md)',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            textAlign: 'left',
            boxShadow: selected ? '0 0 0 1px rgba(28,105,212,0.25), 0 14px 30px rgba(0,0,0,0.22)' : 'none',
            backgroundColor: selected ? 'var(--primary-dim)' : 'var(--card)',
            transition: 'all 180ms ease',
            cursor: 'pointer',
        }}>
            <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: 1.2 }}>
                {displayName}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <span style={{ fontSize: primaryValueSize, fontWeight: 700, fontFamily: 'var(--font-mono)', color: primaryColor, lineHeight: 1 }}>
                    {primaryValue}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: primaryColor }}>
                    {primaryLabel}
                </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '12px', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600, color: 'var(--ok)' }}>OK {passed}</span>
                <span />
                <span style={{ fontWeight: 500, color: 'var(--ng)' }}>NG {failed}</span>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--bg)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${passRate}%`, background: 'var(--ok)' }} />
            </div>
        </button>
    );
};
export default StationCard;

