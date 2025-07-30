'use client';

import React from 'react';

export default function SimpleChart() {
  console.log('🔴 SimpleChart: Component rendered');
  
  return (
    <div className="border-2 border-green-500 p-4 bg-green-50">
      <h3 className="text-green-800 font-bold">Simple Chart Test</h3>
      <p className="text-green-700">This is a basic React component without Chart.js</p>
      <div className="mt-2 h-32 bg-green-200 flex items-center justify-center">
        <span className="text-green-800">Chart placeholder area</span>
      </div>
    </div>
  );
}
