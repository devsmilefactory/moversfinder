import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, XCircle, Info } from 'lucide-react';

/**
 * Reusable Confirmation Modal Component
 * 
 * Props:
 * - isOpen: boolean - controls modal visibility
 * - onClose: function - called when modal is closed
 * - onConfirm: function - called when user confirms
 * - title: string - modal title
 * - message: string - modal message/description
 * - confirmText: string - text for confirm button (default: "Confirm")
 * - cancelText: string - text for cancel button (default: "Cancel")
 * - type: string - 'info' | 'success' | 'warning' | 'error' (default: 'info')
 * - confirmButtonClass: string - custom class for confirm button
 */
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'info',
  confirmButtonClass = ''
}) => {
  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: XCircle
  };

  const iconColors = {
    info: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  const iconBgColors = {
    info: 'bg-blue-100',
    success: 'bg-green-100',
    warning: 'bg-yellow-100',
    error: 'bg-red-100'
  };

  const Icon = icons[type] || icons.info;
  const iconColor = iconColors[type] || iconColors.info;
  const iconBgColor = iconBgColors[type] || iconBgColors.info;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Icon */}
              <div className="p-6 pb-4">
                <div className={`w-16 h-16 ${iconBgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`w-8 h-8 ${iconColor}`} />
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                  {title}
                </h3>

                {/* Message */}
                <p className="text-gray-600 text-center whitespace-pre-line">
                  {message}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 pt-4 bg-gray-50">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  {cancelText}
                </button>
                <button
                  onClick={handleConfirm}
                  className={
                    confirmButtonClass ||
                    'flex-1 px-4 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary/90 transition-colors'
                  }
                >
                  {confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;

