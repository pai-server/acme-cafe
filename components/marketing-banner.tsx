'use client';

import { ExternalLink, Github } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function MarketingBanner() {
  const [isExpanded, setIsExpanded] = useState(true);

  // Persist banner state in localStorage
  useEffect(() => {
    const collapsed = localStorage.getItem('marketing-banner-collapsed');
    if (collapsed === 'true') {
      setIsExpanded(false);
    }
  }, []);

  const handleCollapse = () => {
    setIsExpanded(false);
    localStorage.setItem('marketing-banner-collapsed', 'true');
  };

  const handleExpand = () => {
    setIsExpanded(true);
    localStorage.removeItem('marketing-banner-collapsed');
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-all duration-300 ${
      isExpanded ? 'left-4 md:left-auto md:max-w-md' : 'left-auto'
    } animate-fade-in-up`}>
      
      {/* Collapsed State - Bubble */}
      {!isExpanded && (
        <button
          onClick={handleExpand}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 group"
          aria-label="Expandir información"
        >
          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center group-hover:rotate-12 transition-transform">
            <Github className="w-3 h-3 text-blue-600" />
          </div>
        </button>
      )}

      {/* Expanded State - Full Card */}
      {isExpanded && (
        <div className="bg-blue-600 text-white rounded-lg shadow-2xl p-4 relative overflow-hidden border border-blue-500/20 w-full">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
          </div>
          
          {/* Minimize button */}
          <button
            onClick={handleCollapse}
            className="absolute top-2 right-2 p-3 hover:bg-white/20 rounded-full transition-colors group z-10"
            aria-label="Minimizar banner"
          >
            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
            </svg>
          </button>

          <div className="relative">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                <Github className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-sm font-semibold">SaaS Starter</span>
            </div>

                      {/* Content */}
          <h3 className="text-lg font-bold mb-1 leading-tight">
            Este sitio es una demo de Stripe Billing para suscripciones
          </h3>
          <p className="text-sm text-blue-100 mb-4 leading-relaxed">
            Acme Cafes no es un producto real.
          </p>

            {/* Action button */}
            <Button
              variant="secondary"
              size="sm"
              className="bg-white text-blue-600 hover:bg-blue-50 font-semibold"
              asChild
            >
              <a
                href={process.env.NEXT_PUBLIC_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                Ver documentación
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 