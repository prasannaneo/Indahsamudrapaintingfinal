import React from 'react';

export default function OptionCard({ label, selected, onSelect, description }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left border rounded-xl p-4 mb-3 ${selected ? 'border-black' : 'border-gray-300'}`}
      aria-pressed={selected}
    >
      <div className="flex items-center gap-3">
        <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${selected ? 'border-black' : 'border-gray-400'}`}>
          {selected ? <div className="w-3 h-3 rounded-full bg-black" /> : null}
        </div>
        <div className="font-semibold text-lg">Option {label}</div>
      </div>
      {description ? <div className="text-sm text-gray-600 mt-1">{description}</div> : null}
    </button>
  );
}
