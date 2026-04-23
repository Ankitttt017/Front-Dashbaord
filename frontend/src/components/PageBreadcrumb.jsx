import { useLocation } from 'react-router-dom';

const PageBreadcrumb = () => {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);
  const labelMap = {
    'report': 'Analysis Report',
    'packing': 'Packing Line Control',
    'journey': 'Component Journey',
    'box-setup': 'Box Ledger Hub',
    'targets': 'Production Targets',
    'oee': 'OEE'
  };

  const currentLabel = segments.length > 0
    ? (labelMap[segments[segments.length - 1]] || segments[segments.length - 1].replace(/-/g, ' '))
    : 'Dashboard';

  if (segments.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center min-w-0">
      <span className="text-sm font-rajdhani font-semibold text-[var(--text-main)] tracking-wide capitalize truncate">
        {currentLabel}
      </span>
    </div>
  );
};

export default PageBreadcrumb;
