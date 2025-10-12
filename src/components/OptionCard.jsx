import React from 'react';
export default function OptionCard({label, img, selected, onSelect, onPreview}){
  return (
    <div
      className={`card option ${selected?'selected':''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      style={{cursor:'pointer'}}
    >
      <img className="option" src={img} alt={`Option ${label}`} onClick={(e)=>{e.stopPropagation(); onPreview && onPreview(img, label);}} />
      <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
        <div><strong>Option {label}</strong></div>
        <div className={`dot ${selected?'on':''}`}></div>
      </div>
      <style>{`
        .card.option { transition: transform .15s ease, box-shadow .15s ease; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
        .card.option:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,.12); }
        .dot { width: 14px; height: 14px; border-radius: 50%; border:2px solid #333; }
        .dot.on { background: #111; }
      `}</style>
    </div>
  );
}
