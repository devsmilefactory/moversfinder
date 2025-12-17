import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const SolutionOverview = () => {
  const [activeCard, setActiveCard] = useState(0);

  const solutions = [
    {
      icon: 'Users',
      title: 'Professional Network Access',
      subtitle: 'Industry Connections',
      description: 'Join a thriving community of professional taxi operators and drivers with access to industry insights and professional support.',
      benefits: [
        'Professional development programs',
        'Industry best practices sharing',
        'Peer-to-peer support network',
        'Regular professional workshops'
      ],
      image: 'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?ixlib=rb-4.0.3&w=500&q=80',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      icon: 'Smartphone',
      title: 'TaxiCab Platform Integration',
      subtitle: 'Exclusive Access',
      description: 'Connect to our proprietary TaxiCab e-hailing platform and tap into the growing digital taxi market with modern booking technology.',
      benefits: [
        'Real-time booking notifications',
        'GPS navigation integration',
        'Digital payment processing',
        'Customer rating system'
      ],
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&w=500&q=80',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },

    {
      icon: 'Users',
      title: 'Professional Network',
      subtitle: '85+ Members',
      description: 'Join a supportive community of professional taxi operators sharing knowledge, opportunities, and mutual support.',
      benefits: [
        'Peer-to-peer learning',
        'Business referrals',
        'Shared resources',
        'Industry advocacy'
      ],
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?ixlib=rb-4.0.3&w=500&q=80',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  return (
    <section id="benefits" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="CheckCircle" size={16} />
            <span>Complete Solution</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            BMTOA: Your Path to Success
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-8">
            We've designed a comprehensive solution that addresses every challenge facing independent taxi operators in Bulawayo
          </p>

          {/* Better Operating Conditions Section */}
          <div className="bg-slate-700 rounded-2xl p-8 text-white max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center space-x-2 bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Icon name="Zap" size={16} />
                <span>Better Operating Conditions</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Transform Your Taxi Business Operations</h3>
              <p className="text-white/90 text-lg">
                BMTOA membership provides you with the tools, support, and network needed to operate under significantly improved conditions
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Shield" size={24} className="text-white" />
                </div>
                <h4 className="font-semibold mb-2">Professional Standards</h4>
                <p className="text-white/80 text-sm">Operate under recognized professional standards with BMTOA certification</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="Users" size={24} className="text-white" />
                </div>
                <h4 className="font-semibold mb-2">Support Network</h4>
                <p className="text-white/80 text-sm">Access to 24/7 support and a community of professional operators</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name="TrendingUp" size={24} className="text-white" />
                </div>
                <h4 className="font-semibold mb-2">Business Growth</h4>
                <p className="text-white/80 text-sm">Tools and resources to grow your taxi business sustainably</p>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Solutions Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-16">
          {solutions?.map((solution, index) => (
            <div
              key={solution?.title}
              className={`${solution?.bgColor} ${solution?.borderColor} border-2 rounded-xl p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-elevation ${
                activeCard === index ? 'ring-2 ring-primary ring-opacity-50' : ''
              }`}
              onMouseEnter={() => setActiveCard(index)}
            >
              <div className="flex items-start space-x-4">
                {/* Icon */}
                <div className={`w-16 h-16 ${solution?.bgColor} rounded-xl flex items-center justify-center border-2 ${solution?.borderColor} flex-shrink-0`}>
                  <Icon name={solution?.icon} size={28} className={solution?.color} />
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-bold text-text-primary">
                      {solution?.title}
                    </h3>
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${solution?.bgColor} ${solution?.color}`}>
                      {solution?.subtitle}
                    </span>
                  </div>
                  
                  <p className="text-text-secondary mb-4 leading-relaxed">
                    {solution?.description}
                  </p>

                  {/* Benefits List */}
                  <ul className="space-y-2">
                    {solution?.benefits?.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-center space-x-2">
                        <Icon name="Check" size={16} className={solution?.color} />
                        <span className="text-sm text-text-secondary">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Success Metrics */}
        <div className="bg-slate-700 rounded-2xl p-8 text-white">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">Proven Results for Our Members</h3>
            <p className="text-white/80">
              Real outcomes from taxi operators who joined BMTOA
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">75%</div>
              <div className="text-white/80">Better Operating Conditions</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">65%</div>
              <div className="text-white/80">Income Increase</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">85+</div>
              <div className="text-white/80">Active Members</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">95%</div>
              <div className="text-white/80">Member Satisfaction</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionOverview;