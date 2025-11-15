import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import Header from '../../components/ui/Header';
import ScrollProgressIndicator from '../../components/ui/ScrollProgressIndicator';
import FloatingActionButton from '../../components/ui/FloatingActionButton';
import HeroSection from './components/HeroSection';
import NewsTicker from './components/NewsTicker';
import ProblemSection from './components/ProblemSection';
import SolutionOverview from './components/SolutionOverview';
import BenefitsGrid from './components/BenefitsGrid';

import TestimonialsCarousel from './components/TestimonialsCarousel';
import FAQSection from './components/FAQSection';
import RegistrationForm from './components/RegistrationForm';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';

const LandingPage = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Note: We no longer redirect authenticated users automatically
  // They can view the landing page, but Sign In/Sign Up buttons will be hidden

  return (
    <div className="min-h-screen bg-white">
      {/* Fixed Elements */}
      <Header isAuthenticated={!!user} />
      <ScrollProgressIndicator />
      <FloatingActionButton />

      {/* Main Content */}
      <main>
        {/* Hero Section with Trust Indicators */}
        <HeroSection />

        {/* Animated News Ticker */}
        <NewsTicker />

        {/* Problem Statement */}
        <ProblemSection />

        {/* Solution Overview */}
        <SolutionOverview />

        {/* Dual-Audience Benefits Grid */}
        <BenefitsGrid />

        {/* Member Testimonials Carousel - Removed as requested */}
        {/* <TestimonialsCarousel /> */}

        {/* FAQ Section */}
        <FAQSection />

        {/* Registration Form */}
        <RegistrationForm />

        {/* Contact Section */}
        <ContactSection />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;