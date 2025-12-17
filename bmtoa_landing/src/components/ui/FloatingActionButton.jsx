import React, { useState, useEffect } from 'react';
import Button from './Button';

const FloatingActionButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState('join');

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroSection = document.getElementById('hero');
      const registrationSection = document.getElementById('registration');
      
      if (heroSection && registrationSection) {
        const heroBottom = heroSection?.offsetTop + heroSection?.offsetHeight;
        const registrationTop = registrationSection?.offsetTop;
        
        // Show FAB when past hero section
        setIsVisible(scrollY > heroBottom - 200);
        
        // Switch to WhatsApp when near registration section
        setCurrentAction(scrollY > registrationTop - 400 ? 'whatsapp' : 'join');
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleJoinClick = () => {
    const element = document.getElementById('registration');
    if (element) {
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/263123456789?text=Hi, I want to join BMTOA. Can you help me with the membership process?', '_blank');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 animate-fade-in">
      {currentAction === 'join' ? (
        <Button
          variant="default"
          size="lg"
          onClick={handleJoinClick}
          className="shadow-elevation hover:shadow-lg transition-all duration-300 animate-bounce-gentle"
          iconName="UserPlus"
          iconPosition="left"
        >
          <span className="hidden sm:inline">Join Now</span>
          <span className="sm:hidden">Join</span>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="lg"
          onClick={handleWhatsAppClick}
          className="shadow-elevation hover:shadow-lg transition-all duration-300 bg-white border-2 border-green-500 text-green-600 hover:bg-green-50"
          iconName="MessageCircle"
          iconPosition="left"
        >
          <span className="hidden sm:inline">WhatsApp</span>
          <span className="sm:hidden">Chat</span>
        </Button>
      )}
    </div>
  );
};

export default FloatingActionButton;