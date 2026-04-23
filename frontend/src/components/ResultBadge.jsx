const STYLES = {
    OK: { bg: 'var(--ok-bg)', color: 'var(--ok)', border: 'var(--ok-border)', label: 'OK' },
    NG: { bg: 'var(--ng-bg)', color: 'var(--ng)', border: 'var(--ng-border)', label: 'NG' },
    'IN PROGRESS': { bg: 'var(--warn-bg)', color: 'var(--warn)', border: 'var(--warn-border)', label: 'In Progress' },
};

export function normalizeResult(value) {
    if (!value || value === '') return 'IN PROGRESS';
    const v = String(value).trim().toUpperCase();
    if (v === 'OK') return 'OK';
    if (v === 'NG' || v === 'NOK' || v === 'FAIL') return 'NG';
    return 'IN PROGRESS';
}

const ResultBadge = ({ value }) => {
    const key = normalizeResult(value);
    const s = STYLES[key];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 10px', borderRadius: 'var(--radius-sm)',
            fontSize: '11px', fontFamily: 'var(--font-heading)',
            fontWeight: 600, letterSpacing: '0.02em',
            background: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
            whiteSpace: 'nowrap',
        }}>
            {s.label}
        </span>
    );
};
export default ResultBadge;
