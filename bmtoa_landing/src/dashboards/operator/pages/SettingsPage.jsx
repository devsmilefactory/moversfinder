import React, { useState } from 'react';
import Button from '../../shared/Button';
import FormInput, { FormSelect } from '../../shared/FormInput';

/**
 * Operator Settings Page (BMTOA)
 *
 * Features:
 * - Company profile settings
 * - Fleet preferences
 * - Notification settings
 * - BMTOA membership settings
 */

const SettingsPage = () => {
  const [companyInfo, setCompanyInfo] = useState({
    name: 'ABC Taxi Services',
    email: 'contact@abctaxis.co.zw',
    phone: '+263 71 234 5678',
    address: 'City Center, Bulawayo'
  });

  const [preferences, setPreferences] = useState({
    autoAssign: true,
    emailNotifications: true,
    smsNotifications: true,
    maintenanceReminders: true,
    defaultCommission: 15
  });

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Operator Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your operator account settings</p>
        </div>
        <Button variant="primary" onClick={handleSave}>Save Changes</Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Company Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Company Information</h2>
          <FormInput
            label="Company Name"
            value={companyInfo.name}
            onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
          />
          <FormInput
            label="Email"
            type="email"
            value={companyInfo.email}
            onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
          />
          <FormInput
            label="Phone"
            value={companyInfo.phone}
            onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
          />
          <FormInput
            label="Address"
            value={companyInfo.address}
            onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
          />
        </div>

        {/* Fleet Preferences */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Fleet Preferences</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-700">Auto-assign Drivers</p>
                <p className="text-xs text-slate-500">Automatically assign rides to available drivers</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.autoAssign}
                onChange={(e) => setPreferences({ ...preferences, autoAssign: e.target.checked })}
                className="w-5 h-5 text-yellow-600"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-700">Maintenance Reminders</p>
                <p className="text-xs text-slate-500">Get reminders for vehicle maintenance</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.maintenanceReminders}
                onChange={(e) => setPreferences({ ...preferences, maintenanceReminders: e.target.checked })}
                className="w-5 h-5 text-yellow-600"
              />
            </div>
            <FormInput
              label="Default Commission Rate (%)"
              type="number"
              value={preferences.defaultCommission}
              onChange={(e) => setPreferences({ ...preferences, defaultCommission: e.target.value })}
            />
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Notification Settings</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-700">Email Notifications</p>
                <p className="text-xs text-slate-500">Receive updates via email</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.emailNotifications}
                onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                className="w-5 h-5 text-yellow-600"
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div>
                <p className="font-medium text-slate-700">SMS Notifications</p>
                <p className="text-xs text-slate-500">Receive updates via SMS</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.smsNotifications}
                onChange={(e) => setPreferences({ ...preferences, smsNotifications: e.target.checked })}
                className="w-5 h-5 text-yellow-600"
              />
            </div>
          </div>
        </div>

        {/* BMTOA Membership */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">BMTOA Membership</h2>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
              <p className="text-sm text-yellow-700 mb-2">Status: <strong>Active Premium Member</strong></p>
              <p className="text-xs text-yellow-600">Member #BMTOA-2024-0156</p>
            </div>
            <Button variant="outline" className="w-full">View Membership Details</Button>
            <Button variant="outline" className="w-full">Renew Membership</Button>
            <Button variant="outline" className="w-full">Download Certificate</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
