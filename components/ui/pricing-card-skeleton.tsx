export function PricingCardSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
      {[1, 2].map((index) => {
        const isPopular = index === 2;
        
        return (
          <div key={index} className="relative">
            {isPopular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="bg-gray-200 animate-pulse px-6 py-2 rounded-full">
                  <div className="h-4 w-20 bg-gray-300 rounded"></div>
                </div>
              </div>
            )}
            
            <div className={`relative rounded-2xl border-2 p-8 bg-white transition-all duration-200 ${
              isPopular 
                ? 'border-gray-300 shadow-lg scale-105' 
                : 'border-gray-200'
            }`}>
              {/* Header */}
              <div className="text-center mb-8">
                <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mx-auto mb-2"></div>
                <div className="mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="h-12 w-20 bg-gray-200 animate-pulse rounded"></div>
                    <div className="h-6 w-16 bg-gray-200 animate-pulse rounded"></div>
                  </div>
                  <div className="h-4 w-32 bg-gray-200 animate-pulse rounded mx-auto"></div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 bg-gray-200 animate-pulse rounded-full"></div>
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-3 mb-8">
                {[1, 2, 3, 4, 5].map((featureIndex) => (
                  <div key={featureIndex} className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-gray-200 animate-pulse rounded-full mt-0.5 flex-shrink-0"></div>
                    <div className="h-4 bg-gray-200 animate-pulse rounded flex-1"></div>
                  </div>
                ))}
              </div>

              {/* Button */}
              <div className="w-full">
                <div className={`w-full h-12 rounded-lg animate-pulse ${
                  isPopular
                    ? 'bg-gradient-to-r from-gray-300 to-gray-400'
                    : 'bg-gray-300'
                }`}></div>
              </div>
              
              <div className="text-center mt-3">
                <div className="h-4 w-48 bg-gray-200 animate-pulse rounded mx-auto"></div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 