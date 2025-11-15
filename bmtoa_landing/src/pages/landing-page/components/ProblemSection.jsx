import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

const ProblemSection = () => {
  const [counters, setCounters] = useState({
    irregularIncome: 0,
    highInsurance: 0,
    limitedAccess: 0,
    lackCredibility: 0
  });

  const targetValues = {
    irregularIncome: 73,
    highInsurance: 65,
    limitedAccess: 89,
    lackCredibility: 58
  };

  useEffect(() => {
    const animateCounters = () => {
      const duration = 2000;
      const steps = 60;
      const stepDuration = duration / steps;

      Object.keys(targetValues)?.forEach(key => {
        let currentValue = 0;
        const increment = targetValues?.[key] / steps;

        const timer = setInterval(() => {
          currentValue += increment;
          if (currentValue >= targetValues?.[key]) {
            currentValue = targetValues?.[key];
            clearInterval(timer);
          }
          setCounters(prev => ({
            ...prev,
            [key]: Math.floor(currentValue)
          }));
        }, stepDuration);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          animateCounters();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById('problem-section');
    if (element) {
      observer?.observe(element);
    }

    return () => observer?.disconnect();
  }, []);

  const problems = [
    {
      icon: 'TrendingDown',
      title: 'Irregular Income',
      description: 'Taxi drivers struggle with unpredictable daily earnings and seasonal fluctuations',
      stat: `${counters?.irregularIncome}%`,
      statLabel: 'report income instability',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      icon: 'Users',
      title: 'Limited Professional Network',
      description: 'Operating in isolation without access to industry connections and support',
      stat: `${counters?.highInsurance}%`,
      statLabel: 'lack professional networks',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    {
      icon: 'Smartphone',
      title: 'Threat from E-hailing Platforms',
      description: 'Competition from digital platforms reducing traditional taxi business',
      stat: `${counters?.limitedAccess}%`,
      statLabel: 'face platform competition',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    {
      icon: 'UserX',
      title: 'Lack of Professional Credibility',
      description: 'Operating without official association membership reduces customer trust',
      stat: `${counters?.lackCredibility}%`,
      statLabel: 'struggle with credibility',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    }
  ];

  return (
    <section id="problem-section" className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            The Challenges Facing the Taxi Industry
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Independent taxi operators and drivers face significant obstacles that limit their earning potential and professional growth
          </p>
        </div>

        {/* Problems Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {problems?.map((problem, index) => (
            <div
              key={problem?.title}
              className={`${problem?.bgColor} ${problem?.borderColor} border-2 rounded-xl p-6 hover:shadow-elevation transition-all duration-300 transform hover:-translate-y-1`}
            >
              {/* Icon and Title */}
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-12 h-12 ${problem?.bgColor} rounded-lg flex items-center justify-center border ${problem?.borderColor}`}>
                  <Icon name={problem?.icon} size={24} className={problem?.color} />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">
                  {problem?.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-text-secondary mb-6 leading-relaxed">
                {problem?.description}
              </p>

              {/* Statistics */}
              <div className="border-t border-border pt-4">
                <div className={`text-3xl font-bold ${problem?.color} mb-1`}>
                  {problem?.stat}
                </div>
                <div className="text-sm text-text-secondary">
                  {problem?.statLabel}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16">
          <div className="bg-white rounded-xl p-8 shadow-card border border-border max-w-2xl mx-auto">
            <Icon name="AlertTriangle" size={48} className="text-warning mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              These Problems Have a Solution
            </h3>
            <p className="text-text-secondary mb-6">
              BMTOA addresses every one of these challenges through our comprehensive membership program and professional support network.
            </p>
            <div className="flex items-center justify-center space-x-2 text-primary">
              <Icon name="ArrowDown" size={20} />
              <span className="font-medium">Discover how we help below</span>
              <Icon name="ArrowDown" size={20} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;