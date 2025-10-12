import React from 'react';
export default function OptionCard({label, img, selected, onSelect}){
  return (
    <div className={`card ${selected?'selected':''}`} onClick={onSelect} role="button" tabIndex={0}>
      <img className="option" src={img} alt={`Option ${label}`} />
      <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
        <div><strong>Option {label}</strong></div>
        <input type="radio" readOnly checked={selected} />
      </div>
    </div>
  );
}
