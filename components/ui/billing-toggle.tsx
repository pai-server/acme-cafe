'use client';

import { Badge } from './badge';

interface BillingToggleProps {
  interval: 'month' | 'year';
  onIntervalChange: (interval: 'month' | 'year') => void;
}

export function BillingToggle({ interval, onIntervalChange }: BillingToggleProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 mb-8">
      {/* Toggle Container */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => onIntervalChange('month')}
          className={`text-sm font-medium transition-all duration-200 px-3 py-1 rounded-md ${
            interval === 'month' 
              ? 'text-gray-900 bg-gray-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          aria-pressed={interval === 'month'}
        >
          Mensual
        </button>
        
        <button
          onClick={() => onIntervalChange(interval === 'month' ? 'year' : 'month')}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
            interval === 'year' ? 'bg-orange-600' : 'bg-gray-200'
          }`}
          aria-label={`Cambiar a facturación ${interval === 'month' ? 'anual' : 'mensual'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ease-in-out ${
              interval === 'year' ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        
        <button
          onClick={() => onIntervalChange('year')}
          className={`text-sm font-medium transition-all duration-200 px-3 py-1 rounded-md relative ${
            interval === 'year' 
              ? 'text-gray-900 bg-gray-100' 
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
          aria-pressed={interval === 'year'}
        >
          Anual
        </button>
      </div>
      
      {/* Badge with smooth transition */}
      <div className={`transition-all duration-300 ease-in-out ${
        interval === 'year' 
          ? 'opacity-100 transform translate-y-0' 
          : 'opacity-0 transform -translate-y-2 pointer-events-none'
      }`}>
        <Badge className="bg-green-100 text-green-800 border-green-200 font-medium">
          ✨ Ahorra 20%
        </Badge>
      </div>
    </div>
  );
} 