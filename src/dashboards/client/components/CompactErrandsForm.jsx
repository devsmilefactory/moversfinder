import React, { useState, useEffect, useMemo } from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea, FormCheckbox } from '../../shared/FormInput';
import Button from '../../shared/Button';
import { getTaskAddressValue, estimateErrandTask } from '../../../utils/errandTasks';
import { useCorporateInvoiceApproval } from '../../../hooks/useCorporateInvoiceApproval';

/**
 * Compact Errands Service Booking Form
 *
 * Designed for use within UnifiedBookingModal
 * Single-screen, compact layout for multi-task errands
 */

const CompactErrandsForm = ({ formData, onChange, savedPlaces = [], taskEstimates = null, taskTotalCost = 0 }) => {
  const { isApproved, isLoading } = useCorporateInvoiceApproval();
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    startPoint: '',
    destinationPoint: '',
    description: '',
    estimatedDuration: '15',
    startTime: ''
  });
  const [taskEstimate, setTaskEstimate] = useState(null);
  const [taskEstimateLoading, setTaskEstimateLoading] = useState(false);
  const perTaskSummaries = useMemo(() => taskEstimates?.perTask || [], [taskEstimates]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Check approval if invoice payment method is selected
    if (name === 'paymentMethod' && value === 'invoice') {
      if (!isLoading && !isApproved) {
        alert('⚠️ Corporate Invoice payment requires an approved corporate account. Please apply for one in your Profile under Payment Methods.');
        return; // Prevent selection
      }
    }

    onChange(prev => ({ ...prev, [name]: value }));
  };

  const resolveLocationDisplay = (value) => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value?.data?.address || value?.address || '';
  };

  const handleTaskLocationChange = (field) => (e) => {
    if (e?.target?.data) {
      setTaskFormData(prev => ({
        ...prev,
        [field]: {
          data: e.target.data,
          address: e.target.value || e.target.data?.address || ''
        }
      }));
    } else {
      setTaskFormData(prev => ({ ...prev, [field]: e?.target?.value ?? '' }));
    }
  };

  const handleOpenTaskModal = (index = null) => {
    if (index !== null) {
      // Editing existing task
      setEditingTaskIndex(index);
      setTaskFormData(formData.tasks[index]);
      setTaskEstimate(perTaskSummaries[index] || null);
      setTaskEstimateLoading(false);
    } else {
      // Adding new task
      setEditingTaskIndex(null);
      setTaskFormData({
        startPoint: '',
        destinationPoint: '',
        description: '',
        estimatedDuration: '15',
        startTime: ''
      });
      setTaskEstimate(null);
      setTaskEstimateLoading(false);
    }
    setShowTaskModal(true);
  };

  const handleSaveTask = () => {
    onChange(prev => {
      const currentTasks = Array.isArray(prev.tasks) ? [...prev.tasks] : [];
      if (editingTaskIndex !== null) {
        currentTasks[editingTaskIndex] = taskFormData;
      } else {
        currentTasks.push(taskFormData);
      }
      return { ...prev, tasks: currentTasks };
    });
    setShowTaskModal(false);
    setEditingTaskIndex(null);
    setTaskFormData({
      startPoint: '',
      destinationPoint: '',
      description: '',
      estimatedDuration: '15',
      startTime: ''
    });
  };

  const handleRemoveTask = (index) => {
    const tasks = formData.tasks || [];
    onChange({
      ...formData,
      tasks: tasks.filter((_, i) => i !== index)
    });
  };

  useEffect(() => {
    let cancelled = false;
    if (!showTaskModal) {
      setTaskEstimate(null);
      setTaskEstimateLoading(false);
      return () => {};
    }

    const hasLocations = taskFormData?.startPoint && taskFormData?.destinationPoint;
    if (!hasLocations) {
      setTaskEstimate(null);
      setTaskEstimateLoading(false);
      return () => {};
    }

    setTaskEstimateLoading(true);

    (async () => {
      try {
        const estimate = await estimateErrandTask({
          startPoint: taskFormData.startPoint,
          destinationPoint: taskFormData.destinationPoint
        });
        if (!cancelled) {
          setTaskEstimate(estimate);
        }
      } catch (error) {
        console.warn('Failed to compute errand task preview:', error);
        if (!cancelled) {
          setTaskEstimate(null);
        }
      } finally {
        if (!cancelled) {
          setTaskEstimateLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [showTaskModal, taskFormData.startPoint, taskFormData.destinationPoint]);

  return (
    <>
      <div className="space-y-4">
        {/* Task List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">
              Tasks/Errands <span className="text-red-500">*</span>
            </label>
            <span className="text-xs text-slate-500">
              {(formData.tasks || []).length} task{(formData.tasks || []).length !== 1 ? 's' : ''}
            </span>
          </div>

          {(!formData.tasks || formData.tasks.length === 0) && (
            <div className="text-center py-8 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
              <div className="text-4xl mb-2">📝</div>
              <p className="text-sm text-slate-600 mb-1">No tasks added yet</p>
              <p className="text-xs text-slate-500">Click "Add Task" to get started</p>
            </div>
          )}

          {formData.tasks && formData.tasks.length > 0 && (
            <div className="space-y-2">
              {formData.tasks.map((task, index) => {
                const summary = perTaskSummaries[index];
                return (
                  <div
                    key={index}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-yellow-400 transition-colors cursor-pointer"
                    onClick={() => handleOpenTaskModal(index)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-slate-500">Task {index + 1}</span>
                          <span className="text-xs text-slate-400">• {task.estimatedDuration || '15'} min</span>
                          {task.startTime && <span className="text-xs text-slate-400">• {task.startTime}</span>}
                        </div>
                        <p className="text-sm font-medium text-slate-700 mb-1">{task.description || 'No description'}</p>
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <span>📍 {resolveLocationDisplay(task.startPoint) || 'No start point'}</span>
                          <span>→</span>
                          <span>{resolveLocationDisplay(task.destinationPoint) || 'No destination'}</span>
                        </div>
                        {summary && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            ≈ {Number(summary.distanceKm ?? 0).toFixed(1)} km • {summary.durationMinutes ?? 0} min • ${Number(summary.cost ?? 0).toFixed(2)}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveTask(index);
                        }}
                        className="text-red-500 hover:text-red-600 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={() => handleOpenTaskModal()}
            className="w-full mt-3 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 text-slate-800 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span>
            <span>Add Task</span>
          </button>

          {taskEstimates && formData.tasks && formData.tasks.length > 0 && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-900">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Totals</span>
                <span>${Number(taskTotalCost || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-green-700 mt-1">
                <span>Distance</span>
                <span>{Number(taskEstimates.totalDistanceKm ?? 0).toFixed(1)} km</span>
              </div>
              <div className="flex items-center justify-between text-xs text-green-700">
                <span>Duration</span>
                <span>{taskEstimates.totalDurationMinutes ?? 0} min</span>
              </div>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
          <FormSelect
            label="Payment Method"
            name="paymentMethod"
            value={formData.paymentMethod || 'cash'}
            onChange={handleChange}
            required
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'invoice', label: 'Corporate Invoice' + (!isLoading && !isApproved ? ' (Requires Approval)' : '') },
              { value: 'ecocash', label: 'EcoCash' },
              { value: 'onemoney', label: 'OneMoney' },
              { value: 'card', label: 'Card' }
            ]}
          />
          {formData.paymentMethod === 'invoice' && !isLoading && !isApproved && (
            <p className="text-xs text-red-600 mt-1">
              ⚠️ Corporate Invoice requires approval. Please apply in your Profile.
            </p>
          )}
        </div>

        {/* Special Instructions */}
        <FormTextarea
          label="Special Instructions (Optional)"
          name="specialInstructions"
          value={formData.specialInstructions || ''}
          onChange={handleChange}
          placeholder="Any additional information for the driver..."
          rows={2}
        />
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-700">
                {editingTaskIndex !== null ? `Edit Task ${editingTaskIndex + 1}` : 'Add New Task'}
              </h3>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                <LocationInput
                  label="Task Start Point"
                  value={resolveLocationDisplay(taskFormData.startPoint)}
                  onChange={handleTaskLocationChange('startPoint')}
                  savedPlaces={savedPlaces}
                  required
                  placeholder="Where does this task start?"
                />
              </div>

              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
                <LocationInput
                  label="Task Destination Point"
                  value={resolveLocationDisplay(taskFormData.destinationPoint)}
                  onChange={handleTaskLocationChange('destinationPoint')}
                  savedPlaces={savedPlaces}
                  required
                  placeholder="Where does this task end?"
                />
              </div>

              <FormTextarea
                label="Task Description"
                value={taskFormData.description}
                onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                placeholder="What needs to be done?"
                rows={3}
                required
              />

              <FormSelect
                label="Estimated Duration"
                value={taskFormData.estimatedDuration}
                onChange={(e) => setTaskFormData({ ...taskFormData, estimatedDuration: e.target.value })}
                options={[
                  { value: '5', label: '5 minutes' },
                  { value: '10', label: '10 minutes' },
                  { value: '15', label: '15 minutes' },
                  { value: '30', label: '30 minutes' },
                  { value: '45', label: '45 minutes' },
                  { value: '60', label: '1 hour' }
                ]}
              />

              <FormInput
                label="Start Time (What time do you want it done?)"
                type="time"
                value={taskFormData.startTime}
                onChange={(e) => setTaskFormData({ ...taskFormData, startTime: e.target.value })}
                placeholder="Select time"
              />
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 mb-3">
                <p className="text-xs font-semibold text-slate-500 uppercase">Task Estimate</p>
                {taskEstimateLoading ? (
                  <p className="text-sm text-slate-600 mt-1">Calculating...</p>
                ) : taskEstimate ? (
                  <div className="text-sm text-slate-700 mt-1">
                    <p>${taskEstimate.cost.toFixed(2)} • {taskEstimate.distanceKm.toFixed(1)} km • {taskEstimate.durationMinutes} min</p>
                    <p className="text-[11px] text-slate-500">Estimate updates when pickup and destination change</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">Enter pickup and destination to see estimate</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowTaskModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveTask}
                  disabled={!taskFormData.startPoint || !taskFormData.destinationPoint || !taskFormData.description}
                  className="flex-1"
                >
                  {editingTaskIndex !== null ? 'Update Task' : 'Add Task'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompactErrandsForm;

