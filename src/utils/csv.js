export function toCsv(rows){
  if(!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = v=>{
    const s = v===undefined||v===null?'':String(v);
    return /[",\n,]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;
  };
  return [headers.join(',')].concat(rows.map(r=>headers.map(h=>esc(r[h])).join(','))).join('\n');
}
export function downloadCsv(filename, rows){
  const blob = new Blob([toCsv(rows)], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
