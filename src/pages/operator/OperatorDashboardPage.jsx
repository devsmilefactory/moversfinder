import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import useAuthStore from '../../stores/authStore';
import OperatorPWALayout from '../../components/layouts/OperatorPWALayout';

const OperatorDashboardPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const guard = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('operator_profiles')
        .select('approval_status, profile_completion_status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data || data.profile_completion_status !== 'complete') {
        navigate('/operator/profile', { replace: true });
        return;
      }
      if (data.approval_status !== 'approved') {
        navigate('/operator/status', { replace: true });
        return;
      }
      setReady(true);
    };
    guard();
  }, [user, navigate]);

  if (!ready) return null;

  return (
    <OperatorPWALayout title="Operator Dashboard">
      <div className="space-y-4">
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <h3 className="font-semibold">Welcome</h3>
          <p className="text-slate-600 text-sm">Your operator dashboard will appear here. Use the menu to navigate.</p>
        </div>
      </div>
    </OperatorPWALayout>
  );
};

export default OperatorDashboardPage;

