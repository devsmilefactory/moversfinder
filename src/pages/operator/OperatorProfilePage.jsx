import React from 'react';
import OperatorPWALayout from '../../components/layouts/OperatorPWALayout';

import ComingSoon from '../../components/common/ComingSoon';
import { isComingSoon } from '../../config/profileAvailability';

const OperatorProfilePage = () => {
  return (
    <OperatorPWALayout title="Operator Coming Soon">
      <ComingSoon profileType="operator" />
    </OperatorPWALayout>
  );
};

export default OperatorProfilePage;

