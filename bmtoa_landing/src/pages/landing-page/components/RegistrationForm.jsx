import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

/**
 * Registration Form Section - BMTOA Landing Page
 * Simplified to redirect to dedicated /sign-up page
 */
const RegistrationForm = () => {
  const navigate = useNavigate();

  const handleJoinNow = () => {
    navigate('/sign-up');
  };

  return (
    <section id="registration" className="py-20 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Join BMTOA?
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Join 85+ professional taxi operators and drivers in Bulawayo's premier metered taxi association
          </p>
        </div>

        {/* CTA Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left Side - Benefits */}
              <div>
                <h3 className="text-2xl font-bold text-slate-900 mb-6">
                  Membership Benefits
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Icon name="Check" className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-slate-900">E-Hailing Platform Access</h4>
                      <p className="text-sm text-slate-600">Connect with passengers through our modern booking system</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="Check" className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-slate-900">Professional Certification</h4>
                      <p className="text-sm text-slate-600">BMTOA verified badge and professional credentials</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="Check" className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-slate-900">Support & Training</h4>
                      <p className="text-sm text-slate-600">Ongoing support, training programs, and industry resources</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Icon name="Check" className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                    <div>
                      <h4 className="font-semibold text-slate-900">Network & Community</h4>
                      <p className="text-sm text-slate-600">Join a network of 85+ professional operators and drivers</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - CTA */}
              <div className="text-center md:text-left">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 mb-6">
                  <div className="text-sm font-semibold text-yellow-800 mb-2">
                    SPECIAL OFFER
                  </div>
                  <div className="text-3xl font-bold text-slate-900 mb-2">
                    First Month Free
                  </div>
                  <div className="text-sm text-slate-600">
                    For new members joining this month
                  </div>
                </div>

                <Button
                  variant="default"
                  size="lg"
                  onClick={handleJoinNow}
                  iconName="UserPlus"
                  iconPosition="left"
                  className="w-full text-lg py-4 shadow-lg"
                >
                  Join BMTOA Now
                </Button>

                <p className="text-sm text-slate-500 mt-4">
                  Quick sign-up process • No credit card required
                </p>

                <div className="mt-6 pt-6 border-t border-slate-200">
                  <p className="text-sm text-slate-600 mb-3">
                    Already a member?
                  </p>
                  <button
                    onClick={() => navigate('/sign-in')}
                    className="text-slate-700 hover:text-slate-900 font-medium text-sm underline"
                  >
                    Sign in to your account →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security Assurance */}
        <div className="text-center mt-8">
          <div className="inline-flex items-center space-x-2 text-sm text-slate-300">
            <Icon name="Shield" size={16} className="text-yellow-400" />
            <span>Your information is secure and encrypted</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RegistrationForm;

