import React, { useState } from 'react';
import { FormInput, FormSelect, FormTextarea } from '../../shared/forms';
import { Plus, MapPin, Clock, Trash2 } from 'lucide-react';

/**
 * ErrandsBookingForm Component
 * 
 * Service-specific form for errands/multi-stop tasks with:
 * - Task management (add/edit/remove)
 * - Location and timing for each task
 * - Estimated duration and wait times
 * - Return to start option
 */
const ErrandsBookingForm = ({
  serviceData = {},
  formData = {},
  onServiceDataUpdate,
  onFormDataUpdate,
  errors = {},
  warnings = {}
}) => {
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [taskFormData, setTaskFormData] = useState({
    location: '',
    description: '',
    estimatedDuration: 15,
    instructions: '',
    waitTime: 5
  });

  // Handle service-specific field updates
  const handleServiceChange = (field, value) => {
    onServiceDataUpdate({ [field]: value });
  };

  // Task management
  const handleOpenTaskModal = (index = null) => {
    if (index !== null) {
      // Editing existing task
      setEditingTaskIndex(index);
      setTaskFormData(serviceData.tasks[index] || {});
    } else {
      // Adding new task
      setEditingTaskIndex(null);
      setTaskFormData({
        location: '',
        description: '',
        estimatedDuration: 15,
        instructions: '',
        waitTime: 5
      });
    }
    setShowTaskModal(true);
  };

  const handleSaveTask = () => {
    const currentTasks = [...(serviceData.tasks || [])];
    
    if (editingTaskIndex !== null) {
      currentTasks[editingTaskIndex] = taskFormData;
    } else {
      currentTasks.push(taskFormData);
    }
    
    handleServiceChange('tasks', currentTasks);
    setShowTaskModal(false);
    setEditingTaskIndex(null);
  };

  const handleRemoveTask = (index) => {
    const currentTasks = serviceData.tasks || [];
    handleServiceChange('tasks', currentTasks.filter((_, i) => i !== index));
  };

  const handleTaskFormChange = (field, value) => {
    setTaskFormData(prev => ({ ...prev, [field]: value }));
  };

  const tasks = serviceData.tasks || [];
  const totalEstimatedTime = tasks.reduce((total, task) => 
    total + (task.estimatedDuration || 0) + (task.waitTime || 0), 0
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        🛒 Errands & Tasks
      </h3>

      {/* Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-slate-700">Tasks to Complete</h4>
          <button
            type="button"
            onClick={() => handleOpenTaskModal()}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        </div>

        {tasks.length > 0 ? (
          <div className="space-y-3">
            {tasks.map((task, index) => (
              <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-slate-600">Task {index + 1}</span>
                      <span className="text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                        ~{task.estimatedDuration || 15} min
                      </span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <MapPin className="w-4 h-4 text-slate-500" />
                        <span>{task.location || 'Location not set'}</span>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-slate-600 ml-6">{task.description}</p>
                      )}
                      
                      {task.instructions && (
                        <p className="text-xs text-slate-500 ml-6 italic">{task.instructions}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      type="button"
                      onClick={() => handleOpenTaskModal(index)}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveTask(index)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Clock className="w-4 h-4" />
                <span className="font-medium">
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''} • 
                  Estimated total time: {totalEstimatedTime} minutes
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-3xl mb-2">📝</div>
            <p className="text-sm font-medium">No tasks added yet</p>
            <p className="text-xs mt-1">Add tasks for your errands service</p>
            <button
              type="button"
              onClick={() => handleOpenTaskModal()}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Add Your First Task
            </button>
          </div>
        )}

        {errors.tasks && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <span>⚠️</span>
            {errors.tasks}
          </p>
        )}
      </div>

      {/* Service Options */}
      <div className="grid grid-cols-2 gap-4">
        <FormInput
          label="Max Wait Time (per task)"
          type="number"
          value={serviceData.maxWaitTime || 30}
          onChange={(value) => handleServiceChange('maxWaitTime', parseInt(value) || 30)}
          min={5}
          max={120}
          suffix="minutes"
          error={errors.maxWaitTime}
        />

        <FormSelect
          label="Service Priority"
          value={serviceData.priority || 'standard'}
          onChange={(value) => handleServiceChange('priority', value)}
          options={[
            { value: 'standard', label: 'Standard' },
            { value: 'express', label: 'Express (+25%)' },
            { value: 'priority', label: 'Priority (+50%)' }
          ]}
        />
      </div>

      {/* Return to Start */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={serviceData.returnToStart || false}
            onChange={(e) => handleServiceChange('returnToStart', e.target.checked)}
            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 mt-0.5"
          />
          <div className="flex-1">
            <div className="font-medium text-slate-700 text-sm">Return to Starting Point</div>
            <div className="text-xs text-slate-600 mt-1">
              Driver will return you to the pickup location after completing all tasks
            </div>
          </div>
        </label>
      </div>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-700">
                {editingTaskIndex !== null ? 'Edit Task' : 'Add New Task'}
              </h3>
            </div>
            
            <div className="p-4 space-y-4 overflow-y-auto">
              <FormInput
                label="Task Location"
                value={taskFormData.location || ''}
                onChange={(value) => handleTaskFormChange('location', value)}
                placeholder="Where is this task?"
                required
              />
              
              <FormTextarea
                label="Task Description"
                value={taskFormData.description || ''}
                onChange={(value) => handleTaskFormChange('description', value)}
                placeholder="What needs to be done?"
                rows={2}
                required
              />
              
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Estimated Duration"
                  type="number"
                  value={taskFormData.estimatedDuration || 15}
                  onChange={(value) => handleTaskFormChange('estimatedDuration', parseInt(value) || 15)}
                  min={5}
                  max={180}
                  suffix="min"
                />
                
                <FormInput
                  label="Wait Time"
                  type="number"
                  value={taskFormData.waitTime || 5}
                  onChange={(value) => handleTaskFormChange('waitTime', parseInt(value) || 5)}
                  min={0}
                  max={60}
                  suffix="min"
                />
              </div>
              
              <FormTextarea
                label="Special Instructions"
                value={taskFormData.instructions || ''}
                onChange={(value) => handleTaskFormChange('instructions', value)}
                placeholder="Any special instructions for this task..."
                rows={2}
              />
            </div>
            
            <div className="p-4 border-t border-slate-200 flex gap-3">
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="flex-1 px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTask}
                disabled={!taskFormData.location || !taskFormData.description}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingTaskIndex !== null ? 'Update Task' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {Object.keys(warnings).length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-orange-600 text-lg">⚠️</span>
            <div>
              <h4 className="text-sm font-medium text-orange-800 mb-1">Please note:</h4>
              <ul className="text-sm text-orange-700 space-y-1">
                {Object.entries(warnings).map(([field, warning]) => (
                  <li key={field}>• {warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrandsBookingForm;