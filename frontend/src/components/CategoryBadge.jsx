const CATEGORY_MAP = {
    RR: { label: 'Rear Right', color: 'var(--primary)' },
    RL: { label: 'Rear Left', color: 'var(--text-main)' },
    FR: { label: 'Front Right', color: 'var(--ok)' },
    FL: { label: 'Front Left', color: 'var(--warn)' },
};

export function getCategory(barcode) {
    const suffix = String(barcode || '').slice(-2).toUpperCase();
    return CATEGORY_MAP[suffix] || { label: suffix || 'Unknown', color: 'var(--text-muted)' };
}

const CategoryBadge = ({ barcode }) => {
    const cat = getCategory(barcode);
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '2px 8px', borderRadius: 'var(--radius-sm)',
            fontSize: '11px', fontWeight: 600,
            color: cat.color,
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid var(--border)',
        }}>
            {cat.label}
        </span>
    );
};
export default CategoryBadge;
