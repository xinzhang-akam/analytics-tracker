'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DOMAIN_CATEGORIES } from '@/lib/constants';
import { formatStatus, parseLocalDate, formatLocalDate } from '@/lib/formatters';

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
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [domainFilter, setDomainFilter] = useState<string>('All Domains');
  const [newProject, setNewProject] = useState({
    name: '',
    jiraTicketUrl: '',
    domainCategory: 'Product',
    owner: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      // Sort by Go-Live Date (currentTargetProdDate) descending - latest first
      const sortedData = data.sort((a: Project, b: Project) => {
        if (!a.currentTargetProdDate && !b.currentTargetProdDate) return 0;
        if (!a.currentTargetProdDate) return 1; // Projects without dates go to bottom
        if (!b.currentTargetProdDate) return -1;
        return parseLocalDate(b.currentTargetProdDate).getTime() - parseLocalDate(a.currentTargetProdDate).getTime();
      });
      setProjects(sortedData);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProject),
      });

      if (response.ok) {
        setNewProject({ name: '', jiraTicketUrl: '', domainCategory: 'Product', owner: '' });
        setShowNewProjectForm(false);
        fetchProjects();
      }
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all steps.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchProjects();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
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
    const baselineDate = parseLocalDate(baseline);
    const currentDate = parseLocalDate(current);
    const diffTime = currentDate.getTime() - baselineDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter projects by domain
  const filteredProjects = domainFilter === 'All Domains'
    ? projects
    : projects.filter(project => project.domainCategory === domainFilter);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">CTG D&A Project Manager</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage analytics projects and track timelines
            </p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50"
            >
              View Dashboard
            </Link>
            <button
              onClick={() => setShowNewProjectForm(!showNewProjectForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Create Project
            </button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Filter by Domain:</label>
            <select
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
            >
              <option value="All Domains">All Domains</option>
              {DOMAIN_CATEGORIES.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>
          </div>
        </div>

        {showNewProjectForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-xl font-semibold mb-4">Create New Project</h2>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jira Ticket URL
                </label>
                <input
                  type="url"
                  value={newProject.jiraTicketUrl}
                  onChange={(e) =>
                    setNewProject({ ...newProject, jiraTicketUrl: e.target.value })
                  }
                  placeholder="https://track.akamai.com/jira/browse/CTGANLYSTS-3209"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain *
                </label>
                <select
                  required
                  value={newProject.domainCategory}
                  onChange={(e) =>
                    setNewProject({ ...newProject, domainCategory: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                >
                  {DOMAIN_CATEGORIES.map((domain) => (
                    <option key={domain} value={domain}>
                      {domain}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Owner *
                </label>
                <input
                  type="text"
                  required
                  value={newProject.owner}
                  onChange={(e) => setNewProject({ ...newProject, owner: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Project
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewProjectForm(false)}
                  className="px-4 py-2 bg-white text-gray-700 rounded-md border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Go-Live Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Shifted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    {domainFilter === 'All Domains'
                      ? 'No projects found. Create your first project to get started.'
                      : `No projects found in ${domainFilter} domain.`}
                  </td>
                </tr>
              ) : (
                filteredProjects.map((project) => {
                  const dateShift = calculateDateShift(
                    project.baselineProdDate,
                    project.currentTargetProdDate
                  );

                  return (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
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
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{project.domainCategory}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{project.owner}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            project.status
                          )}`}
                        >
                          {formatStatus(project.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.currentTargetProdDate
                          ? formatLocalDate(project.currentTargetProdDate)
                          : 'TBD'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {dateShift !== 0 ? (
                          <span
                            className={`font-semibold ${
                              dateShift > 0 ? 'text-red-600' : 'text-green-600'
                            }`}
                          >
                            {dateShift > 0 ? '+' : ''}
                            {dateShift} days
                          </span>
                        ) : (
                          <span className="text-gray-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteProject(project.id, project.name)}
                          className="text-red-600 hover:text-red-900"
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
    </div>
  );
}
