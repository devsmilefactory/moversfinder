import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import PWAInstallPrompt from '../../../components/PWAInstallPrompt';

const HeroSection = () => {
  const navigate = useNavigate();

  const trustIndicators = [
    { label: 'Trusted', icon: 'Shield', position: 'top-6 left-6' },
    { label: 'Reliable', icon: 'Clock', position: 'top-6 right-6' },
    { label: 'Local', icon: 'MapPin', position: 'bottom-6 left-1/2 transform -translate-x-1/2' }
  ];

  const handleJoinNow = () => {
    navigate('/sign-up');
  };

  const handleLearnMore = () => {
    const element = document.getElementById('benefits');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleDownloadApp = () => {
    // Get PWA app URL from environment or use default
    const pwaUrl = import.meta.env.VITE_PWA_URL || 'http://localhost:4030';

    // Open PWA app in new tab where user can install it
    window.open(pwaUrl, '_blank');
  };

  return (
    <section id="hero" className="relative min-h-screen bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23000000%22%20fill-opacity%3D%220.1%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[85vh]">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-700 leading-tight">
                BMTOA
              </h1>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-text-primary">
                Bulawayo Metered Taxi Operators Association
              </h2>
              <div className="flex items-center justify-center lg:justify-start space-x-2 text-lg sm:text-xl text-text-secondary font-medium">
                <Icon name="Car" size={24} className="text-primary" />
                <p>Your Path to Success & Better Operating Conditions</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <p className="text-lg text-text-secondary leading-relaxed">
                Join Zimbabwe's most trusted metered taxi association and unlock exclusive access to our e-hailing platform, professional certification, advanced support programs, and a network of 85+ professional operators and drivers.
              </p>
              <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                <div className="flex items-center space-x-2">
                  <Icon name="Users" size={16} className="text-primary" />
                  <span>85+ Active Members</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon name="Star" size={16} className="text-accent" />
                  <span>95% Satisfaction</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Icon name="Calendar" size={16} className="text-primary" />
                  <span>Est. 2018</span>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="default"
                size="lg"
                onClick={handleJoinNow}
                iconName="UserPlus"
                iconPosition="left"
                className="text-lg px-8 py-4"
              >
                Join Now
              </Button>
              <Button
                variant="dark-blue-grey"
                size="lg"
                onClick={handleLearnMore}
                iconName="Info"
                iconPosition="left"
                className="text-lg px-8 py-4"
              >
                Learn More
              </Button>
              <PWAInstallPrompt
                variant="outline"
                size="lg"
                className="border-primary text-primary hover:bg-primary hover:text-white text-lg px-8 py-4"
              />
            </div>

            {/* Trust Bar - Mobile version */}
            <div className="lg:hidden">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-lg border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">85+</div>
                    <div className="text-sm text-text-secondary">Active Members</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-success">95%</div>
                    <div className="text-sm text-text-secondary">Satisfaction Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-accent">24/7</div>
                    <div className="text-sm text-text-secondary">Support Available</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Taxi Fleet Image with Floating Pills */}
          <div className="space-y-6 relative">
            <div className="relative">
              <Image
                src="/assets/images/hero.png"
                alt="BMTOA - Professional taxi operators and drivers in Bulawayo"
                className="w-full h-96 lg:h-[500px] object-cover rounded-2xl"
              />

                {/* Floating Trust Indicators - Higher z-index to overflow */}
                {trustIndicators.map((indicator, index) => (
                  <div
                    key={indicator.label}
                    className={`absolute ${indicator.position} animate-bounce-gentle z-50`}
                    style={{ animationDelay: `${index * 0.5}s` }}
                  >
                    <div className="bg-white/95 backdrop-blur-sm rounded-full px-5 py-3 shadow-2xl border-2 border-primary/20 flex items-center space-x-2 hover:scale-110 hover:shadow-3xl transition-all duration-300">
                      <Icon name={indicator.icon} size={18} className="text-primary" />
                      <span className="text-sm font-semibold text-text-primary">{indicator.label}</span>
                    </div>
                  </div>
                ))}

              {/* Decorative Elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-accent/10 rounded-full blur-xl"></div>
            </div>

            {/* Trust Bar - Hidden on mobile, shown on desktop aligned with buttons - Higher z-index */}
            <div className="hidden lg:block relative z-40">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-2xl border-2 border-primary/10 transform hover:scale-105 transition-all duration-300">
                <div className="grid grid-cols-3 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-primary">85+</div>
                    <div className="text-sm text-text-secondary font-medium">Active Members</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-success">95%</div>
                    <div className="text-sm text-text-secondary font-medium">Satisfaction Rate</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-accent">24/7</div>
                    <div className="text-sm text-text-secondary font-medium">Support Available</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <Icon name="ChevronDown" size={24} className="text-text-secondary" />
      </div>
    </section>
  );
};

export default HeroSection;