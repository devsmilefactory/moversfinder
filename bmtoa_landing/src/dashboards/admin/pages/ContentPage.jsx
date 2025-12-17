import React, { useState } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import FormInput, { FormTextarea } from '../../shared/FormInput';

/**
 * Admin Announcements Page (BMTOA)
 *
 * Features:
 * - Manage announcements
 * - Platform notifications
 * - Important updates
 */

const ContentPage = () => {
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementData, setAnnouncementData] = useState({
    title: '',
    message: '',
    platform: 'both'
  });

  const announcements = [
    { id: 1, title: 'System Maintenance', message: 'Scheduled maintenance on Jan 5', platform: 'Both', active: true },
    { id: 2, title: 'New Features', message: 'Check out our new driver app features', platform: 'TaxiCab', active: true },
    { id: 3, title: 'BMTOA Meeting', message: 'Monthly meeting on Jan 10', platform: 'BMTOA', active: false }
  ];

  const faqs = [
    { id: 1, question: 'How do I book a ride?', answer: 'Use the Book Ride page...', category: 'General' },
    { id: 2, question: 'What payment methods are accepted?', answer: 'EcoCash, OneMoney...', category: 'Payment' },
    { id: 3, question: 'How do I become a driver?', answer: 'Apply through BMTOA...', category: 'Driver' }
  ];

  const handleCreateAnnouncement = (e) => {
    e.preventDefault();
    setShowAnnouncementModal(false);
    setAnnouncementData({ title: '', message: '', platform: 'both' });
    alert('Announcement created successfully!');
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">📢 Announcements</h1>
          <p className="text-sm text-slate-500 mt-1">Manage platform announcements and notifications</p>
        </div>
        <Button variant="primary" onClick={() => setShowAnnouncementModal(true)}>
          ➕ Create Announcement
        </Button>
      </div>

      {/* Announcements */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">📣 Active Announcements</h2>
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border-l-4 border-yellow-400">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-slate-700">{announcement.title}</p>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    announcement.platform === 'Both' ? 'bg-purple-100 text-purple-700' :
                    announcement.platform === 'TaxiCab' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {announcement.platform}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{announcement.message}</p>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`px-3 py-1 rounded text-xs font-medium ${
                  announcement.active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {announcement.active ? '✓ Active' : 'Inactive'}
                </span>
                <Button variant="outline" size="sm">✏️ Edit</Button>
                <Button variant="danger" size="sm">🗑️ Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg shadow-lg p-6 border-2 border-blue-200">
        <div className="flex items-start gap-4">
          <div className="text-4xl">ℹ️</div>
          <div>
            <h3 className="font-semibold text-slate-700 mb-2">About Announcements</h3>
            <p className="text-sm text-slate-600 mb-2">
              Announcements are displayed to users on their dashboards and can be targeted to specific platforms:
            </p>
            <ul className="text-sm text-slate-600 space-y-1 ml-4">
              <li>• <strong>Both Platforms:</strong> Shown to all users on TaxiCab and BMTOA</li>
              <li>• <strong>TaxiCab Only:</strong> Shown only to TaxiCab users (individuals, corporates)</li>
              <li>• <strong>BMTOA Only:</strong> Shown only to BMTOA members (operators, drivers)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Announcement Modal */}
      <Modal
        isOpen={showAnnouncementModal}
        onClose={() => {
          setShowAnnouncementModal(false);
          setAnnouncementData({ title: '', message: '', platform: 'both' });
        }}
        title="Create Announcement"
        size="md"
      >
        <form onSubmit={handleCreateAnnouncement}>
          <FormInput
            label="Title"
            value={announcementData.title}
            onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
            required
          />
          <FormTextarea
            label="Message"
            value={announcementData.message}
            onChange={(e) => setAnnouncementData({ ...announcementData, message: e.target.value })}
            rows={4}
            required
          />
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Platform</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="both"
                  checked={announcementData.platform === 'both'}
                  onChange={(e) => setAnnouncementData({ ...announcementData, platform: e.target.value })}
                />
                <span className="text-sm">Both Platforms</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="taxicab"
                  checked={announcementData.platform === 'taxicab'}
                  onChange={(e) => setAnnouncementData({ ...announcementData, platform: e.target.value })}
                />
                <span className="text-sm">TaxiCab Only</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="bmtoa"
                  checked={announcementData.platform === 'bmtoa'}
                  onChange={(e) => setAnnouncementData({ ...announcementData, platform: e.target.value })}
                />
                <span className="text-sm">BMTOA Only</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAnnouncementModal(false);
                setAnnouncementData({ title: '', message: '', platform: 'both' });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create Announcement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ContentPage;
