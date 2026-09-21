'use client';

import { useState, useEffect } from 'react';
import { addMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import Link from 'next/link';
import { DOMAIN_CATEGORIES } from '@/lib/constants';
import { formatStatus, parseLocalDate, formatLocalDate } from '@/lib/formatters';

interface Step {
  id: string;
  stepName: string;
  status: string;
  reasonForDelay?: string | null;
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

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'next_3_months',
    domain: '',
    owner: '',
    status: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500';
      case 'IN_PROGRESS':
        return 'bg-blue-500';
      case 'BLOCKED':
        return 'bg-red-500';
      case 'NA':
        return 'bg-gray-400';
      case 'NOT_STARTED':
        return 'bg-white border-2 border-slate-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getDateRangeFilter = () => {
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const currentMonthEnd = endOfMonth(today);

    switch (filters.dateRange) {
      case 'past_1_month':
        return { start: startOfMonth(addMonths(today, -1)), end: currentMonthEnd };
      case 'past_3_months':
        return { start: startOfMonth(addMonths(today, -3)), end: currentMonthEnd };
      case 'past_6_months':
        return { start: startOfMonth(addMonths(today, -6)), end: currentMonthEnd };
      case 'next_1_month':
        return { start: currentMonthStart, end: endOfMonth(addMonths(today, 1)) };
      case 'next_3_months':
        return { start: currentMonthStart, end: endOfMonth(addMonths(today, 2)) };
      case 'next_6_months':
        return { start: currentMonthStart, end: endOfMonth(addMonths(today, 5)) };
      case 'all':
      default:
        return null;
    }
  };

  const filteredProjects = projects.filter((project) => {
    // Date range filter
    if (filters.dateRange !== 'all' && project.currentTargetProdDate) {
      const dateRange = getDateRangeFilter();
      if (dateRange) {
        const targetDate = parseLocalDate(project.currentTargetProdDate);
        if (!isWithinInterval(targetDate, { start: dateRange.start, end: dateRange.end })) {
          return false;
        }
      }
    }

    // Domain filter
    if (filters.domain && project.domainCategory !== filters.domain) {
      return false;
    }

    // Owner filter
    if (filters.owner && project.owner !== filters.owner) {
      return false;
    }

    // Status filter
    if (filters.status && project.status !== filters.status) {
      return false;
    }

    return true;
  });

  const groupedProjects = filteredProjects.reduce((acc, project) => {
    if (!acc[project.domainCategory]) {
      acc[project.domainCategory] = [];
    }
    acc[project.domainCategory].push(project);
    return acc;
  }, {} as Record<string, Project[]>);

  const totalProjects = filteredProjects.length;
  const onTrackProjects = filteredProjects.filter((p) => p.totalDateShifts === 0).length;
  const delayedProjects = filteredProjects.filter((p) => p.totalDateShifts > 0).length;
  const blockedProjects = filteredProjects.filter((p) => p.status === 'BLOCKED').length;

  const owners = [...new Set(projects.map((p) => p.owner))];
  const statuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'];

  // Use standardized step order from constants (Launch = Launch Dashboard)
  // ALWAYS show all 7 standard columns
  const DASHBOARD_STEP_ORDER = [
    'Business Requirements',
    'Wireframe',
    'Data Integration',
    'Data Source',
    'Dashboard',
    'Feedback',
    'Launch',
  ];

  // Always use all 7 standard steps for the matrix
  const allStepNames = DASHBOARD_STEP_ORDER;

  const getStepStatus = (project: Project, stepName: string): string => {
    // Handle "Launch" by looking for either Launch Dashboard or Launch Data Source
    if (stepName === 'Launch') {
      const launchStep = project.steps.find(
        (s) => s.stepName === 'Launch Dashboard' || s.stepName === 'Launch Data Source'
      );
      // If step exists, return its status; otherwise return 'NA'
      return launchStep ? launchStep.status : 'NA';
    }

    const step = project.steps.find((s) => s.stepName === stepName);
    // If step exists, return its status; otherwise return 'NA'
    return step ? step.status : 'NA';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CTG D&A Project Status</h1>
            <p className="mt-2 text-sm text-gray-600">
              Executive dashboard for project progress tracking
            </p>
          </div>
          <Link
            href="/projects"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Manage Projects
          </Link>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Total Active Projects</div>
            <div className="text-3xl font-bold text-gray-900">{totalProjects}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">On-Track vs Delayed</div>
            <div className="text-3xl font-bold text-gray-900">
              <span className="text-green-600">{onTrackProjects}</span>
              <span className="text-gray-400 text-xl mx-2">/</span>
              <span className="text-red-600">{delayedProjects}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-600 mb-1">Blocked Projects</div>
            <div className="text-3xl font-bold text-red-600">{blockedProjects}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Go-Live Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <optgroup label="Past">
                  <option value="past_1_month">Past 1 Month</option>
                  <option value="past_3_months">Past 3 Months</option>
                  <option value="past_6_months">Past 6 Months</option>
                </optgroup>
                <optgroup label="Future">
                  <option value="next_1_month">Next 1 Month</option>
                  <option value="next_3_months">Next 3 Months (Default)</option>
                  <option value="next_6_months">Next 6 Months</option>
                </optgroup>
                <option value="all">All Dates</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <select
                value={filters.domain}
                onChange={(e) => setFilters({ ...filters, domain: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="">All Domains</option>
                {DOMAIN_CATEGORIES.map((domain) => (
                  <option key={domain} value={domain}>
                    {domain}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Owner
              </label>
              <select
                value={filters.owner}
                onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="">All Owners</option>
                {owners.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="">All Statuses</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(filters.domain || filters.owner || filters.status || filters.dateRange !== 'next_3_months') && (
            <div className="mt-3">
              <button
                onClick={() =>
                  setFilters({ dateRange: 'next_3_months', domain: '', owner: '', status: '' })
                }
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Matrix View */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32 sticky left-0 bg-gray-50">
                    Domain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-64">
                    Project Name
                  </th>
                  {allStepNames.length > 0 ? (
                    allStepNames.map((stepName) => (
                      <th
                        key={stepName}
                        className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                      >
                        {stepName}
                      </th>
                    ))
                  ) : (
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Steps
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-48">
                    Go-Live Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-64">
                    Comments / Issues / Blockers
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.keys(groupedProjects).length === 0 ? (
                  <tr>
                    <td
                      colSpan={allStepNames.length + 4}
                      className="px-4 py-8 text-center text-gray-500"
                    >
                      No projects found matching the current filters.
                    </td>
                  </tr>
                ) : (
                  Object.entries(groupedProjects).map(([domain, domainProjects]) => (
                    <>
                      {domainProjects.map((project, index) => (
                        <tr key={project.id} className="hover:bg-gray-50">
                          {index === 0 && (
                            <td
                              rowSpan={domainProjects.length}
                              className="px-4 py-3 text-sm font-semibold text-gray-900 bg-gray-50 border-r border-gray-200 align-top sticky left-0"
                            >
                              {domain}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium text-gray-900">
                              {project.jiraTicketUrl ? (
                                <a
                                  href={project.jiraTicketUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  {project.name}
                                </a>
                              ) : (
                                project.name
                              )}
                            </div>
                            <div className="text-xs text-gray-500">{project.owner}</div>
                          </td>
                          {allStepNames.length > 0 ? (
                            allStepNames.map((stepName) => {
                              const status = getStepStatus(project, stepName);
                              return (
                                <td key={stepName} className="px-3 py-3 text-center">
                                  <div
                                    className={`w-4 h-4 rounded-full mx-auto ${getStatusColor(
                                      status
                                    )}`}
                                    title={`${stepName}: ${status}`}
                                  />
                                </td>
                              );
                            })
                          ) : (
                            <td className="px-3 py-3 text-center text-gray-400">-</td>
                          )}
                          <td className="px-4 py-3">
                            {project.currentTargetProdDate ? (
                              <div>
                                <div className="text-sm text-gray-900">
                                  {formatLocalDate(project.currentTargetProdDate)}
                                </div>
                                {project.baselineProdDate &&
                                  project.currentTargetProdDate !== project.baselineProdDate && (
                                    <div className="text-xs font-semibold mt-1">
                                      {parseLocalDate(project.currentTargetProdDate) <
                                      parseLocalDate(project.baselineProdDate) ? (
                                        <span className="text-emerald-600">
                                          {Math.ceil(
                                            (parseLocalDate(project.baselineProdDate).getTime() -
                                              parseLocalDate(project.currentTargetProdDate).getTime()) /
                                              (1000 * 60 * 60 * 24)
                                          )}{' '}
                                          days early
                                        </span>
                                      ) : (
                                        <span className="text-red-600">
                                          +
                                          {Math.ceil(
                                            (parseLocalDate(project.currentTargetProdDate).getTime() -
                                              parseLocalDate(project.baselineProdDate).getTime()) /
                                              (1000 * 60 * 60 * 24)
                                          )}{' '}
                                          days delayed
                                        </span>
                                      )}
                                    </div>
                                  )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">TBD</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm text-gray-600">
                              {(() => {
                                // Get steps with override reasons
                                const stepsWithReasons = project.steps.filter(
                                  (step) => step.reasonForDelay
                                );

                                if (stepsWithReasons.length === 0) {
                                  // Show standard blocker notes if blocked
                                  if (project.status === 'BLOCKED') {
                                    return 'Project is blocked';
                                  }
                                  return '-';
                                }

                                if (stepsWithReasons.length === 1) {
                                  // Single override
                                  const step = stepsWithReasons[0];
                                  return `${step.stepName}: ${step.reasonForDelay}`;
                                }

                                // Multiple overrides - show as list
                                return (
                                  <ul className="list-disc list-inside space-y-1">
                                    {stepsWithReasons.map((step) => (
                                      <li key={step.id}>
                                        <span className="font-medium">{step.stepName}:</span>{' '}
                                        {step.reasonForDelay}
                                      </li>
                                    ))}
                                  </ul>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Step Status Legend</h3>
          <div className="flex gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-emerald-500"></div>
              <span className="text-sm text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-600">In Progress</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span className="text-sm text-gray-600">Blocked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-400"></div>
              <span className="text-sm text-gray-600">N/A</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-white border-2 border-slate-400"></div>
              <span className="text-sm text-gray-600">Not Started</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
