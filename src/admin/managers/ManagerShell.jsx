import React from 'react';

const ManagerShell = ({ title, description, children, onCreate }) => (
  <div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-gray-400 text-sm">{description}</p>
      </div>
      {onCreate && (
        <button
          onClick={onCreate}
          className="px-4 py-2 rounded bg-custom-gold text-black font-bold hover:bg-white transition"
        >
          New
        </button>
      )}
    </div>
    {children}
  </div>
);

export default ManagerShell;
