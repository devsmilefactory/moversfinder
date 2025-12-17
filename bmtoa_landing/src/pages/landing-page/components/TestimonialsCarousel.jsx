import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const TestimonialsCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const testimonials = [
    {
      id: 1,
      name: 'Tendai Mukamuri',
      role: 'Fleet Owner',
      company: 'City Express Taxis',
      image: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-4.0.3&w=150&q=80',
      rating: 5,
      quote: `Joining BMTOA was the best business decision I've made. The professional certification and e-hailing platform increased my bookings by 80%. The support programs for my drivers have significantly improved customer satisfaction.`,
      beforeIncome: '$800',afterIncome: '$1,320',
      monthsWithBMTOA: 18,
      verified: true,
      videoThumbnail: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-4.0.3&w=400&q=80'
    },
    {
      id: 2,
      name: 'Chipo Ndebele',role: 'Professional Driver',company: 'Independent Operator',image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&w=150&q=80',
      rating: 5,
      quote: `As a female driver, BMTOA gave me the credibility and safety I needed. The guaranteed minimum income means I can support my family consistently. The health benefits and support programs have been life-changing.`,
      beforeIncome: '$450',afterIncome: '$720',
      monthsWithBMTOA: 12,
      verified: true,
      videoThumbnail: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&w=400&q=80'
    },
    {
      id: 3,
      name: 'Blessing Moyo',role: 'Taxi Operator',company: 'Metro Rides',image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=150&q=80',rating: 5,quote: `The networking opportunities alone are worth the membership fee. I've partnered with other operators for bulk fuel purchases and shared maintenance costs. BMTOA's business training helped me expand from 1 to 4 vehicles.`,
      beforeIncome: '$600',afterIncome: '$1,150',
      monthsWithBMTOA: 24,
      verified: true,
      videoThumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=400&q=80'
    },
    {
      id: 4,
      name: 'Nomsa Sibanda',role: 'Driver & Mentor',company: 'BMTOA Certified Instructor',image: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?ixlib=rb-4.0.3&w=150&q=80',rating: 5,quote: `BMTOA didn't just improve my driving career - it created a new one. After completing their mentor certification program, I now earn additional income supporting new members. The community support is incredible.`,
      beforeIncome: '$520',
      afterIncome: '$890',
      monthsWithBMTOA: 30,
      verified: true,
      videoThumbnail: 'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?ixlib=rb-4.0.3&w=400&q=80'
    }
  ];

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials?.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, testimonials?.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials?.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials?.length) % testimonials?.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  const currentTestimonial = testimonials?.[currentSlide];

  return (
    <section className="py-16 bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="Star" size={16} />
            <span>Member Success Stories</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Real Results from Real Members
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Hear directly from taxi operators and drivers who transformed their careers with BMTOA membership
          </p>
        </div>

        {/* Main Testimonial Card */}
        <div className="relative max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-elevation border border-border overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-0">
              {/* Left Side - Content */}
              <div className="p-8 lg:p-12">
                {/* Rating */}
                <div className="flex items-center space-x-1 mb-6">
                  {[...Array(currentTestimonial?.rating)]?.map((_, i) => (
                    <Icon key={i} name="Star" size={20} className="text-accent fill-current" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-lg text-text-primary leading-relaxed mb-8">
                  "{currentTestimonial?.quote}"
                </blockquote>

                {/* Author Info */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative">
                    <Image
                      src={currentTestimonial?.image}
                      alt={currentTestimonial?.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    {currentTestimonial?.verified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                        <Icon name="Check" size={12} className="text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary">
                      {currentTestimonial?.name}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {currentTestimonial?.role} • {currentTestimonial?.company}
                    </div>
                    <div className="text-xs text-success">
                      ✓ Verified Member • {currentTestimonial?.monthsWithBMTOA} months
                    </div>
                  </div>
                </div>

                {/* Income Comparison */}
                <div className="bg-gradient-to-r from-success/10 to-primary/10 rounded-lg p-4">
                  <div className="text-sm text-text-secondary mb-2">Monthly Income Growth</div>
                  <div className="flex items-center justify-between">
                    <div className="text-center">
                      <div className="text-sm text-text-secondary">Before BMTOA</div>
                      <div className="text-xl font-bold text-text-primary">
                        {currentTestimonial?.beforeIncome}
                      </div>
                    </div>
                    <Icon name="ArrowRight" size={24} className="text-success" />
                    <div className="text-center">
                      <div className="text-sm text-text-secondary">After BMTOA</div>
                      <div className="text-xl font-bold text-success">
                        {currentTestimonial?.afterIncome}
                      </div>
                    </div>
                  </div>
                  <div className="text-center mt-2">
                    <span className="text-sm font-medium text-success">
                      {Math.round(((parseInt(currentTestimonial?.afterIncome?.replace('$', '')) - 
                                   parseInt(currentTestimonial?.beforeIncome?.replace('$', ''))) / 
                                   parseInt(currentTestimonial?.beforeIncome?.replace('$', ''))) * 100)}% increase
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Side - Video Thumbnail */}
              <div className="relative bg-slate-100 lg:min-h-full">
                <Image
                  src={currentTestimonial?.videoThumbnail}
                  alt={`${currentTestimonial?.name} video testimonial`}
                  className="w-full h-64 lg:h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <button className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors duration-200 group">
                    <Icon name="Play" size={24} className="text-primary ml-1 group-hover:scale-110 transition-transform duration-200" />
                  </button>
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-text-primary">
                  Video Testimonial
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-elevation border border-border flex items-center justify-center hover:shadow-lg transition-all duration-200 z-10"
          >
            <Icon name="ChevronLeft" size={20} className="text-text-primary" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-elevation border border-border flex items-center justify-center hover:shadow-lg transition-all duration-200 z-10"
          >
            <Icon name="ChevronRight" size={20} className="text-text-primary" />
          </button>
        </div>

        {/* Slide Indicators */}
        <div className="flex items-center justify-center space-x-3 mt-8">
          {testimonials?.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentSlide
                  ? 'bg-primary scale-125' :'bg-border hover:bg-text-secondary'
              }`}
            />
          ))}
        </div>

        {/* Auto-play Control */}
        <div className="text-center mt-6">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className="inline-flex items-center space-x-2 text-sm text-text-secondary hover:text-primary transition-colors duration-200"
          >
            <Icon name={isAutoPlaying ? "Pause" : "Play"} size={16} />
            <span>{isAutoPlaying ? 'Pause' : 'Play'} slideshow</span>
          </button>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <div className="bg-white rounded-xl p-8 shadow-card border border-border max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              Ready to Write Your Success Story?
            </h3>
            <p className="text-text-secondary mb-6">
              Join hundreds of satisfied members who have transformed their taxi operations with BMTOA
            </p>
            <Button
              variant="default"
              size="lg"
              onClick={() => document.getElementById('registration')?.scrollIntoView({ behavior: 'smooth' })}
              iconName="UserPlus"
              iconPosition="left"
              className="text-lg px-8 py-4"
            >
              Start Your Journey Today
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsCarousel;