import React, { useState, useEffect } from 'react';
import { useNotification } from '../hooks/useNotification';
import { NotificationContainer } from './NotificationContainer';
import { User } from '../types';

interface StaffSalesProps {
  currentUser: User;
}

export const StaffSales: React.FC<StaffSalesProps> = ({ currentUser }) => {
  const userOutletId = currentUser.outletId || '';
  const [staff, setStaff] = useState<any[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffAttendance, setStaffAttendance] = useState<{ [staffId: string]: string }>({});
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    salary: '',
    target: '',
    joiningDate: new Date().toISOString().split('T')[0],
    exitDate: '',
    status: 'Active'
  });

  const { notifications, addNotification, removeNotification } = useNotification();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const staffUrl = userOutletId ? `/api/staff?outletId=${userOutletId}` : '/api/staff';
      const salesUrl = userOutletId ? `/api/staff?action=sales&outletId=${userOutletId}` : '/api/staff?action=sales';
      
      const [staffRes, salesRes] = await Promise.all([
        fetch(staffUrl),
        fetch(salesUrl)
      ]);

      if (staffRes.ok) {
        const staffData = await staffRes.json();
        setStaff(staffData.map((s: any) => ({
          ...s,
          status: s.active ? 'Active' : 'Inactive'
        })));
      }

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setStaffPerformance(salesData.map((s: any) => ({
          staffId: s.id,
          staffName: s.name,
          totalSales: s.totalSales,
          commission: s.commission, // From API calculation
          target: s.target,
          achievedPercentage: s.achievedPercentage,
          reachedTarget: s.reachedTarget
        })));
      }
    } catch (error) {
      console.error('Failed to load staff data:', error);
      addNotification('Failed to load staff data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    if (submitting) {
      console.log('Form already submitting, ignoring duplicate request');
      return;
    }

    if (!formData.name.trim() || !formData.salary) {
      addNotification('Please fill all required fields', 'warning');
      return;
    }

    if (formData.status === 'Inactive' && !formData.exitDate) {
      addNotification('Please enter exit date for inactive staff', 'warning');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        action: editingStaff ? 'update' : 'create',
        id: editingStaff?.id || null,
        name: formData.name.trim(),
        phone: formData.phone || null,
        salary: parseFloat(formData.salary),
        joiningDate: formData.joiningDate,
        active: formData.status === 'Active',
        exitDate: formData.status === 'Inactive' ? formData.exitDate : null
      };

      console.log('Submitting staff form:', payload);

      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      console.log('API response status:', response.status);
      console.log('API response text:', responseText);

      if (response.ok) {
        addNotification(editingStaff ? 'Staff updated successfully' : 'Staff added successfully', 'success');
        setShowAddModal(false);
        setEditingStaff(null);
        setFormData({
          name: '',
          phone: '',
          salary: '',
          target: '',
          joiningDate: new Date().toISOString().split('T')[0],
          exitDate: '',
          status: 'Active'
        });
        loadData();
      } else {
        try {
          const errorData = JSON.parse(responseText);
          console.error('API error:', errorData);
          addNotification(errorData.error || 'Failed to save staff', 'error');
        } catch {
          addNotification(`Error: ${responseText}`, 'error');
        }
      }
    } catch (error) {
      console.error('Error saving staff:', error);
      addNotification('Error saving staff', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!window.confirm('Are you sure you want to delete this staff member?')) return;

    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: staffId
        })
      });

      if (response.ok) {
        addNotification('Staff deleted successfully', 'success');
        loadData();
      } else {
        const errorData = await response.json();
        addNotification(errorData.error || 'Failed to delete staff', 'error');
      }
    } catch (error) {
      console.error('Error deleting staff:', error);
      addNotification('Error deleting staff', 'error');
    }
  };

  const handleEditStaff = (staffMember: any) => {
    setEditingStaff(staffMember);
    setFormData({
      name: staffMember.name,
      phone: staffMember.phone || '',
      salary: staffMember.salary,
      target: staffMember.target,
      joiningDate: staffMember.joiningDate,
      exitDate: '',
      status: staffMember.status || 'Active'
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingStaff(null);
    setFormData({
      name: '',
      phone: '',
      salary: '',
      target: '',
      joiningDate: new Date().toISOString().split('T')[0],
      exitDate: '',
      status: 'Active'
    });
  };

  const handleAttendanceSubmit = async () => {
    if (!attendanceDate) {
      addNotification('Please select a date', 'warning');
      return;
    }

    // Check if at least one staff has attendance recorded
    const hasAttendance = Object.values(staffAttendance).some(status => status);
    if (!hasAttendance) {
      addNotification('Please mark attendance for at least one staff member', 'warning');
      return;
    }

    setSubmittingAttendance(true);

    try {
      const attendanceRecords = Object.entries(staffAttendance)
        .filter(([_, status]) => status)
        .map(([staffId, status]) => ({
          staffId,
          date: attendanceDate,
          status
        }));

      const response = await fetch('/api/staff-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record',
          records: attendanceRecords
        })
      });

      if (response.ok) {
        addNotification('Attendance recorded successfully', 'success');
        setShowAttendanceModal(false);
        setStaffAttendance({});
        setAttendanceDate(new Date().toISOString().split('T')[0]);
      } else {
        const errorData = await response.json();
        addNotification(errorData.error || 'Failed to record attendance', 'error');
      }
    } catch (error) {
      console.error('Error recording attendance:', error);
      addNotification('Error recording attendance', 'error');
    } finally {
      setSubmittingAttendance(false);
    }
  };

  return (
    <div className="space-y-6">
      <NotificationContainer notifications={notifications} onClose={removeNotification} />

      {/* Header */}
      <h1 className="text-4xl font-bold text-brand-text-primary">Staff Sales Performance</h1>

      {/* Staff Management Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Staff Management</h2>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (staff.filter(s => s.status === 'Active').length === 0) {
                  addNotification('No active staff members to record attendance for', 'warning');
                  return;
                }
                setStaffAttendance({});
                setAttendanceDate(new Date().toISOString().split('T')[0]);
                setShowAttendanceModal(true);
              }}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:shadow-lg transition-all hover:bg-blue-700"
            >
              📋 Staff Attendance
            </button>
            <button
              onClick={() => {
                setEditingStaff(null);
                setFormData({
                  name: '',
                  phone: '',
                  salary: '',
                  target: '',
                  joiningDate: new Date().toISOString().split('T')[0],
                  exitDate: '',
                  status: 'Active'
                });
                setShowAddModal(true);
              }}
              className="px-6 py-3 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold rounded-lg hover:shadow-lg transition-all"
            >
              + Add Staff
            </button>
          </div>
        </div>

        {staff.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Staff Name</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Phone</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Salary</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Target (5x)</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Joining Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Exit Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staff.map(staffMember => (
                  <tr key={staffMember.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">{staffMember.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{staffMember.phone || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">₹{parseFloat(staffMember.salary).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-green-600 font-semibold">₹{parseFloat(staffMember.target).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(staffMember.joiningDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{staffMember.exitDate ? new Date(staffMember.exitDate).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        staffMember.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {staffMember.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => handleEditStaff(staffMember)}
                          className="text-blue-600 hover:text-blue-800 font-semibold text-lg hover:bg-blue-50 p-2 rounded transition-colors"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staffMember.id)}
                          className="text-red-600 hover:text-red-800 font-semibold text-lg hover:bg-red-50 p-2 rounded transition-colors"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            {loading ? 'Loading staff data...' : 'No staff members added yet'}
          </div>
        )}
      </div>

      {/* Staff Performance Chart Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Staff Performance Overview</h2>
        {staffPerformance.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Staff Name</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Sales Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Target</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Commission</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Achievement</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Progress</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {staffPerformance.map(perf => {
                  const achievement = perf.achievedPercentage || ((parseFloat(perf.totalSales || 0) / parseFloat(perf.target || 1)) * 100);
                  const progressColor = achievement >= 100 ? 'bg-green-500' : achievement >= 75 ? 'bg-yellow-500' : 'bg-red-500';
                  const hasReachedTarget = perf.reachedTarget;
                  
                  return (
                    <tr key={perf.staffId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{perf.staffName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">₹{parseFloat(perf.totalSales || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">₹{parseFloat(perf.target || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">
                        {hasReachedTarget ? (
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-blue-600">₹{parseFloat(perf.commission || 0).toLocaleString()}</span>
                            <button
                              onClick={() => {
                                // Copy to clipboard
                                navigator.clipboard.writeText(`${perf.staffName}: ₹${parseFloat(perf.commission || 0).toLocaleString()}`);
                                addNotification(`Commission for ${perf.staffName} copied to clipboard`, 'success');
                              }}
                              className="px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors"
                              title="Calculate Commission"
                            >
                              Calculate
                            </button>
                          </div>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2 bg-gray-200 text-gray-500 text-xs font-semibold rounded cursor-not-allowed"
                            title="Commission available after target is reached"
                          >
                            Target Not Reached
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900">{achievement.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${progressColor}`}
                            style={{width: `${Math.min(achievement, 100)}%`}}
                          ></div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            {loading ? 'Loading performance data...' : 'No staff data available'}
          </div>
        )}
      </div>

      {/* Add/Edit Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-2xl shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">{editingStaff ? 'Edit Staff' : 'Add New Staff'}</h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Staff Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Staff Name"
                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone Number"
                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Salary *</label>
                  <input
                    type="number"
                    value={formData.salary}
                    onChange={(e) => {
                      const salary = e.target.value;
                      setFormData({ 
                        ...formData, 
                        salary,
                        target: salary ? (parseFloat(salary) * 5).toString() : ''
                      });
                    }}
                    placeholder="Salary"
                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Target (5x Salary)</label>
                  <input
                    type="number"
                    value={formData.target}
                    readOnly
                    placeholder="Auto-populated"
                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Joining Date *</label>
                  <input
                    type="date"
                    value={formData.joiningDate}
                    onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                    required
                  />
                </div>
                {formData.status === 'Inactive' && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Exit Date *</label>
                    <input
                      type="date"
                      value={formData.exitDate}
                      onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                      className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      required={formData.status === 'Inactive'}
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-brand-gradient-from to-brand-gradient-to text-white font-bold py-2 px-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : (editingStaff ? 'Update Staff' : 'Add Staff')}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 bg-gray-300 text-gray-900 font-bold py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Attendance Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-3xl shadow-2xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Record Staff Attendance</h3>
              <button
                onClick={() => {
                  setShowAttendanceModal(false);
                  setStaffAttendance({});
                }}
                className="text-gray-500 hover:text-gray-700 text-3xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Attendance Date *</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => setAttendanceDate(e.target.value)}
                  className="w-full bg-gray-100 text-gray-900 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Active Staff</h4>
                {staff.filter(s => s.status === 'Active').length > 0 ? (
                  <div className="space-y-3">
                    {staff
                      .filter(s => s.status === 'Active')
                      .map(staffMember => (
                        <div key={staffMember.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div>
                            <p className="font-semibold text-gray-900">{staffMember.name}</p>
                            <p className="text-sm text-gray-600">{staffMember.phone || 'No phone'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setStaffAttendance({ ...staffAttendance, [staffMember.id]: 'Present' })
                              }
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                staffAttendance[staffMember.id] === 'Present'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-900 hover:bg-green-100'
                              }`}
                            >
                              ✓ Present
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setStaffAttendance({ ...staffAttendance, [staffMember.id]: 'Week Off' })
                              }
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                staffAttendance[staffMember.id] === 'Week Off'
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-gray-200 text-gray-900 hover:bg-orange-100'
                              }`}
                            >
                              ⌛ Week Off
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setStaffAttendance({ ...staffAttendance, [staffMember.id]: 'Leave' })
                              }
                              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                                staffAttendance[staffMember.id] === 'Leave'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-200 text-gray-900 hover:bg-red-100'
                              }`}
                            >
                              🚫 Leave
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No active staff members</div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAttendanceSubmit}
                  disabled={submittingAttendance}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submittingAttendance ? 'Recording...' : 'Record Attendance'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAttendanceModal(false);
                    setStaffAttendance({});
                  }}
                  className="flex-1 bg-gray-300 text-gray-900 font-bold py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
      );
      };
