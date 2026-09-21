'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { differenceInDays } from 'date-fns';
import { STEP_NAMES, isReleaseStep } from '@/lib/constants';
import { formatStatus, parseLocalDate, formatLocalDate, formatDateForInput } from '@/lib/formatters';

interface DateChangeLog {
  id: string;
  previousEndDate: string;
  newEndDate: string;
  daysShifted: number;
  reasonForChange: string;
  timestamp: string;
}

interface Step {
  id: string;
  stepName: string;
  sequenceOrder: number;
  workdaysRequired: number;
  startDate: string;
  endDate: string;
  baselineEndDate: string | null;
  status: string;
  shiftCount: number;
  reasonForDelay: string | null;
  dateChangeLogs?: DateChangeLog[];
}

interface Project {
  id: string;
  name: string;
  jiraTicketUrl: string | null;
  domainCategory: string;
  owner: string;
  status: string;
  baselineProdDate: string | null;
  currentTargetProdDate: string | null;
  totalDateShifts: number;
  steps: Step[];
}

const STEP_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStep, setShowAddStep] = useState(false);
  const [editingStep, setEditingStep] = useState<Step | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newStep, setNewStep] = useState({
    stepName: 'Business Requirements',
    targetDate: '',
  });
  const [editStepForm, setEditStepForm] = useState({
    status: 'IN_PROGRESS',
    targetDate: '',
    reasonForChange: '',
  });

  useEffect(() => {
    fetchProject();
  }, [id]);

  // Sync newStep.stepName with first available step when project changes
  useEffect(() => {
    if (project) {
      const addedStepNames = new Set(project.steps.map((step) => step.stepName));

      // Filter out launch steps mutually exclusively
      const hasLaunchDashboard = addedStepNames.has('Launch Dashboard');
      const hasLaunchDataSource = addedStepNames.has('Launch Data Source');

      const availableSteps = STEP_NAMES.filter((name) => {
        // If step already added, exclude it
        if (addedStepNames.has(name)) return false;

        // Mutually exclusive launch steps
        if (name === 'Launch Dashboard' && hasLaunchDataSource) return false;
        if (name === 'Launch Data Source' && hasLaunchDashboard) return false;

        return true;
      });

      // If current stepName is not in available steps, reset to first available
      if (availableSteps.length > 0 && !availableSteps.includes(newStep.stepName as any)) {
        setNewStep({
          stepName: availableSteps[0],
          targetDate: '',
        });
      }
    }
  }, [project]);

  // Reset form when Add Step is opened/closed or when available steps change
  useEffect(() => {
    if (showAddStep && project) {
      const addedStepNames = new Set(project.steps.map((step) => step.stepName));

      // Filter out launch steps mutually exclusively
      const hasLaunchDashboard = addedStepNames.has('Launch Dashboard');
      const hasLaunchDataSource = addedStepNames.has('Launch Data Source');

      const availableSteps = STEP_NAMES.filter((name) => {
        // If step already added, exclude it
        if (addedStepNames.has(name)) return false;

        // Mutually exclusive launch steps
        if (name === 'Launch Dashboard' && hasLaunchDataSource) return false;
        if (name === 'Launch Data Source' && hasLaunchDashboard) return false;

        return true;
      });

      if (availableSteps.length > 0) {
        setNewStep({
          stepName: availableSteps[0],
          targetDate: '',
        });
      }
    }
  }, [showAddStep, project]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`);
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();

    // Get current available steps
    const addedStepNames = new Set(project?.steps.map((step) => step.stepName) || []);

    // Filter out launch steps mutually exclusively
    const hasLaunchDashboard = addedStepNames.has('Launch Dashboard');
    const hasLaunchDataSource = addedStepNames.has('Launch Data Source');

    const currentAvailableSteps = STEP_NAMES.filter((name) => {
      // If step already added, exclude it
      if (addedStepNames.has(name)) return false;

      // Mutually exclusive launch steps
      if (name === 'Launch Dashboard' && hasLaunchDataSource) return false;
      if (name === 'Launch Data Source' && hasLaunchDashboard) return false;

      return true;
    });

    // Validate step name is still available
    if (!currentAvailableSteps.includes(newStep.stepName as any)) {
      alert('Selected step is no longer available. Please select another step.');
      return;
    }

    try {
      const response = await fetch('/api/steps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: id,
          stepName: newStep.stepName,
          startDate: newStep.targetDate,
          endDate: newStep.targetDate,
        }),
      });

      if (response.ok) {
        // Reset form and close
        setShowAddStep(false);
        await fetchProject(); // Wait for project to reload

        // Form will be reset by useEffect when project updates
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add step');
      }
    } catch (error) {
      console.error('Error adding step:', error);
      alert('Failed to add step');
    }
  };

  const handleEditStep = (step: Step) => {
    setEditingStep(step);
    setEditStepForm({
      status: step.status,
      targetDate: formatDateForInput(step.endDate),
      reasonForChange: '',
    });
    setShowEditModal(true);
  };

  const handleUpdateStep = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingStep) return;

    // Check if target date changed from baseline
    const baselineEndDate = editingStep.baselineEndDate
      ? formatDateForInput(editingStep.baselineEndDate)
      : formatDateForInput(editingStep.endDate);
    const targetDateChanged = editStepForm.targetDate !== baselineEndDate;

    // Validation: Future step completion
    if (editStepForm.status === 'COMPLETED') {
      const targetDate = parseLocalDate(editStepForm.targetDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      targetDate.setHours(0, 0, 0, 0);

      if (targetDate > today) {
        alert('Step target date must be on or before today to mark as Completed.');
        return;
      }
    }

    // Validation: Reason required ONLY when target date differs from baseline
    if (targetDateChanged && !editStepForm.reasonForChange) {
      alert('Reason for change is required when modifying the target date.');
      return;
    }

    try {
      const response = await fetch(`/api/steps/${editingStep.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: editStepForm.status,
          endDate: targetDateChanged ? editStepForm.targetDate : undefined,
          reasonForChange: targetDateChanged ? editStepForm.reasonForChange : undefined,
        }),
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingStep(null);
        fetchProject();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update step');
      }
    } catch (error) {
      console.error('Error updating step:', error);
      alert('Failed to update step');
    }
  };

  const handleDeleteStep = async (stepId: string, stepName: string) => {
    if (!confirm(`Are you sure you want to delete "${stepName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/steps/${stepId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProject();
      }
    } catch (error) {
      console.error('Error deleting step:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'BLOCKED':
        return 'bg-red-100 text-red-800';
      case 'NOT_STARTED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateDateShift = (baseline: string | null, current: string | null): number => {
    if (!baseline || !current) return 0;
    return differenceInDays(parseLocalDate(current), parseLocalDate(baseline));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-red-600">Project not found</div>
      </div>
    );
  }

  const goLiveDateShift = calculateDateShift(
    project.baselineProdDate,
    project.currentTargetProdDate
  );

  // Get list of already-added step names to filter dropdown
  const addedStepNames = new Set(project.steps.map((step) => step.stepName));

  // Filter out launch steps mutually exclusively
  const hasLaunchDashboard = addedStepNames.has('Launch Dashboard');
  const hasLaunchDataSource = addedStepNames.has('Launch Data Source');

  const availableSteps = STEP_NAMES.filter((name) => {
    // If step already added, exclude it
    if (addedStepNames.has(name)) return false;

    // Mutually exclusive launch steps
    if (name === 'Launch Dashboard' && hasLaunchDataSource) return false;
    if (name === 'Launch Data Source' && hasLaunchDashboard) return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link href="/projects" className="text-blue-600 hover:text-blue-800">
            ← Back to Project Manager
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{project.name}</h1>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600">Domain</div>
              <div className="text-lg text-gray-900">{project.domainCategory}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Owner</div>
              <div className="text-lg text-gray-900">{project.owner}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-2">Go-Live Date</div>
              {project.currentTargetProdDate ? (
                <div>
                  <div className="text-lg font-semibold text-gray-900">
                    {formatLocalDate(project.currentTargetProdDate)}
                  </div>
                  {goLiveDateShift !== 0 && project.baselineProdDate && (
                    <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Original: </span>
                        {formatLocalDate(project.baselineProdDate)}
                      </div>
                      <div className="text-sm mt-1">
                        {goLiveDateShift > 0 ? (
                          <span className="text-red-600 font-semibold">
                            ⚠️ Delayed by {goLiveDateShift} days
                          </span>
                        ) : (
                          <span className="text-green-600 font-semibold">
                            ✓ Pulled forward by {Math.abs(goLiveDateShift)} days
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-lg text-gray-400">TBD</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Project Steps</h2>
            <button
              onClick={() => setShowAddStep(!showAddStep)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add Step
            </button>
          </div>

          {showAddStep && (
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <h3 className="text-lg font-semibold mb-3">Add New Step</h3>
              <form onSubmit={handleAddStep} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Step Name *
                  </label>
                  <select
                    value={availableSteps.length > 0 ? newStep.stepName : ''}
                    onChange={(e) => setNewStep({ ...newStep, stepName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    disabled={availableSteps.length === 0}
                  >
                    {availableSteps.length === 0 ? (
                      <option value="">All steps have been added</option>
                    ) : (
                      availableSteps.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))
                    )}
                  </select>
                  {availableSteps.length === 0 && (
                    <p className="text-xs text-red-600 mt-1">
                      All available steps have been added to this project
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newStep.targetDate}
                    onChange={(e) => setNewStep({ ...newStep, targetDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add Step
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddStep(false)}
                    className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Step Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Target Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days Shifted
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {project.steps.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                      No steps added yet. Click "Add Step" to get started.
                    </td>
                  </tr>
                ) : (
                  project.steps.map((step, index) => {
                    const stepDateShift = calculateDateShift(
                      step.baselineEndDate,
                      step.endDate
                    );

                    return (
                      <tr key={step.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{step.stepName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                              step.status
                            )}`}
                          >
                            {formatStatus(step.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatLocalDate(step.endDate)}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {stepDateShift !== 0 ? (
                            <span
                              className={`font-semibold ${
                                stepDateShift > 0 ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {stepDateShift > 0 ? '+' : ''}
                              {stepDateShift}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <button
                            onClick={() => handleEditStep(step)}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteStep(step.id, step.stepName)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showEditModal && editingStep && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-xl font-semibold mb-4">Edit Step: {editingStep.stepName}</h3>

              <form onSubmit={handleUpdateStep} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <select
                    value={editStepForm.status}
                    onChange={(e) =>
                      setEditStepForm({ ...editStepForm, status: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  >
                    {STEP_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {formatStatus(status)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date
                  </label>
                  <input
                    type="date"
                    value={editStepForm.targetDate}
                    onChange={(e) =>
                      setEditStepForm({ ...editStepForm, targetDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Change
                    {editingStep &&
                      (editingStep.baselineEndDate
                        ? formatDateForInput(editingStep.baselineEndDate)
                        : formatDateForInput(editingStep.endDate)) !==
                        editStepForm.targetDate && ' *'}
                  </label>
                  <textarea
                    value={editStepForm.reasonForChange}
                    onChange={(e) =>
                      setEditStepForm({ ...editStepForm, reasonForChange: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                    rows={3}
                    placeholder="Required when target date differs from baseline"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingStep(null);
                    }}
                    className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
