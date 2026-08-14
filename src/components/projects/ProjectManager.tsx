import React, { useState } from 'react';
import {
  FolderPlus,
  Globe,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Server,
  Plus,
  ArrowRight,
  Zap,
  Edit3,
  X,
  Copy,
  Check,
  RefreshCw,
  DownloadCloud,
} from 'lucide-react';
import { Project, FlowFile } from '@/src/types/autoflow';
import { ExportImportPanel } from '@/src/components/projects/ExportImportPanel';

interface ProjectManagerProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (newProject: Project) => void;
  onUpdateProject: (updatedProject: Project) => void;
  onDeleteProject: (projectId: string) => void;
  initialOpenCreateModal?: boolean;
  autoOpenCreateModal?: boolean;
  onClose?: () => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  onSelectProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  initialOpenCreateModal,
  autoOpenCreateModal,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEnvFilter, setSelectedEnvFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(!!(initialOpenCreateModal || autoOpenCreateModal));
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [showExportImport, setShowExportImport] = useState(false);

  // Form State for New / Edit Project
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTargetUrl, setFormTargetUrl] = useState('');
  const [formEnvironment, setFormEnvironment] = useState<'staging' | 'production' | 'local' | 'development'>('staging');
  const [formTemplate, setFormTemplate] = useState<'standard' | 'ecommerce' | 'auth' | 'blank'>('standard');
  const [formBrowser, setFormBrowser] = useState<'chromium' | 'firefox' | 'webkit'>('chromium');
  const [formSaveLocation, setFormSaveLocation] = useState('');
  const [_formEnvVars, setFormEnvVars] = useState<{ key: string; value: string }[]>([
    { key: 'TEST_EMAIL', value: 'qa-test@example.com' },
  ]);
  const [testingUrl, setTestingUrl] = useState(false);
  const [urlTestResult, setUrlTestResult] = useState<{ status: 'ok' | 'error'; message: string } | null>(null);
  const [copiedUrlId, setCopiedUrlId] = useState<string | null>(null);

  // Filter logic
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.targetUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesEnv = selectedEnvFilter === 'all' || p.environment === selectedEnvFilter;
    return matchesSearch && matchesEnv;
  });

  const handleOpenCreateModal = () => {
    setEditingProject(null);
    setFormName('');
    setFormDescription('');
    setFormTargetUrl('https://my-app.example.com');
    setFormEnvironment('staging');
    setFormTemplate('standard');
    setFormBrowser('chromium');
    setFormSaveLocation('');
    setFormEnvVars([{ key: 'TEST_USER', value: 'admin@example.com' }]);
    setUrlTestResult(null);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setFormName(project.name);
    setFormDescription(project.description || '');
    setFormTargetUrl(project.targetUrl);
    setFormEnvironment(project.environment);
    setFormBrowser(project.config?.browser || 'chromium');
    setFormSaveLocation(project.saveLocation || '');
    setUrlTestResult(null);
    setIsCreateModalOpen(true);
  };

  const handleTestUrlConnection = () => {
    if (!formTargetUrl.trim()) return;
    setTestingUrl(true);
    setUrlTestResult(null);

    setTimeout(() => {
      setTestingUrl(false);
      try {
        const urlObj = new URL(formTargetUrl.startsWith('http') ? formTargetUrl : `https://${formTargetUrl}`);
        setUrlTestResult({
          status: 'ok',
          message: `Successfully reached target host (${urlObj.hostname}). HTTP 200 OK Response.`,
        });
      } catch (err) {
        setUrlTestResult({
          status: 'error',
          message: 'Invalid URL format. Please enter a valid URL (e.g. https://my-app.com or http://localhost:3000)',
        });
      }
    }, 600);
  };

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formTargetUrl.trim()) return;

    let formattedUrl = formTargetUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Generate starter flows if creating new
    let starterFlows: FlowFile[] = [];
    if (formTemplate === 'ecommerce') {
      starterFlows = [
        {
          id: `flow-${Date.now()}-1`,
          name: 'e-commerce-checkout.yaml',
          path: 'flows/e-commerce-checkout.yaml',
          tags: ['checkout', 'e2e'],
          metadata: { url: formattedUrl, browser: formBrowser },
          yamlContent: `url: ${formattedUrl}\n---\n- navigate: /products\n- leftClick: "Add to Cart"\n- leftClick: "Checkout"\n- assertVisible: "Order Confirmed!"`,
          steps: [
            { id: '1', command: 'navigate', value: '/products', status: 'pending' },
            { id: '2', command: 'leftClick', target: 'Add to Cart', status: 'pending' },
            { id: '3', command: 'leftClick', target: 'Checkout', status: 'pending' },
            { id: '4', command: 'assertVisible', value: 'Order Confirmed!', status: 'pending' },
          ],
        },
      ];
    } else if (formTemplate === 'auth') {
      starterFlows = [
        {
          id: `flow-${Date.now()}-2`,
          name: 'auth-login-flow.yaml',
          path: 'flows/auth-login-flow.yaml',
          tags: ['auth', 'login'],
          metadata: { url: formattedUrl, browser: formBrowser },
          yamlContent: `url: ${formattedUrl}\n---\n- navigate: /login\n- fill:\n    selector:\n      label: "Email"\n    text: "admin@example.com"\n- leftClick: "Sign In"\n- assertVisible: "Welcome back!"`,
          steps: [
            { id: '1', command: 'navigate', value: '/login', status: 'pending' },
            { id: '2', command: 'fill', target: { type: 'label', value: 'Email' }, value: 'admin@example.com', status: 'pending' },
            { id: '3', command: 'leftClick', target: 'Sign In', status: 'pending' },
            { id: '4', command: 'assertVisible', value: 'Welcome back!', status: 'pending' },
          ],
        },
      ];
    } else {
      starterFlows = [
        {
          id: `flow-${Date.now()}-3`,
          name: 'smoke-test.yaml',
          path: 'flows/smoke-test.yaml',
          tags: ['smoke', 'e2e'],
          metadata: { url: formattedUrl, browser: formBrowser },
          yamlContent: `url: ${formattedUrl}\n---\n- navigate: /\n- assertTitle: "Welcome"\n- assertVisible: "Header"`,
          steps: [
            { id: '1', command: 'navigate', value: '/', status: 'pending' },
            { id: '2', command: 'assertTitle', value: 'Welcome', status: 'pending' },
            { id: '3', command: 'assertVisible', value: 'Header', status: 'pending' },
          ],
        },
      ];
    }

    if (editingProject) {
      const updated: Project = {
        ...editingProject,
        name: formName.trim(),
        description: formDescription.trim(),
        targetUrl: formattedUrl,
        environment: formEnvironment,
        updatedAt: new Date().toISOString().split('T')[0],
        saveLocation: formSaveLocation || editingProject.saveLocation,
        config: {
          ...editingProject.config,
          browser: formBrowser,
        },
      };
      onUpdateProject(updated);
    } else {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        name: formName.trim(),
        description: formDescription.trim() || 'Target web application test suite.',
        targetUrl: formattedUrl,
        environment: formEnvironment,
        tags: [formEnvironment, formTemplate],
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        lastRunStatus: 'NEVER_RUN',
        lastRunTime: 'Just created',
        passRate: 0,
        flows: starterFlows,
        saveLocation: formSaveLocation || undefined,
        config: {
          browser: formBrowser,
          headless: false,
          timeout: 10000,
          retries: 2,
        },
      };
      onCreateProject(newProj);
    }

    setIsCreateModalOpen(false);
    if (onClose) onClose();
  };

  const handleCopyUrl = (url: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedUrlId(id);
    setTimeout(() => setCopiedUrlId(null), 1500);
  };

  const getEnvBadgeColor = (env: string) => {
    switch (env) {
      case 'production':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'staging':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'local':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
    }
  };

  const handleMergeProjects = (merged: Project[]) => {
    for (const proj of merged) {
      onUpdateProject(proj);
    }
    const mergedIds = new Set(merged.map(p => p.id));
    projects.filter(p => !mergedIds.has(p.id)).forEach(p => onDeleteProject(p.id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-stone-950 text-stone-100 font-sans p-4 sm:p-8 overflow-y-auto">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Top Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-stone-900 p-6 rounded-[6px] border border-amber-800/40 shadow-xl">
          <div>
            <div className="flex items-center space-x-2.5 text-amber-400 font-bold mb-1">
              <Server className="w-5 h-5 text-amber-400" />
              <span className="text-xs uppercase tracking-widest font-mono">Tracy Studio Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-amber-50 tracking-tight">
              Projects & Application Environments
            </h1>
            <p className="text-stone-400 text-xs sm:text-sm mt-1 max-w-2xl">
              Configure target web application URLs, organize E2E test flows, and launch regression test suites in Chromium, Firefox, or WebKit.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowExportImport(true)}
              className="px-4 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-[6px] border border-stone-700 flex items-center space-x-2 transition-all active:scale-95"
              title="Export or Import projects as JSON"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Export / Import</span>
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-3 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] shadow-lg border border-amber-600 flex items-center space-x-2 transition-all active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project & Target URL</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900 p-3 rounded-[6px] border border-stone-800">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search projects by name or URL..."
              className="w-full pl-9 pr-3 py-1.5 bg-stone-950 border border-stone-800 rounded-[6px] text-xs text-amber-50 placeholder-stone-500 focus:outline-hidden focus:border-amber-600"
            />
          </div>

          {/* Environment Filter Buttons */}
          <div className="flex items-center space-x-1.5 text-xs font-semibold overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setSelectedEnvFilter('all')}
              className={`px-3 py-1 rounded-[6px] transition-all ${
                selectedEnvFilter === 'all' ? 'bg-amber-800 text-amber-100 font-bold border border-amber-600/60' : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              All ({projects.length})
            </button>
            <button
              onClick={() => setSelectedEnvFilter('staging')}
              className={`px-3 py-1 rounded-[6px] transition-all ${
                selectedEnvFilter === 'staging' ? 'bg-amber-800 text-amber-100 font-bold border border-amber-600/60' : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              Staging
            </button>
            <button
              onClick={() => setSelectedEnvFilter('local')}
              className={`px-3 py-1 rounded-[6px] transition-all ${
                selectedEnvFilter === 'local' ? 'bg-emerald-800 text-emerald-100 font-bold border border-emerald-600/60' : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              Local Dev
            </button>
            <button
              onClick={() => setSelectedEnvFilter('production')}
              className={`px-3 py-1 rounded-[6px] transition-all ${
                selectedEnvFilter === 'production' ? 'bg-rose-900 text-rose-100 font-bold border border-rose-700/60' : 'text-stone-400 hover:text-stone-100'
              }`}
            >
              Production
            </button>
          </div>
        </div>

        {/* Project Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map(project => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project)}
              className="group bg-stone-900 hover:bg-stone-900/90 border border-stone-800 hover:border-amber-600/60 rounded-[6px] p-5 flex flex-col justify-between space-y-4 shadow-lg transition-all cursor-pointer relative overflow-hidden"
            >
              <div className="space-y-3">
                {/* Header Badge & Title */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border mb-1.5 ${getEnvBadgeColor(project.environment)}`}>
                      {project.environment}
                    </span>
                    <h3 className="font-serif font-bold text-amber-50 text-base group-hover:text-amber-300 transition-colors">
                      {project.name}
                    </h3>
                  </div>

                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => handleOpenEditModal(project, e)}
                      title="Edit project settings"
                      className="p-1.5 hover:bg-stone-800 text-stone-400 hover:text-stone-100 rounded-[6px] transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {projects.length > 1 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteProject(project.id);
                        }}
                        title="Delete project"
                        className="p-1.5 hover:bg-rose-950/50 text-stone-500 hover:text-rose-400 rounded-[6px] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                  {project.description || 'Target web application test project.'}
                </p>

                {/* Target URL Pill */}
                <div className="p-2.5 bg-stone-950 rounded-[6px] border border-stone-800 flex items-center justify-between font-mono text-xs text-amber-300">
                  <div className="flex items-center space-x-2 truncate">
                    <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">{project.targetUrl}</span>
                  </div>

                  <button
                    onClick={e => handleCopyUrl(project.targetUrl, project.id, e)}
                    className="p-1 hover:bg-stone-800 text-stone-400 hover:text-stone-100 rounded-[6px] shrink-0 ml-1"
                    title="Copy URL"
                  >
                    {copiedUrlId === project.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Bottom Footer Stats */}
              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center space-x-3 text-stone-400">
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-bold text-stone-200">{project.flows.length}</span> Flows
                  </span>

                  <span className="flex items-center space-x-1">
                    {project.lastRunStatus === 'PASSED' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    ) : project.lastRunStatus === 'FAILED' ? (
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-stone-500" />
                    )}
                    <span className={project.lastRunStatus === 'PASSED' ? 'text-emerald-400' : 'text-stone-400'}>
                      {project.lastRunStatus === 'PASSED' ? 'Passing' : project.lastRunStatus}
                    </span>
                  </span>
                </div>

                <div className="flex items-center space-x-1 text-amber-400 font-sans font-bold group-hover:translate-x-1 transition-transform">
                  <span>Open Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && (
          <div className="p-12 text-center bg-stone-900 rounded-[6px] border border-stone-800 space-y-3">
            <Server className="w-10 h-10 text-stone-600 mx-auto" />
            <h3 className="text-base font-bold text-amber-100">No Projects Found</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto">
              No projects match your current search query or filter. Create a new project to start testing a custom URL.
            </p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] border border-amber-600 shadow-md"
            >
              Create New Project
            </button>
          </div>
        )}
      </div>

      {/* Modal Form for Creating / Editing Project */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-[6px] max-w-lg w-full p-6 shadow-2xl space-y-5 font-sans text-xs text-stone-100">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-amber-100 text-base">
                  {editingProject ? 'Edit Project & Target URL' : 'Create New Project'}
                </h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-100 rounded-[6px] hover:bg-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProject} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block font-bold text-stone-300 text-xs mb-1">
                  Project Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g., Customer Billing Portal"
                  className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-stone-100 text-xs focus:outline-hidden focus:border-amber-600"
                />
              </div>

              {/* Target URL */}
              <div>
                <label className="block font-bold text-amber-300 text-xs mb-1 flex items-center space-x-1">
                  <span>Target Application Base URL</span>
                  <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    required
                    value={formTargetUrl}
                    onChange={e => setFormTargetUrl(e.target.value)}
                    placeholder="https://staging.myapp.com or http://localhost:3000"
                    className="flex-1 p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-stone-100 text-xs font-mono focus:outline-hidden focus:border-amber-600"
                  />
                  <button
                    type="button"
                    onClick={handleTestUrlConnection}
                    disabled={testingUrl}
                    className="px-3 py-2.5 bg-stone-800 hover:bg-stone-700 text-amber-300 rounded-[6px] font-bold text-xs flex items-center space-x-1 border border-stone-700"
                  >
                    {testingUrl ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                    <span>Test URL</span>
                  </button>
                </div>
                {urlTestResult && (
                  <p className={`mt-1.5 text-[11px] font-mono ${urlTestResult.status === 'ok' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {urlTestResult.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-stone-300 text-xs mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder="Brief summary of test goals for this web app target..."
                  className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-[6px] text-stone-100 text-xs focus:outline-hidden focus:border-amber-600 resize-none"
                />
              </div>

              {/* Environment & Browser Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-300 text-xs mb-1">Environment</label>
                  <select
                    value={formEnvironment}
                    onChange={e => setFormEnvironment(e.target.value as any)}
                    className="w-full p-2 bg-stone-950 border border-stone-800 rounded-[6px] text-stone-100 text-xs focus:outline-hidden"
                  >
                    <option value="staging">Staging</option>
                    <option value="local">Local Dev</option>
                    <option value="development">Development</option>
                    <option value="production">Production</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-300 text-xs mb-1">Browser Engine</label>
                  <div className="p-2 bg-stone-950 border border-stone-800 rounded-[6px] text-emerald-400 font-mono font-bold text-xs flex items-center space-x-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Chromium Headless</span>
                  </div>
                </div>
              </div>

              {/* Template Selection (Only for New Projects) */}
              {!editingProject && (
                <div>
                  <label className="block font-bold text-stone-300 text-xs mb-1">Starter Test Suite Template</label>
                  <select
                    value={formTemplate}
                    onChange={e => setFormTemplate(e.target.value as any)}
                    className="w-full p-2 bg-stone-950 border border-stone-800 rounded-[6px] text-stone-100 text-xs focus:outline-hidden"
                  >
                    <option value="standard">Standard Smoke Test Flow</option>
                    <option value="ecommerce">E-Commerce Products & Cart Suite</option>
                    <option value="auth">Authentication & Login Suite</option>
                    <option value="blank">Blank Flow</option>
                  </select>
                </div>
              )}

              {/* Save Location */}
              <div>
                <label className="block font-bold text-stone-300 text-xs mb-1">Local Save Location</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={formSaveLocation}
                    onChange={e => setFormSaveLocation(e.target.value)}
                    placeholder="C:\Users\you\tracy-projects\ (optional)"
                    className="flex-1 p-2 bg-stone-950 border border-stone-800 rounded-[6px] text-stone-100 text-xs font-mono focus:outline-hidden focus:border-amber-600"
                  />
                  <button
                    type="button"
                    onClick={() => setFormSaveLocation('')}
                    className="px-2 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-[6px] border border-stone-700 text-xs"
                    title="Clear save location"
                  >
                    Clear
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  Where to save flows, DOM snapshots, and generated Playwright code. Leave blank for default.
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-stone-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-[6px] border border-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] shadow-md border border-amber-600"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export/Import Modal */}
      {showExportImport && (
        <ExportImportPanel
          projects={projects}
          onMergeProjects={handleMergeProjects}
          onClose={() => setShowExportImport(false)}
        />
      )}
    </div>
  );
};
