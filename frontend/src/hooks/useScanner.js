import { useEffect, useRef, useCallback } from 'react';

export const useScanner = (onScan) => {
  const bufferRef  = useRef('');
  const lockedRef  = useRef(false);
  const timerRef   = useRef(null);
  const onScanRef  = useRef(onScan);

  // Always keep latest onScan reference
  useEffect(() => { onScanRef.current = onScan; }, [onScan]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target.tagName.toLowerCase();
      if (['input', 'textarea', 'select'].includes(tag)) return;

      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        bufferRef.current = '';

        if (barcode.length >= 4 && !lockedRef.current) {
          lockedRef.current = true;
          onScanRef.current(barcode);   // ✅ always latest callback

          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            lockedRef.current = false;
          }, 1500);                     // ✅ 1.5s enough for double-fire prevention
        }
      } else {
        if (e.key.length === 1) {
          bufferRef.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timerRef.current);
    };
  }, []);   // ✅ empty deps — ref pattern se re-register nahi hoga
};