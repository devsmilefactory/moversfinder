import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import { useAuthStore } from '../../../stores';
import useDriverStore from '../../../stores/driverStore';
import { REQUIRED_DOCUMENT_TYPES } from '../../../utils/driverCompletion';

/**
 * Driver Documents Page
 *
 * Features:
 * - 7 Zimbabwe-required documents for taxi drivers
 * - Upload functionality with Supabase Storage
 * - Status indicators (Pending, Approved, Rejected, Expired)
 * - Expiry date tracking
 * - Admin rejection reasons
 * - Re-upload capability
 *
 * Supabase Integration:
 * - Fetches documents from documents table
 * - Uploads files to Supabase Storage
 * - Tracks document status and expiry dates
 */

// 7 Zimbabwe-required documents for taxi drivers
const DOCUMENT_TYPES = [
  {
    id: 'drivers_license',
    name: "Driver's License",
    description: 'Valid Zimbabwe driver\'s license',
    icon: '🪪',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'psv_license',
    name: 'PSV License',
    description: 'Public Service Vehicle license',
    icon: '📋',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'vehicle_registration',
    name: 'Vehicle Registration',
    description: 'Blue Book (Vehicle Registration)',
    icon: '📘',
    required: true,
    hasExpiry: false,
  },
  {
    id: 'insurance',
    name: 'Insurance Certificate',
    description: 'Valid vehicle insurance',
    icon: '🛡️',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'roadworthy',
    name: 'Roadworthy Certificate',
    description: 'Vehicle fitness certificate',
    icon: '✅',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'police_clearance',
    name: 'Police Clearance',
    description: 'Criminal record check',
    icon: '👮',
    required: true,
    hasExpiry: true,
  },
  {
    id: 'medical_certificate',
    name: 'Medical Certificate',
    description: 'Health fitness certificate',
    icon: '🏥',
    required: true,
    hasExpiry: true,
  },
];

