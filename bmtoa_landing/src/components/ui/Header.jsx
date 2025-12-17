import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Image from '../AppImage';
import Button from './Button';
import useAuthStore from '../../stores/authStore';

const Header = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Helper function to get dashboard path based on user type
  const getDashboardPath = (userType) => {
    const dashboardPaths = {
      'admin': '/admin/dashboard',
      'driver': '/driver/dashboard',
      'taxi_operator': '/operator/dashboard',
      'operator': '/operator/dashboard',
      'individual': '/user/dashboard',
      'corporate': '/corporate/dashboard',
    };
    return dashboardPaths[userType] || '/';
  };
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentSection, setCurrentSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
      
      // Track current section for navigation highlighting
      const sections = ['hero', 'benefits', 'testimonials', 'registration'];
      const scrollPosition = window.scrollY + 100;
      
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setCurrentSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element?.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  const navigationItems = [
    { label: 'Benefits', anchor: 'benefits', icon: 'Star' },
    { label: 'Testimonials', anchor: 'testimonials', icon: 'MessageSquare' },
    { label: 'Contact', anchor: 'contact', icon: 'Phone' },
  ];

  return (
    <>
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? 'bg-white/95 backdrop-blur-sm shadow-elevation border-b border-border' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="flex items-center cursor-pointer"
              onClick={() => scrollToSection('hero')}
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center">
                  <Image
                    src="/assets/images/Taxi Cab2Icon.png"
                    alt="BMTOA Logo"
                    className="w-10 h-10 object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-primary">BMTOA</span>
                  <span className="text-xs text-text-secondary hidden sm:block">
                    Bulawayo Metered Taxi Operators
                  </span>
                </div>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigationItems?.map((item) => (
                <button
                  key={item?.anchor}
                  onClick={() => scrollToSection(item?.anchor)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    currentSection === item?.anchor
                      ? 'text-slate-700 bg-slate-700/10' :'text-text-secondary hover:text-slate-700 hover:bg-slate-700/5'
                  }`}
                >
                  <Icon name={item?.icon} size={16} />
                  <span>{item?.label}</span>
                </button>
              ))}

              {/* Show Dashboard button when authenticated, Sign In/Sign Up when not */}
              <div className="flex items-center space-x-3 ml-4">
                {isAuthenticated && user ? (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => navigate(getDashboardPath(user.user_type))}
                    iconName="LayoutDashboard"
                    iconPosition="left"
                  >
                    Dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/sign-in')}
                      iconName="LogIn"
                      iconPosition="left"
                    >
                      Sign In
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => navigate('/sign-up')}
                      iconName="UserPlus"
                      iconPosition="left"
                    >
                      Join Now
                    </Button>
                  </>
                )}
              </div>
            </nav>

            {/* Mobile Menu Button */}
            <button
              className="md:hidden p-2 rounded-md text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors duration-200"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle mobile menu"
            >
              <Icon name={isMobileMenuOpen ? "X" : "Menu"} size={24} />
            </button>
          </div>
        </div>
      </header>
      {/* Mobile Navigation Drawer */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 md:hidden transform transition-transform duration-300">
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Icon name="Car" size={20} color="white" />
                  </div>
                  <span className="text-lg font-bold text-primary">BMTOA</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md text-text-secondary hover:text-primary hover:bg-primary/5 transition-colors duration-200"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>

              {/* Navigation Items */}
              <nav className="flex-1 px-6 py-4">
                <div className="space-y-2">
                  {navigationItems?.map((item) => (
                    <button
                      key={item?.anchor}
                      onClick={() => scrollToSection(item?.anchor)}
                      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                        currentSection === item?.anchor
                          ? 'text-primary bg-primary/10' :'text-text-secondary hover:text-primary hover:bg-primary/5'
                      }`}
                    >
                      <Icon name={item?.icon} size={20} />
                      <span className="font-medium">{item?.label}</span>
                    </button>
                  ))}
                </div>

                {/* Mobile CTA */}
                <div className="mt-8 pt-6 border-t border-border space-y-3">
                  {/* Show Dashboard button when authenticated, Sign In/Sign Up when not */}
                  {isAuthenticated && user ? (
                    <Button
                      variant="default"
                      size="lg"
                      fullWidth
                      onClick={() => {
                        navigate(getDashboardPath(user.user_type));
                        setIsMobileMenuOpen(false);
                      }}
                      iconName="LayoutDashboard"
                      iconPosition="left"
                    >
                      Go to Dashboard
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="lg"
                        fullWidth
                        onClick={() => {
                          navigate('/sign-in');
                          setIsMobileMenuOpen(false);
                        }}
                        iconName="LogIn"
                        iconPosition="left"
                      >
                        Sign In
                      </Button>
                      <Button
                        variant="default"
                        size="lg"
                        fullWidth
                        onClick={() => {
                          navigate('/sign-up');
                          setIsMobileMenuOpen(false);
                        }}
                        iconName="UserPlus"
                        iconPosition="left"
                      >
                        Join BMTOA Now
                      </Button>
                    </>
                  )}

                  {/* WhatsApp Contact */}
                  <Button
                    variant="outline"
                    size="lg"
                    fullWidth
                    className={!isAuthenticated ? "mt-3" : ""}
                    onClick={() => window.open('https://wa.me/263789810506', '_blank')}
                    iconName="MessageCircle"
                    iconPosition="left"
                  >
                    WhatsApp Support
                  </Button>
                </div>
              </nav>

              {/* Footer */}
              <div className="p-6 border-t border-border">
                <p className="text-xs text-text-secondary text-center">
                  Zimbabwe's Premier Taxi Association
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Header;