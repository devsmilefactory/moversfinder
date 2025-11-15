import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const MembershipTiers = () => {

  const tiers = [
    {
      name: 'Basic',
      description: 'Perfect for individual drivers starting their professional journey',

      popular: false,
      features: [
        'E-hailing platform access',
        'Better operating conditions',
        'Customer service support',
        'Mobile app access',
        'Community forum access',
        'Basic reporting tools'
      ],
      limitations: [
        'Limited to 1 vehicle',
        'Standard support hours',
        'Basic analytics only'
      ],
      color: 'border-border',
      bgColor: 'bg-white',
      buttonVariant: 'outline'
    },
    {
      name: 'Premium',
      description: 'Comprehensive solution for serious operators and growing fleets',

      popular: true,
      features: [
        'Everything in Basic',
        'Advanced fleet management',
        'Enhanced operating conditions',
        'Priority customer support',
        'Advanced analytics dashboard',
        'Driver support programs',
        'Financial services access',
        'Marketing support',
        'Route optimization',
        'Maintenance scheduling'
      ],
      limitations: [
        'Up to 5 vehicles',
        '24/7 support available'
      ],
      color: 'border-primary',
      bgColor: 'bg-primary/5',
      buttonVariant: 'default'
    }
  ];

  const paymentMethods = [
    { name: 'EcoCash', icon: 'Smartphone', description: 'Mobile money payment' },
    { name: 'Bank Transfer', icon: 'Building', description: 'Direct bank payment' },
    { name: 'Cash Deposit', icon: 'Banknote', description: 'Office payment' },
    { name: 'USD Card', icon: 'CreditCard', description: 'International cards' }
  ];

  const handleSelectPlan = (tier) => {
    // Scroll to registration form
    const element = document.getElementById('registration');
    if (element) {
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Choose Your Membership Tier
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Select the membership level that best fits your needs. All plans include our core benefits with varying levels of support and features.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">
          {tiers?.map((tier, index) => (
            <div
              key={tier?.name}
              className={`${tier?.bgColor} ${tier?.color} border-2 rounded-2xl p-8 relative hover:shadow-elevation transition-all duration-300 ${
                tier?.popular ? 'transform scale-105' : ''
              }`}
            >
              {/* Popular Badge */}
              {tier?.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <div className="bg-primary text-white px-4 py-2 rounded-full text-sm font-medium">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-text-primary mb-2">
                  {tier?.name}
                </h3>
                <p className="text-text-secondary mb-6">
                  {tier?.description}
                </p>



                {/* CTA Button */}
                <Button
                  variant={tier?.buttonVariant}
                  size="lg"
                  fullWidth
                  onClick={() => handleSelectPlan(tier)}
                  iconName="ArrowRight"
                  iconPosition="right"
                >
                  Choose {tier?.name}
                </Button>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <h4 className="font-semibold text-text-primary">What's included:</h4>
                <ul className="space-y-3">
                  {tier?.features?.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start space-x-3">
                      <Icon name="Check" size={16} className="text-success flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Limitations */}
                {tier?.limitations?.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h5 className="text-sm font-medium text-text-secondary mb-2">Plan limits:</h5>
                    <ul className="space-y-2">
                      {tier?.limitations?.map((limitation, limitIndex) => (
                        <li key={limitIndex} className="flex items-start space-x-3">
                          <Icon name="Info" size={14} className="text-text-secondary flex-shrink-0 mt-0.5" />
                          <span className="text-xs text-text-secondary">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Payment Methods */}
        <div className="bg-slate-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              Flexible Payment Options
            </h3>
            <p className="text-text-secondary">
              Choose from multiple payment methods that work best for you
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {paymentMethods?.map((method, index) => (
              <div
                key={method?.name}
                className="bg-white rounded-lg p-6 text-center hover:shadow-card transition-shadow duration-200"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon name={method?.icon} size={24} className="text-primary" />
                </div>
                <h4 className="font-semibold text-text-primary mb-2">
                  {method?.name}
                </h4>
                <p className="text-sm text-text-secondary">
                  {method?.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center space-x-3 bg-success/10 text-success px-6 py-3 rounded-full">
            <Icon name="Shield" size={20} />
            <span className="font-medium">30-day money-back guarantee</span>
          </div>
          <p className="text-sm text-text-secondary mt-2">
            Not satisfied? Get a full refund within 30 days, no questions asked.
          </p>
        </div>
      </div>
    </section>
  );
};

export default MembershipTiers;