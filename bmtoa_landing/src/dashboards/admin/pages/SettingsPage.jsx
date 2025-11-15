import React, { useState } from 'react';
import Button from '../../shared/Button';
import FormInput, { FormSelect } from '../../shared/FormInput';

/**
 * Admin Settings Page (BMTOA - Cross-Platform)
 *
 * Features:
 * - System configuration
 * - Platform settings
 * - Commission rates
 * - Security settings
 */

const SettingsPage = () => {
  const [systemSettings, setSystemSettings] = useState({
    platformName: 'TaxiCab & BMTOA',
    supportEmail: 'support@taxicab.co.zw',
    supportPhone: '+263 71 234 5678',
    maintenanceMode: false
  });

  const [commissionRates, setCommissionRates] = useState({
    individual: 20,
    corporate: 20,
    bmtoaMember: 15,
    membershipFee: 100
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAttempts: 5
  });

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">System Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage cross-platform system configuration</p>
        </div>
        <Button variant="primary" onClick={handleSave}>Save All Changes</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* System Configuration */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">System Configuration</h2>
          <FormInput
            label="Platform Name"
            value={systemSettings.platformName}
            onChange={(e) => setSystemSettings({ ...systemSettings, platformName: e.target.value })}
          />
          <FormInput
            label="Support Email"
            type="email"
            value={systemSettings.supportEmail}
            onChange={(e) => setSystemSettings({ ...systemSettings, supportEmail: e.target.value })}
          />
          <FormInput
            label="Support Phone"
            value={systemSettings.supportPhone}
            onChange={(e) => setSystemSettings({ ...systemSettings, supportPhone: e.target.value })}
          />
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mt-4">
            <div>
              <p className="font-medium text-slate-700">Maintenance Mode</p>
              <p className="text-xs text-slate-500">Disable platform access for maintenance</p>
            </div>
            <input
              type="checkbox"
              checked={systemSettings.maintenanceMode}
              onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
              className="w-5 h-5 text-yellow-600"
            />
          </div>
        </div>

        {/* Commission Rates */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Commission Rates</h2>
          <FormInput
            label="Individual Rides (%)"
            type="number"
            value={commissionRates.individual}
            onChange={(e) => setCommissionRates({ ...commissionRates, individual: e.target.value })}
          />
          <FormInput
            label="Corporate Rides (%)"
            type="number"
            value={commissionRates.corporate}
            onChange={(e) => setCommissionRates({ ...commissionRates, corporate: e.target.value })}
          />
          <FormInput
            label="BMTOA Member Rides (%)"
            type="number"
            value={commissionRates.bmtoaMember}
            onChange={(e) => setCommissionRates({ ...commissionRates, bmtoaMember: e.target.value })}
          />
          <FormInput
            label="BMTOA Membership Fee (USD/month)"
            type="number"
            value={commissionRates.membershipFee}
            onChange={(e) => setCommissionRates({ ...commissionRates, membershipFee: e.target.value })}
          />
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Security Settings</h2>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg mb-4">
            <div>
              <p className="font-medium text-slate-700">Two-Factor Authentication</p>
              <p className="text-xs text-slate-500">Require 2FA for admin accounts</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.twoFactorAuth}
              onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
              className="w-5 h-5 text-yellow-600"
            />
          </div>
          <FormInput
            label="Session Timeout (minutes)"
            type="number"
            value={securitySettings.sessionTimeout}
            onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: e.target.value })}
          />
          <FormInput
            label="Password Expiry (days)"
            type="number"
            value={securitySettings.passwordExpiry}
            onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiry: e.target.value })}
          />
          <FormInput
            label="Max Login Attempts"
            type="number"
            value={securitySettings.loginAttempts}
            onChange={(e) => setSecuritySettings({ ...securitySettings, loginAttempts: e.target.value })}
          />
        </div>

        {/* Platform Status */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Platform Status</h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-green-700">TaxiCab Platform</p>
                <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium">Online</span>
              </div>
              <p className="text-xs text-green-600">All systems operational</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-green-700">BMTOA Platform</p>
                <span className="px-2 py-1 bg-green-500 text-white rounded text-xs font-medium">Online</span>
              </div>
              <p className="text-xs text-green-600">All systems operational</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">System Version: <strong>v2.1.0</strong></p>
              <p className="text-xs text-blue-600">Last updated: January 2, 2025</p>
            </div>
            <Button variant="outline" className="w-full">View System Logs</Button>
            <Button variant="outline" className="w-full">Database Backup</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