const DocumentsPage = () => {
  const user = useAuthStore((state) => state.user);
  const { documents, loading, loadDocuments, uploadDocument, uploadDocumentsBatch, batchUploading } = useDriverStore();

  useEffect(() => {
    if (user?.id) {
      loadDocuments(user.id);
    }
  }, [user?.id, loadDocuments]);

  // State management
  const [selectedDocumentType, setSelectedDocumentType] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState('');

  // Batch upload state (queued files and metadata)
  const [batchSelectedFiles, setBatchSelectedFiles] = useState({}); // { [docType]: File }
  const [batchExpiryDates, setBatchExpiryDates] = useState({}); // { [docType]: 'YYYY-MM-DD' }
  const [batchStatuses, setBatchStatuses] = useState({}); // { [docType]: 'success'|'error' }
  const [batchErrors, setBatchErrors] = useState({}); // { [docType]: string }

  // Get document by type
  const getDocument = (documentType) => {
    return documents?.find(doc => doc.document_type === documentType);
  };

  // Helper to get document property with correct database column name
  const getDocProp = (doc, prop) => {
    if (!doc) return null;
    // Map camelCase to snake_case for database columns
    const propMap = {
      fileUrl: 'file_url',
      expiryDate: 'expiry_date',
      documentNumber: 'document_number',
      documentType: 'document_type',
    };
    return doc[propMap[prop] || prop];
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      approved: { bg: 'bg-green-100', text: 'text-green-700', label: 'Approved' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Review' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      expired: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Expired' },
    };
    const badge = badges[status] || badges.pending;
    return (
      <span className={`px-3 py-1 ${badge.bg} ${badge.text} rounded-full text-xs font-medium`}>
        {badge.label}
      </span>
    );
  };

  // Check if document is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Queue current modal selection into batch (do not upload yet)
  const handleUpload = async () => {
    if (!uploadFile) {
      alert('Please select a file to add to uploads');
      return;
    }
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }
    const typeId = selectedDocumentType.id;
    // Validate expiry if required
    if (selectedDocumentType.hasExpiry && !expiryDate) {
      alert('Please select an expiry date for this document');
      return;
    }
    setBatchSelectedFiles((prev) => ({ ...prev, [typeId]: uploadFile }));
    if (selectedDocumentType.hasExpiry) {
      setBatchExpiryDates((prev) => ({ ...prev, [typeId]: expiryDate }));
    }
    setBatchStatuses((prev) => ({ ...prev, [typeId]: undefined }));
    setBatchErrors((prev) => ({ ...prev, [typeId]: undefined }));
    // Reset and close modal
    setUploadFile(null);
    setExpiryDate('');
    setShowUploadModal(false);
  };

  // Submit all queued documents in batch
  const handleSubmitAll = async () => {
    if (!user?.id) {
      alert('User not authenticated');
      return;
    }
    const entries = Object.entries(batchSelectedFiles);
    if (entries.length === 0) return;

    // Build items and validate expiry for types that require it
    const items = entries.map(([docType, file]) => {
      const dt = DOCUMENT_TYPES.find((d) => d.id === docType);
      const expiry = dt?.hasExpiry ? (batchExpiryDates[docType] || null) : null;
      return { documentType: docType, file, expiryDate: expiry };
    });

    // Run batch upload (parallel) and update per-doc status
    const results = await uploadDocumentsBatch(user.id, items, { parallel: true });
    const nextStatuses = { ...batchStatuses };
    const nextErrors = { ...batchErrors };
    const nextFiles = { ...batchSelectedFiles };
    const nextExpiry = { ...batchExpiryDates };

    results.forEach((r) => {
      if (r.success) {
        nextStatuses[r.documentType] = 'success';
        delete nextFiles[r.documentType];
        delete nextExpiry[r.documentType];
        delete nextErrors[r.documentType];
      } else {
        nextStatuses[r.documentType] = 'error';
        nextErrors[r.documentType] = r.error || 'Upload failed';
      }
    });

    setBatchStatuses(nextStatuses);
    setBatchErrors(nextErrors);
    setBatchSelectedFiles(nextFiles);
    setBatchExpiryDates(nextExpiry);
  };


  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];


    if (file) {
      // Validate file type (PDF, JPG, PNG)
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF, JPG, or PNG file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }
      setUploadFile(file);
    }
  };

  // Open upload modal
  const openUploadModal = (documentType) => {
    setSelectedDocumentType(documentType);
    setShowUploadModal(true);
  };

  // Presence-based document completion using shared required doc types
  const requiredDocTypes = REQUIRED_DOCUMENT_TYPES;
  const queuedDocTypes = Object.keys(batchSelectedFiles);
  const queuedSet = new Set(queuedDocTypes);
  const docsPresent = requiredDocTypes.filter((dt) => {
    if (queuedSet.has(dt)) return true; // count queued uploads
    const doc = getDocument(dt);
    const fileUrl = getDocProp(doc, 'fileUrl');
    return !!fileUrl;
  }).length;
  const completionPercentage = Math.round((docsPresent / requiredDocTypes.length) * 100);

  return (
    <>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-700">Documents</h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload and manage your required documents for taxi operation in Zimbabwe
          </p>
        </div>

        {/* Completion Progress */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold text-slate-700">Document Verification Progress</h3>
            <span className="text-2xl font-bold text-slate-700">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="bg-green-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            ></div>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {documents.filter(doc => doc.status === 'approved').length} of {DOCUMENT_TYPES.length} documents approved
          </p>
        </div>

        {/* Batch upload bar */}
        {Object.keys(batchSelectedFiles).length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="text-sm text-amber-800">
                <strong>{Object.keys(batchSelectedFiles).length}</strong> document(s) queued for upload
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBatchSelectedFiles({});
                    setBatchExpiryDates({});
                    setBatchStatuses({});
                    setBatchErrors({});
                  }}
                >
                  Clear All
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmitAll}
                  disabled={batchUploading}
                >
                  {batchUploading ? 'Uploading...' : 'Submit All Documents'}
                </Button>
              </div>
            </div>
            {/* Queued list */}
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.keys(batchSelectedFiles).map((key) => (
                <span key={key} className="px-2 py-1 bg-white border border-amber-200 rounded text-xs text-amber-900">
                  {DOCUMENT_TYPES.find((d) => d.id === key)?.name || key}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Documents Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {DOCUMENT_TYPES.map((docType) => {
            const document = getDocument(docType.id);
            const expired = document && isExpired(getDocProp(document, 'expiryDate'));
            const status = expired ? 'expired' : (document?.status || 'not_uploaded');

            return (
              <div
                key={docType.id}
                className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{docType.icon}</div>
                    <div>
                      <h3 className="font-semibold text-slate-700">{docType.name}</h3>
                      <p className="text-xs text-slate-500">{docType.description}</p>
                    </div>
                  </div>
                  {docType.required && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      Required
                    </span>
                  )}
                </div>

                {/* Document Status */}
                {document ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Status:</span>
                      {getStatusBadge(status)}
                    </div>

                    {document.fileName && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">File:</span>
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">
                          {document.fileName}
                        </span>
                      </div>
                    )}

                    {document.uploadedAt && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Uploaded:</span>
                        <span className="text-sm text-slate-700">{document.uploadedAt}</span>
                      </div>
                    )}

                    {getDocProp(document, 'expiryDate') && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Expires:</span>
                        <span className={`text-sm font-medium ${expired ? 'text-red-600' : 'text-slate-700'}`}>
                          {getDocProp(document, 'expiryDate')}
                          {expired && ' (Expired)'}
                        </span>
                      </div>
                    )}

                    {document.rejectionReason && (
                      <div className="p-3 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-700 font-medium mb-1">Rejection Reason:</p>
                        <p className="text-xs text-red-900">{document.rejectionReason}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      {(status === 'rejected' || status === 'expired') && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="flex-1"
                          onClick={() => openUploadModal(docType)}
                        >
                          Re-upload
                        </Button>
                      )}
                      {status === 'approved' && docType.hasExpiry && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => openUploadModal(docType)}
                        >
                          Update
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getDocProp(document, 'fileUrl'), '_blank')}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500 mb-3">Not uploaded</p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => openUploadModal(docType)}
                    >
                      Upload Document
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Modal */}
      {selectedDocumentType && (
        <Modal
          isOpen={showUploadModal}
          onClose={() => {
            setShowUploadModal(false);
            setUploadFile(null);
            setExpiryDate('');
          }}
          title={`Upload ${selectedDocumentType.name}`}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-600 mb-4">{selectedDocumentType.description}</p>

              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select File (PDF, JPG, or PNG - Max 5MB)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {uploadFile && (
                <p className="text-sm text-green-600 mt-2">✓ {uploadFile.name} selected</p>
              )}
            </div>

            {selectedDocumentType.hasExpiry && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Your document will be reviewed by our admin team within 24 hours.
                You'll be notified once it's approved.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setExpiryDate('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpload}
              >
                Add to Uploads
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default DocumentsPage;
