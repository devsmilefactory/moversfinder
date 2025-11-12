import React, { useState } from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea, FormCheckbox } from '../../shared/FormInput';
import Button from '../../shared/Button';

/**
 * Compact Errands Service Booking Form
 *
 * Designed for use within UnifiedBookingModal
 * Single-screen, compact layout for multi-task errands
 */

const CompactErrandsForm = ({ formData, onChange, savedPlaces = [] }) => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    startPoint: '',
    destinationPoint: '',
    description: '',
    estimatedDuration: '15',
    startTime: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    onChange({ ...formData, [name]: value });
  };

  const handleLocationChange = (field) => (e) => {
    onChange({ ...formData, [field]: e.target.value });
  };

  const handleOpenTaskModal = (index = null) => {
    if (index !== null) {
      // Editing existing task
      setEditingTaskIndex(index);
      setTaskFormData(formData.tasks[index]);
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
    }
    setShowTaskModal(true);
  };

  const handleSaveTask = () => {
    const tasks = formData.tasks || [];
    if (editingTaskIndex !== null) {
      // Update existing task
      tasks[editingTaskIndex] = taskFormData;
    } else {
      // Add new task
      tasks.push(taskFormData);
    }
    onChange({ ...formData, tasks });
    setShowTaskModal(false);
  };

  const handleRemoveTask = (index) => {
    const tasks = formData.tasks || [];
    onChange({
      ...formData,
      tasks: tasks.filter((_, i) => i !== index)
    });
  };

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
              {formData.tasks.map((task, index) => (
                <div
                  key={index}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-yellow-400 transition-colors cursor-pointer"
                  onClick={() => handleOpenTaskModal(index)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-slate-500">Task {index + 1}</span>
                        <span className="text-xs text-slate-400">• {task.estimatedDuration} min</span>
                        {task.startTime && <span className="text-xs text-slate-400">• {task.startTime}</span>}
                      </div>
                      <p className="text-sm font-medium text-slate-700 mb-1">{task.description || 'No description'}</p>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <span>📍 {task.startPoint || 'No start point'}</span>
                        <span>→</span>
                        <span>{task.destinationPoint || 'No destination'}</span>
                      </div>
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
              ))}
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
              <LocationInput
                label="Task Start Point"
                value={taskFormData.startPoint}
                onChange={(e) => setTaskFormData({ ...taskFormData, startPoint: e.target.value })}
                savedPlaces={savedPlaces}
                required
                placeholder="Where does this task start?"
              />

              <LocationInput
                label="Task Destination Point"
                value={taskFormData.destinationPoint}
                onChange={(e) => setTaskFormData({ ...taskFormData, destinationPoint: e.target.value })}
                savedPlaces={savedPlaces}
                required
                placeholder="Where does this task end?"
              />

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
            <div className="p-4 border-t border-slate-200 flex gap-3">
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
      )}
    </>
  );
};

export default CompactErrandsForm;

