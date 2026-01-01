import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * ComingSoonChatModal
 *
 * Placeholder chat interface (Coming soon).
 */
const ComingSoonChatModal = ({ isOpen, onClose, title = 'Chat' }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-sm font-semibold text-amber-900">Coming soon</div>
          <div className="text-sm text-amber-800 mt-1">
            In-app chat between driver and passenger is being finalized. You’ll be able to send messages here soon.
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-3 h-64 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">💬</div>
            <div className="text-sm text-gray-700 font-medium">Chat interface placeholder</div>
            <div className="text-xs text-gray-500 mt-1">Messaging will appear here.</div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-gray-100"
            placeholder="Type a message… (coming soon)"
            disabled
          />
          <Button variant="primary" size="md" disabled>
            Send
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ComingSoonChatModal;




