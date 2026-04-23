import { useMemo } from 'react';

const CODE_39 = {
  '0':'nnnwwnwnn','1':'wnnwnnnnw','2':'nnwwnnnnw','3':'wnwwnnnnn',
  '4':'nnnwwnnnw','5':'wnnwwnnnn','6':'nnwwwnnnn','7':'nnnwnnwnw',
  '8':'wnnwnnwnn','9':'nnwwnnwnn','A':'wnnnnwnnw','B':'nnwnnwnnw',
  'C':'wnwnnwnnn','D':'nnnnwwnnw','E':'wnnnwwnnn','F':'nnwnwwnnn',
  'G':'nnnnnwwnw','H':'wnnnnwwnn','I':'nnwnnwwnn','J':'nnnnwwwnn',
  'K':'wnnnnnnww','L':'nnwnnnnww','M':'wnwnnnnwn','N':'nnnnwnnww',
  'O':'wnnnwnnwn','P':'nnwnwnnwn','Q':'nnnnnnwww','R':'wnnnnnwwn',
  'S':'nnwnnnwwn','T':'nnnnwnwwn','U':'wwnnnnnnw','V':'nwwnnnnnw',
  'W':'wwwnnnnnn','X':'nwnnwnnnw','Y':'wwnnwnnnn','Z':'nwwnwnnnn',
  '-':'nwnnnnwnw','.':'wwnnnnwnn',' ':'nwwnnnwnn','$':'nwnwnwnnn',
  '/':'nwnwnnnwn','+':'nwnnnwnwn','%':'nnnwnwnwn','*':'nwnnwnwnn',
};

function toBars(value) {
  const safe = String(value||'EMPTY').toUpperCase().replace(/[^0-9A-Z.\- +%\$\/]/g,'');
  const encoded = `*${safe||'EMPTY'}*`;
  const segs = [{ bar: false, w: 10 }];
  for (let ci = 0; ci < encoded.length; ci++) {
    const pat = CODE_39[encoded[ci]]; if (!pat) continue;
    for (let bi = 0; bi < pat.length; bi++)
      segs.push({ bar: bi%2===0, w: pat[bi]==='w'?3:1 });
    if (ci < encoded.length-1) segs.push({ bar: false, w: 1 });
  }
  segs.push({ bar: false, w: 10 });
  return segs;
}

const BarcodePreview = ({ value }) => {
  const bars = useMemo(() => toBars(value), [value]);
  const totalW = bars.reduce((s,b) => s+b.w, 0);
  let x = 0;
  return (
    <div className="bg-white p-2 rounded-xl shadow-inner inline-block w-full">
      <svg viewBox={`0 0 ${totalW} 70`} className="w-full h-16">
        {bars.map((b, i) => {
          const cx = x; x += b.w;
          return b.bar ? <rect key={i} x={cx} y={0} width={b.w} height={70} fill="#000" /> : null;
        })}
      </svg>
      <p className="text-center font-mono text-[10px] text-black mt-1 tracking-[0.3em] font-bold">
        {String(value||'EMPTY').toUpperCase()}
      </p>
    </div>
  );
};

export default BarcodePreview;
