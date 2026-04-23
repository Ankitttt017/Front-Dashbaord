const SHIFT_COLORS = {
    A: { bg: 'var(--primary-dim)', color: 'var(--primary)', border: 'var(--primary-glow)' },
    B: { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-main)', border: 'var(--border)' },
    C: { bg: 'var(--warn-bg)', color: 'var(--warn)', border: 'var(--warn-border)' },
    DEFAULT: { bg: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: 'var(--border)' },
};

const ShiftBadge = ({ shift }) => {
    const normalizedShift = String(shift || '').trim().toUpperCase();
    const s = SHIFT_COLORS[normalizedShift] || SHIFT_COLORS.DEFAULT;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 'var(--radius-sm)',
            fontSize: '11px', fontWeight: 600,
            background: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
        }}>
            {SHIFT_COLORS[normalizedShift] ? normalizedShift : '-'}
        </span>
    );
};
export default ShiftBadge;
