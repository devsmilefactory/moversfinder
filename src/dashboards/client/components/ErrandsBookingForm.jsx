import React, { useState } from 'react';
import LocationInput from '../../shared/LocationInput';
import FormInput, { FormSelect, FormTextarea, FormCheckbox } from '../../shared/FormInput';
import Button from '../../shared/Button';
import { calculateEstimatedFareV2 } from '../../../utils/pricingCalculator';

/**
 * Errands Booking Form Component
 * 
 * Features:
 * - Multiple task management
 * - Each task has: description, time, pickup, dropoff, notes
 * - Scheduled or recurring
 * - Task reordering
 * 
 * Database Integration:
 * - INSERT INTO rides (service_type='errands', ...)
 * - INSERT INTO errand_tasks (ride_id, task_order, description, ...)
 */

const ErrandsBookingForm = ({ onBack }) => {
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [currentTask, setCurrentTask] = useState({
    description: '',
    scheduledTime: '',
    pickupLocation: '',
    dropoffLocation: '',
    notes: '',
    distanceKm: null,
    estimatedCost: 0
  });

  const [formData, setFormData] = useState({
    serviceType: 'errands',
    paymentMethod: 'cash',
    isRecurring: false,
    recurrenceFrequency: 'weekly',
    recurrenceDays: [],
    startDate: '',
    endDate: ''
  });

  const [loading, setLoading] = useState(false);

  const savedPlaces = [
    { id: 1, name: 'Home', address: '123 Hillside, Bulawayo', icon: '🏠', coordinates: { lat: -20.1234, lng: 28.5678 } },
    { id: 2, name: 'Bank', address: 'Main Street Bank, Bulawayo', icon: '🏦', coordinates: { lat: -20.1500, lng: 28.5833 } },
    { id: 3, name: 'Pharmacy', address: 'City Pharmacy, Bulawayo', icon: '💊', coordinates: { lat: -20.1600, lng: 28.5900 } }
  ];

  const handleTaskChange = (e) => {
    const { name, value } = e.target;
    setCurrentTask(prev => ({ ...prev, [name]: value }));
  };

  // Calculate task cost based on estimated distance
  // For now, we'll use a simple estimation: assume 5km average distance per task
  // In a real implementation, you'd use Google Maps Distance Matrix API
  const calculateTaskCost = (task) => {
    // Use a default distance of 5km for errands if not calculated
    const estimatedDistance = task.distanceKm || 5;
    const cost = calculateEstimatedFareV2({ distanceKm: estimatedDistance });
    return cost || 8; // Fallback to $8 if calculation fails
  };

  const handleAddTask = () => {
    // Calculate cost for the task before adding
    const taskWithCost = {
      ...currentTask,
      distanceKm: currentTask.distanceKm || 5, // Default 5km
      estimatedCost: calculateTaskCost(currentTask)
    };

    if (editingTaskIndex !== null) {
      // Update existing task
      const updatedTasks = [...tasks];
      updatedTasks[editingTaskIndex] = taskWithCost;
      setTasks(updatedTasks);
      setEditingTaskIndex(null);
    } else {
      // Add new task
      setTasks([...tasks, taskWithCost]);
    }

    setCurrentTask({
      description: '',
      scheduledTime: '',
      pickupLocation: '',
      dropoffLocation: '',
      notes: '',
      distanceKm: null,
      estimatedCost: 0
    });
    setShowTaskForm(false);
  };

  const handleEditTask = (index) => {
    setCurrentTask(tasks[index]);
    setEditingTaskIndex(index);
    setShowTaskForm(true);
  };

  const handleDeleteTask = (index) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      recurrenceDays: prev.recurrenceDays.includes(day)
        ? prev.recurrenceDays.filter(d => d !== day)
        : [...prev.recurrenceDays, day]
    }));
  };

  // Calculate total cost for all tasks
  const calculateTotalCost = () => {
    return tasks.reduce((total, task) => total + (task.estimatedCost || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (tasks.length === 0) {
      alert('Please add at least one task');
      return;
    }

    setLoading(true);

    // TODO: Supabase integration
    console.log('Booking errands service:', { ...formData, tasks });

    setTimeout(() => {
      setLoading(false);
      alert('🛍️ Errands service booked successfully!');
      onBack();
    }, 1500);
  };

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-slate-600 hover:text-slate-700 mb-4 flex items-center gap-2"
        >
          ← Back to services
        </button>
        <h2 className="text-2xl font-bold text-slate-700 mb-2">🛍️ Book Errands Service</h2>
        <p className="text-slate-600">Multiple tasks and errands in one trip</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task List */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-700">Tasks ({tasks.length})</h3>
            <Button
              type="button"
              variant="primary"
              onClick={() => {
                setShowTaskForm(true);
                setEditingTaskIndex(null);
                setCurrentTask({
                  description: '',
                  scheduledTime: '',
                  pickupLocation: '',
                  dropoffLocation: '',
                  notes: ''
                });
              }}
            >
              + Add Task
            </Button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-lg">
              <p className="text-4xl mb-2">📝</p>
              <p className="text-slate-600 mb-4">No tasks added yet</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTaskForm(true)}
              >
                Add Your First Task
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <div
                  key={index}
                  className="p-4 border-2 border-slate-200 rounded-lg hover:border-yellow-400 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
                          Task {index + 1}
                        </span>
                        <span className="text-sm text-slate-500">⏰ {task.scheduledTime}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded ml-auto">
                          ${task.estimatedCost?.toFixed(2) || '8.00'}
                        </span>
                      </div>
                      <h4 className="font-semibold text-slate-700 mb-2">{task.description}</h4>
                      <div className="text-sm text-slate-600 space-y-1">
                        <p>📍 Pickup: {task.pickupLocation}</p>
                        <p>📍 Drop-off: {task.dropoffLocation}</p>
                        {task.notes && <p className="text-slate-500">Note: {task.notes}</p>}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-3">
                      <button
                        type="button"
                        onClick={() => handleEditTask(index)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(index)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Form Modal */}
        {showTaskForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h3 className="text-xl font-semibold text-slate-700 mb-4">
                  {editingTaskIndex !== null ? 'Edit Task' : 'Add New Task'}
                </h3>

                <FormInput
                  label="Task Description"
                  name="description"
                  value={currentTask.description}
                  onChange={handleTaskChange}
                  placeholder="e.g., Pick up documents from bank"
                  required
                />

                <FormInput
                  label="Scheduled Time"
                  name="scheduledTime"
                  type="time"
                  value={currentTask.scheduledTime}
                  onChange={handleTaskChange}
                  required
                />

                <LocationInput
                  label="Pickup Point"
                  value={currentTask.pickupLocation}
                  onChange={(e) => handleTaskChange({ target: { name: 'pickupLocation', value: e.target.value } })}
                  savedPlaces={savedPlaces}
                  required
                  placeholder="Where to pick up?"
                />

                <LocationInput
                  label="Drop-off Point"
                  value={currentTask.dropoffLocation}
                  onChange={(e) => handleTaskChange({ target: { name: 'dropoffLocation', value: e.target.value } })}
                  savedPlaces={savedPlaces}
                  required
                  placeholder="Where to deliver?"
                />

                <FormTextarea
                  label="Additional Notes (Optional)"
                  name="notes"
                  value={currentTask.notes}
                  onChange={handleTaskChange}
                  placeholder="Any special instructions for this task"
                  rows={2}
                />

                <div className="flex gap-3 justify-end mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowTaskForm(false);
                      setEditingTaskIndex(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleAddTask}
                    disabled={!currentTask.description || !currentTask.scheduledTime || !currentTask.pickupLocation || !currentTask.dropoffLocation}
                  >
                    {editingTaskIndex !== null ? 'Update Task' : 'Add Task'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment & Schedule */}
        {tasks.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Booking Details</h3>

            <FormSelect
              label="Payment Method"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentMethod: e.target.value }))}
              required
              options={[
                { value: 'ecocash', label: '💰 EcoCash' },
                { value: 'onemoney', label: '💳 OneMoney' },
                { value: 'cash', label: '💵 Cash' },
                { value: 'usd_card', label: '💳 USD Card' }
              ]}
            />

            {/* Recurring */}
            <div className="mt-4 p-4 bg-purple-50 rounded-lg">
              <FormCheckbox
                label="Make this a recurring errand schedule"
                name="isRecurring"
                checked={formData.isRecurring}
                onChange={(e) => setFormData(prev => ({ ...prev, isRecurring: e.target.checked }))}
              />

              {formData.isRecurring && (
                <div className="mt-4 space-y-4">
                  <FormSelect
                    label="Frequency"
                    name="recurrenceFrequency"
                    value={formData.recurrenceFrequency}
                    onChange={(e) => setFormData(prev => ({ ...prev, recurrenceFrequency: e.target.value }))}
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' }
                    ]}
                  />

                  {formData.recurrenceFrequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Select Days
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {weekDays.map(day => (
                          <button
                            key={day}
                            type="button"
                            onClick={() => handleDayToggle(day)}
                            className={`px-4 py-2 rounded-lg border-2 transition-all ${
                              formData.recurrenceDays.includes(day)
                                ? 'border-purple-500 bg-purple-100 text-purple-700'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormInput
                      label="Start Date"
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                    <FormInput
                      label="End Date (Optional)"
                      name="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      min={formData.startDate}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Estimate */}
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-slate-700 mb-3">Price Breakdown</h4>
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">
                      Task {index + 1}: {task.description.substring(0, 30)}
                      {task.description.length > 30 ? '...' : ''}
                    </span>
                    <span className="font-semibold text-slate-700">
                      ${task.estimatedCost?.toFixed(2) || '8.00'}
                    </span>
                  </div>
                ))}
                <div className="border-t border-yellow-300 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">Total ({tasks.length} tasks):</span>
                  <span className="text-lg font-bold text-slate-700">
                    ${calculateTotalCost().toFixed(2)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Each task is priced based on estimated distance (~5km average per task)
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end mt-6">
              <Button type="button" variant="outline" onClick={onBack}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={loading}>
                Book Errands Service
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

export default ErrandsBookingForm;

