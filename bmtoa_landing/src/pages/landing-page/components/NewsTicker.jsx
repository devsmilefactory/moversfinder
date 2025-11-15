import React from 'react';
import Image from '../../../components/AppImage';

const NewsTicker = () => {
  const memberLogos = [
    { name: 'City Cabs Bulawayo', logo: 'https://via.placeholder.com/200x80/FFC107/424242?text=City+Cabs' },
    { name: 'Metro Taxi Services', logo: 'https://via.placeholder.com/200x80/FF6F00/FFFFFF?text=Metro+Taxi' },
    { name: 'Premier Transport Co', logo: 'https://via.placeholder.com/200x80/FFC107/424242?text=Premier+Transport' },
    { name: 'Reliable Rides Ltd', logo: 'https://via.placeholder.com/200x80/FF6F00/FFFFFF?text=Reliable+Rides' },
    { name: 'Express Taxi Group', logo: 'https://via.placeholder.com/200x80/FFC107/424242?text=Express+Taxi' },
    { name: 'Swift Cab Company', logo: 'https://via.placeholder.com/200x80/FF6F00/FFFFFF?text=Swift+Cab' },
    { name: 'Urban Mobility Solutions', logo: 'https://via.placeholder.com/200x80/FFC107/424242?text=Urban+Mobility' },
    { name: 'Professional Drivers Union', logo: 'https://via.placeholder.com/200x80/FF6F00/FFFFFF?text=Drivers+Union' }
  ];

  // Duplicate the array for seamless scrolling
  const duplicatedLogos = [...memberLogos, ...memberLogos];

  return (
    <section className="bg-white border-y border-border py-8 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-text-secondary">
            Trusted by Leading Taxi Companies in Bulawayo
          </h3>
        </div>
        
        <div className="relative">
          {/* Gradient Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white to-transparent z-10"></div>
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white to-transparent z-10"></div>
          
          {/* Scrolling Container */}
          <div className="flex animate-scroll-right">
            {duplicatedLogos?.map((member, index) => (
              <div
                key={`${member?.name}-${index}`}
                className="flex-shrink-0 mx-8 flex items-center justify-center"
              >
                <div className="bg-white rounded-lg p-4 shadow-card border border-border hover:shadow-elevation transition-shadow duration-200 w-32 h-20 flex items-center justify-center">
                  <Image
                    src={member?.logo}
                    alt={`${member?.name} logo`}
                    className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes scroll-right {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll-right {
          animation: scroll-right 30s linear infinite;
        }
        
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
};

export default NewsTicker;