import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../dashboards/shared/Button';
import useProfileSwitch from '../../hooks/useProfileSwitch';
import { bmtoaUrl } from '../../config/profileAvailability';

/**
 * ComingSoon - Generic page for features under phased rollout
 * Props:
 *  - profileType: 'corporate' | 'operator'
 */
const ComingSoon = ({ profileType = 'corporate' }) => {
  const navigate = useNavigate();
  const { handleProfileSwitch } = useProfileSwitch();

  const isCorporate = profileType === 'corporate';
  const title = isCorporate ? 'Corporate Mode – Coming Soon' : 'Operator Mode – Coming Soon';
  const emoji = isCorporate ? '🏢' : '🚕';

  const primaryCta = async () => {
    if (isCorporate) {
      await handleProfileSwitch('individual');
    } else {
      window.location.href = bmtoaUrl;
    }
  };

  const secondaryCta = async () => {
    if (isCorporate) {
      navigate('/mode-selection');
    } else {
      await handleProfileSwitch('driver');
    }
  };

  const tertiaryCta = () => navigate('/mode-selection');

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">{emoji}</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-slate-800 mb-3">{title}</h1>
        <p className="text-slate-600 mb-6">
          We're gradually rolling out {isCorporate ? 'Corporate' : 'Operator'} profiles. Thanks for your patience
          while we finish the experience.
        </p>

        {/* Suggested alternatives */}
        <div className="bg-slate-50 rounded-lg p-4 text-left mb-6">
          {isCorporate ? (
            <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
              <li>Use Individual mode to book rides immediately</li>
              <li>You can switch back here anytime from the menu</li>
            </ul>
          ) : (
            <ul className="list-disc list-inside text-slate-700 text-sm space-y-1">
              <li>Operator functionality is available on the BMTOA platform</li>
              <li>Or continue with Driver mode in this app</li>
            </ul>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="primary" size="lg" onClick={primaryCta} className="px-8">
            {isCorporate ? 'Use Individual Mode' : 'Go to BMTOA'}
          </Button>
          <Button variant="outline" size="lg" onClick={secondaryCta}>
            {isCorporate ? 'Back to Mode Selection' : 'Use Driver Mode'}
          </Button>
          {!isCorporate && (
            <Button variant="ghost" size="lg" onClick={tertiaryCta}>
              Back to Mode Selection
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;

