import React from 'react';
export default function OptionCard({label, img, selected, onSelect, onPreview}){
  return (
    <div className="card option" onClick={onSelect} role="button" tabIndex={0} style={{position:'relative', cursor:'pointer'}}>
      {selected && <div className="sel-ring"></div>}
      {selected && <div className="sel-check">Selected</div>}
      <img className="thumb" src={img} alt={`Option ${label}`} onClick={(e)=>{e.stopPropagation(); onPreview && onPreview(img, label);}}/>
      <div className="row" style={{justifyContent:'space-between', marginTop:10}}>
        <div style={{fontWeight:600}}>Option {label}</div>
        <div className="dot" style={{width:12, height:12, borderRadius:999, border:'2px solid #111', background:selected?'#111':'transparent'}} />
      </div>
    </div>
  );
}
