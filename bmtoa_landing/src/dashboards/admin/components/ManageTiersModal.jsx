import React, { useState, useEffect } from 'react';
import Button from '../../shared/Button';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';

/**
 * Manage Membership Tiers Modal
 * Allows admins to view, add, edit, and manage BMTOA membership tiers
 */
const ManageTiersModal = ({ isOpen, onClose, onTierUpdated }) => {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [tierForm, setTierForm] = useState({
    tier_name: '',
    display_name: '',
    monthly_fee: '',
    description: '',
    status: 'active',
    benefits: ['']
  });

  useEffect(() => {
    if (isOpen) {
      loadTiers();
    }
  }, [isOpen]);

  const loadTiers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('membership_tiers')
        .select('*')
        .order('sort_order');

      if (error) throw error;
      setTiers(data || []);
    } catch (error) {
      console.error('Error loading tiers:', error);
      alert('Failed to load membership tiers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTier = () => {
    setEditingTier(null);
    setTierForm({
      tier_name: '',
      display_name: '',
      monthly_fee: '',
      description: '',
      status: 'active',
      benefits: ['']
    });
    setShowAddEditModal(true);
  };

  const handleEditTier = (tier) => {
    setEditingTier(tier);
    setTierForm({
      tier_name: tier.tier_name,
      display_name: tier.display_name,
      monthly_fee: tier.monthly_fee,
      description: tier.description || '',
      status: tier.status,
      benefits: Array.isArray(tier.benefits) ? tier.benefits : ['']
    });
    setShowAddEditModal(true);
  };

  const handleBenefitChange = (index, value) => {
    const newBenefits = [...tierForm.benefits];
    newBenefits[index] = value;
    setTierForm({ ...tierForm, benefits: newBenefits });
  };

  const handleAddBenefit = () => {
    setTierForm({ ...tierForm, benefits: [...tierForm.benefits, ''] });
  };

  const handleRemoveBenefit = (index) => {
    const newBenefits = tierForm.benefits.filter((_, i) => i !== index);
    setTierForm({ ...tierForm, benefits: newBenefits });
  };

  const handleSubmitTier = async (e) => {
    e.preventDefault();
    
    try {
      setSubmitting(true);

      // Filter out empty benefits
      const benefits = tierForm.benefits.filter(b => b.trim() !== '');

      const tierData = {
        tier_name: tierForm.tier_name.toLowerCase().replace(/\s+/g, '_'),
        display_name: tierForm.display_name,
        monthly_fee: parseFloat(tierForm.monthly_fee),
        description: tierForm.description,
        status: tierForm.status,
        benefits: benefits,
        updated_at: new Date().toISOString()
      };

      if (editingTier) {
        // Update existing tier
        const { error } = await supabase
          .from('membership_tiers')
          .update(tierData)
          .eq('id', editingTier.id);

        if (error) throw error;
        alert('✅ Membership tier updated successfully!');
      } else {
        // Create new tier
        const { error } = await supabase
          .from('membership_tiers')
          .insert({
            ...tierData,
            sort_order: tiers.length + 1
          });

        if (error) throw error;
        alert('✅ Membership tier created successfully!');
      }

      setShowAddEditModal(false);
      loadTiers();
      if (onTierUpdated) onTierUpdated();
    } catch (error) {
      console.error('Error saving tier:', error);
      alert(`Failed to save tier: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (tier) => {
    try {
      const newStatus = tier.status === 'active' ? 'inactive' : 'active';
      
      const { error } = await supabase
        .from('membership_tiers')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', tier.id);

      if (error) throw error;
      
      alert(`✅ Tier ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully!`);
      loadTiers();
      if (onTierUpdated) onTierUpdated();
    } catch (error) {
      console.error('Error toggling tier status:', error);
      alert(`Failed to update tier status: ${error.message}`);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="🎯 Manage Membership Tiers"
        size="large"
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-600">
              Manage BMTOA membership tiers, pricing, and benefits
            </p>
            <Button variant="primary" onClick={handleAddTier}>
              ➕ Add New Tier
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading tiers...</p>
            </div>
          ) : tiers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No membership tiers found. Click "Add New Tier" to create one.
            </div>
          ) : (
            <div className="space-y-3">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-800">
                          {tier.display_name}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          tier.status === 'active' 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tier.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">
                        {tier.description || 'No description'}
                      </p>
                      <p className="text-2xl font-bold text-yellow-600">
                        ${parseFloat(tier.monthly_fee).toFixed(2)}/month
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditTier(tier)}
                      >
                        ✏️ Edit
                      </Button>
                      <Button
                        variant={tier.status === 'active' ? 'outline' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleStatus(tier)}
                      >
                        {tier.status === 'active' ? '🚫 Deactivate' : '✅ Activate'}
                      </Button>
                    </div>
                  </div>
                  
                  {Array.isArray(tier.benefits) && tier.benefits.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <p className="text-xs font-medium text-slate-500 mb-2">Benefits:</p>
                      <ul className="space-y-1">
                        {tier.benefits.map((benefit, idx) => (
                          <li key={idx} className="text-sm text-slate-700 flex items-start">
                            <span className="text-yellow-500 mr-2">✓</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Add/Edit Tier Modal */}
      <Modal
        isOpen={showAddEditModal}
        onClose={() => setShowAddEditModal(false)}
        title={editingTier ? '✏️ Edit Membership Tier' : '➕ Add New Membership Tier'}
        size="large"
      >
        <form onSubmit={handleSubmitTier} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tier Name (Internal) *
              </label>
              <input
                type="text"
                required
                value={tierForm.tier_name}
                onChange={(e) => setTierForm({ ...tierForm, tier_name: e.target.value })}
                placeholder="e.g., standard, premium"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                disabled={editingTier !== null}
              />
              <p className="text-xs text-slate-500 mt-1">
                Lowercase, no spaces (will be auto-formatted)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Display Name *
              </label>
              <input
                type="text"
                required
                value={tierForm.display_name}
                onChange={(e) => setTierForm({ ...tierForm, display_name: e.target.value })}
                placeholder="e.g., Standard Member"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Monthly Fee (USD) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={tierForm.monthly_fee}
                onChange={(e) => setTierForm({ ...tierForm, monthly_fee: e.target.value })}
                placeholder="25.00"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                value={tierForm.status}
                onChange={(e) => setTierForm({ ...tierForm, status: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              value={tierForm.description}
              onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
              placeholder="Brief description of this tier"
              rows="2"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Benefits
            </label>
            <div className="space-y-2">
              {tierForm.benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={benefit}
                    onChange={(e) => handleBenefitChange(index, e.target.value)}
                    placeholder="Enter a benefit"
                    className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  />
                  {tierForm.benefits.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleRemoveBenefit(index)}
                    >
                      ✕
                    </Button>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={handleAddBenefit}
                className="w-full"
              >
                ➕ Add Benefit
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowAddEditModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : editingTier ? '💾 Update Tier' : '➕ Create Tier'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default ManageTiersModal;

