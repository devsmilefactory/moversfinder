import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BenefitsGrid = () => {
  const [activeAudience, setActiveAudience] = useState('operators');

  const operatorBenefits = [
    {
      icon: 'BarChart3',
      title: 'Fleet Management Tools',
      description: 'Advanced dashboard to monitor vehicle performance, driver activities, and revenue optimization across your entire fleet.',
      features: ['Real-time vehicle tracking', 'Driver performance analytics', 'Revenue reporting', 'Maintenance scheduling']
    },
    {
      icon: 'TrendingUp',
      title: 'Business Growth Metrics',
      description: 'Comprehensive analytics and insights to help you make data-driven decisions and expand your taxi business effectively.',
      features: ['Market analysis reports', 'Growth opportunity identification', 'Competitive benchmarking', 'ROI tracking']
    },
    {
      icon: 'Settings',
      title: 'Better Operating Conditions',
      description: 'Improved working environment and operational support that enhances your daily taxi operations and driver satisfaction.',
      features: ['Standardized operating procedures', 'Fair working conditions', 'Operational support', 'Industry best practices']
    },
    {
      icon: 'Users',
      title: 'Driver Network Access',
      description: 'Connect with qualified, trained drivers through our extensive network of professional taxi operators.',
      features: ['Pre-screened drivers', 'Training certification', 'Background verification', 'Performance ratings']
    }
  ];

  const driverBenefits = [
    {
      icon: 'DollarSign',
      title: 'Income Stability',
      description: 'Guaranteed minimum earnings and access to high-demand routes through our e-hailing platform integration.',
      features: ['Minimum income guarantee', 'Premium route access', 'Surge pricing benefits', 'Weekly pay assurance']
    },
    {
      icon: 'GraduationCap',
      title: 'Professional Development',
      description: 'Comprehensive training programs to enhance your skills and advance your career in the transportation industry.',
      features: ['Customer service training', 'Safety certification', 'Business skills development', 'Leadership programs']
    },
    {
      icon: 'Smartphone',
      title: 'Technology Access',
      description: 'Free access to our proprietary e-hailing app and digital tools to maximize your earning potential.',
      features: ['Mobile booking app', 'GPS navigation', 'Digital payments', 'Customer feedback system']
    },
    {
      icon: 'Heart',
      title: 'Health & Wellness',
      description: 'Comprehensive health benefits and wellness programs designed specifically for professional drivers.',
      features: ['Medical insurance', 'Regular health checkups', 'Wellness programs', 'Emergency support']
    }
  ];

  const currentBenefits = activeAudience === 'operators' ? operatorBenefits : driverBenefits;

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Benefits Tailored to Your Role
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-8">
            Whether you're a taxi operator managing a fleet or a driver looking for stability, BMTOA has specific benefits designed for your success
          </p>

          {/* Audience Toggle */}
          <div className="inline-flex bg-white rounded-lg p-1 shadow-card border border-border">
            <button
              onClick={() => setActiveAudience('operators')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeAudience === 'operators' ?'bg-primary text-white shadow-sm' :'text-text-secondary hover:text-primary'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Icon name="Building" size={20} />
                <span>Taxi Operators</span>
              </div>
            </button>
            <button
              onClick={() => setActiveAudience('drivers')}
              className={`px-6 py-3 rounded-md font-medium transition-all duration-200 ${
                activeAudience === 'drivers' ?'bg-primary text-white shadow-sm' :'text-text-secondary hover:text-primary'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Icon name="User" size={20} />
                <span>Drivers</span>
              </div>
            </button>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {currentBenefits?.map((benefit, index) => (
            <div
              key={benefit?.title}
              className="bg-white rounded-xl p-6 shadow-card border border-border hover:shadow-elevation transition-all duration-300 transform hover:-translate-y-1"
            >
              {/* Header */}
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Icon name={benefit?.icon} size={24} className="text-primary" />
                </div>
                <h3 className="text-xl font-bold text-text-primary">
                  {benefit?.title}
                </h3>
              </div>

              {/* Description */}
              <p className="text-text-secondary mb-6 leading-relaxed">
                {benefit?.description}
              </p>

              {/* Features */}
              <div className="space-y-3">
                {benefit?.features?.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center space-x-3">
                    <Icon name="CheckCircle" size={16} className="text-success flex-shrink-0" />
                    <span className="text-sm text-text-secondary">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl shadow-card border border-border overflow-hidden">
          <div className="bg-slate-700 text-white p-6 text-center">
            <h3 className="text-2xl font-bold mb-2">
              {activeAudience === 'operators' ? 'Operator' : 'Driver'} Benefits Comparison
            </h3>
            <p className="text-primary-foreground/80">
              See how BMTOA membership compares to operating independently
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-semibold text-text-primary">Feature</th>
                  <th className="text-center p-4 font-semibold text-text-primary">Independent</th>
                  <th className="text-center p-4 font-semibold text-primary">BMTOA Member</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {activeAudience === 'operators' ? (
                  <>
                    <tr>
                      <td className="p-4 text-text-secondary">Better Operating Conditions</td>
                      <td className="p-4 text-center">
                        <Icon name="X" size={20} className="text-red-500 mx-auto" />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Icon name="Check" size={20} className="text-success" />
                          <span className="text-sm font-medium text-success">BMTOA Standards</span>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 text-text-secondary">Fleet Management Tools</td>
                      <td className="p-4 text-center">
                        <Icon name="X" size={20} className="text-red-500 mx-auto" />
                      </td>
                      <td className="p-4 text-center">
                        <Icon name="Check" size={20} className="text-success mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 text-text-secondary">E-hailing Platform Access</td>
                      <td className="p-4 text-center">
                        <Icon name="X" size={20} className="text-red-500 mx-auto" />
                      </td>
                      <td className="p-4 text-center">
                        <Icon name="Check" size={20} className="text-success mx-auto" />
                      </td>
                    </tr>
                  </>
                ) : (
                  <>
                    <tr>
                      <td className="p-4 text-text-secondary">Income Guarantee</td>
                      <td className="p-4 text-center">
                        <Icon name="X" size={20} className="text-red-500 mx-auto" />
                      </td>
                      <td className="p-4 text-center">
                        <Icon name="Check" size={20} className="text-success mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 text-text-secondary">Professional Training</td>
                      <td className="p-4 text-center">
                        <Icon name="X" size={20} className="text-red-500 mx-auto" />
                      </td>
                      <td className="p-4 text-center">
                        <Icon name="Check" size={20} className="text-success mx-auto" />
                      </td>
                    </tr>
                    <tr>
                      <td className="p-4 text-text-secondary">Health Benefits</td>
                      <td className="p-4 text-center">
                        <Icon name="X" size={20} className="text-red-500 mx-auto" />
                      </td>
                      <td className="p-4 text-center">
                        <Icon name="Check" size={20} className="text-success mx-auto" />
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button
            variant="default"
            size="lg"
            onClick={() => document.getElementById('registration')?.scrollIntoView({ behavior: 'smooth' })}
            iconName="ArrowRight"
            iconPosition="right"
            className="text-lg px-8 py-4"
          >
            Start Your Membership Today
          </Button>
        </div>
      </div>
    </section>
  );
};

export default BenefitsGrid;