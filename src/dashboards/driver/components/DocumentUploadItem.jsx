import React from 'react';
import Button from '../../shared/Button';

const DocumentUploadItem = ({
  docType,
  document,
  selectedFile,
  expiryDate,
  onFileSelect,
  onExpiryChange,
  onUpload,
  isUploading,
  disabled = false,
}) => {
  const isExpired = (date) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const getDocProp = (doc, prop) => {
    if (!doc) return null;
    const propMap = {
      fileUrl: 'file_url',
      expiryDate: 'expiry_date',
      documentNumber: 'document_number',
      documentType: 'document_type',
    };
    return doc[propMap[prop] || prop];
  };

  const getStatusBadge = (status) => {
    const badges = {
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: '✓ Approved' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Review' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Expired' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-2 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.label}
      </span>
    );
  };

  const expired = document && isExpired(getDocProp(document, 'expiryDate'));
  const status = expired ? 'expired' : (document?.status || 'not_uploaded');

  return (
    <div className="border border-slate-200 rounded-lg p-5 hover:border-slate-300 transition-colors bg-white">
      {/* Document Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{docType.icon}</div>
          <div>
            <h3 className="font-semibold text-slate-700">{docType.name}</h3>
            <p className="text-xs text-slate-500">{docType.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {docType.required && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              Required
            </span>
          )}
          {document && getStatusBadge(status)}
        </div>
      </div>

      {/* Existing Document Info */}
      {document && (
        <div className="bg-slate-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            {getDocProp(document, 'documentNumber') && (
              <div>
                <span className="text-slate-600">Number:</span>
                <p className="font-medium text-slate-700 truncate">{getDocProp(document, 'documentNumber')}</p>
              </div>
            )}
            {document.created_at && (
              <div>
                <span className="text-slate-600">Uploaded:</span>
                <p className="font-medium text-slate-700">{new Date(document.created_at).toLocaleDateString()}</p>
              </div>
            )}
            {getDocProp(document, 'expiryDate') && (
              <div>
                <span className="text-slate-600">Expires:</span>
                <p className={`font-medium ${expired ? 'text-red-600' : 'text-slate-700'}`}>
                  {getDocProp(document, 'expiryDate')} {expired && '(Expired)'}
                </p>
              </div>
            )}
          </div>

          {document.rejection_reason && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-red-700 font-medium mb-1">Rejection Reason:</p>
              <p className="text-xs text-red-900">{document.rejection_reason}</p>
            </div>
          )}

          {getDocProp(document, 'fileUrl') && (
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => window.open(getDocProp(document, 'fileUrl'), '_blank')}
              >
                View Document
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Upload Form */}
      {(!document || status === 'rejected' || status === 'expired' || (status === 'approved' && docType.hasExpiry)) && (
        <div className="space-y-3 mt-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {document ? 'Update Document' : 'Select File'} (PDF, JPG, PNG - Max 5MB)
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => onFileSelect(docType.id, e.target.files[0])}
              disabled={disabled || isUploading}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm disabled:bg-slate-50"
            />
            {selectedFile && (
              <div className="flex items-center gap-2 mt-2">
                <p className="text-sm text-green-600">✓ {selectedFile.name} selected</p>
                <button
                  type="button"
                  className="text-xs text-red-600 underline"
                  onClick={() => onFileSelect(docType.id, null)}
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {docType.hasExpiry && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expiry Date
              </label>
              <input
                type="date"
                value={expiryDate || ''}
                onChange={(e) => onExpiryChange(docType.id, e.target.value)}
                disabled={disabled || isUploading}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 text-sm disabled:bg-slate-50"
              />
            </div>
          )}

          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={() => onUpload(docType.id)}
            disabled={!selectedFile || isUploading || disabled}
          >
            {isUploading ? 'Adding...' : 'Add to Uploads'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default DocumentUploadItem;






