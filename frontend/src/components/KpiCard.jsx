// Used on Dashboard and Report summary
const KpiCard = ({ label, value, sub, color = 'primary', icon: Icon }) => {
    const colors = {
        ok: { val: 'var(--ok)', top: 'var(--ok)', glow: 'var(--ok-bg)' },
        ng: { val: 'var(--ng)', top: 'var(--ng)', glow: 'var(--ng-bg)' },
        warn: { val: 'var(--warn)', top: 'var(--warn)', glow: 'var(--warn-bg)' },
        primary: { val: 'var(--primary)', top: 'var(--primary)', glow: 'var(--primary-dim)' },
    };
    const c = colors[color] || colors.primary;
    return (
        <div style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: '20px',
            borderTop: `3px solid ${c.top}`,
            transition: 'transform 0.2s',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{
                    fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)',
                    textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0
                }}>{label}</p>
                {Icon && <Icon size={18} color={c.val} />}
            </div>
            <p style={{
                fontSize: '32px', fontWeight: 700, fontFamily: 'var(--font-mono)',
                color: c.val, lineHeight: 1, margin: 0
            }}>{value}</p>
            {sub && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', marginBottom: 0 }}>{sub}</p>}
        </div>
    );
};
export default KpiCard;
