import React, { useState } from 'react';
import { VoiceInputButton } from '../ai/VoiceInputButton';
import {
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Globe,
  MousePointer,
  Type,
  Eye,
  EyeOff,
  CheckCircle,
  Network,
  List,
  Sliders,
  Sparkles,
  HelpCircle,
  Play,
  GripVertical,
  Edit3,
  Check,
  X
} from 'lucide-react';
import { FlowStep, CommandType } from '../../types/autoflow';

interface VisualStepEditorProps {
  steps: FlowStep[];
  onStepsChange: (updatedSteps: FlowStep[]) => void;
  onRunStep?: (stepIndex: number) => void;
  activeStepIndex?: number;
}

export const VisualStepEditor: React.FC<VisualStepEditorProps> = ({
  steps,
  onStepsChange,
  onRunStep,
  activeStepIndex,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCommand, setNewCommand] = useState<CommandType>('click');
  const [newTarget, setNewTarget] = useState('');
  const [newValue, setNewValue] = useState('');

  // Drag & Drop State
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Inline Self-Edit State
  const [editingStepIdx, setEditingStepIdx] = useState<number | null>(null);
  const [editCommand, setEditCommand] = useState<CommandType>('click');
  const [editTarget, setEditTarget] = useState('');
  const [editValue, setEditValue] = useState('');

  const getCommandIcon = (cmd: CommandType) => {
    switch (cmd) {
      case 'navigate':
        return <Globe className="w-3.5 h-3.5 text-sky-400" />;
      case 'click':
      case 'doubleClick':
      case 'rightClick':
        return <MousePointer className="w-3.5 h-3.5 text-amber-400" />;
      case 'inputText':
      case 'eraseText':
      case 'pressKey':
        return <Type className="w-3.5 h-3.5 text-emerald-400" />;
      case 'assertVisible':
      case 'assertTitle':
      case 'assertUrl':
        return <Eye className="w-3.5 h-3.5 text-amber-400" />;
      case 'assertNotVisible':
        return <EyeOff className="w-3.5 h-3.5 text-rose-400" />;
      case 'interceptNetwork':
      case 'waitForNetwork':
        return <Network className="w-3.5 h-3.5 text-purple-400" />;
      case 'selectOption':
        return <List className="w-3.5 h-3.5 text-teal-400" />;
      default:
        return <Sliders className="w-3.5 h-3.5 text-stone-400" />;
    }
  };

  // Move via Up/Down buttons
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSteps.length) return;

    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    onStepsChange(newSteps);
  };

  const handleDelete = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    onStepsChange(newSteps);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === dropIndex) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }

    const newSteps = [...steps];
    const [draggedStep] = newSteps.splice(draggedIdx, 1);
    newSteps.splice(dropIndex, 0, draggedStep);

    onStepsChange(newSteps);
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
  };

  // Inline item-self-edit handlers
  const handleStartEdit = (idx: number, step: FlowStep) => {
    setEditingStepIdx(idx);
    setEditCommand(step.command);
    setEditTarget(
      typeof step.target === 'object'
        ? JSON.stringify(step.target)
        : step.target || ''
    );
    setEditValue(step.value || '');
  };

  const handleSaveInlineEdit = (idx: number) => {
    let targetVal: any = editTarget;
    if (editTarget.startsWith('{') && editTarget.endsWith('}')) {
      try {
        targetVal = JSON.parse(editTarget);
      } catch (err) {
        // use string
      }
    }

    const newSteps = [...steps];
    newSteps[idx] = {
      ...newSteps[idx],
      command: editCommand,
      target: targetVal || undefined,
      value: editValue || undefined,
    };

    onStepsChange(newSteps);
    setEditingStepIdx(null);
  };

  const handleCancelInlineEdit = () => {
    setEditingStepIdx(null);
  };

  const handleAddStepSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let targetVal: any = newTarget;
    if (newTarget.startsWith('{') && newTarget.endsWith('}')) {
      try {
        targetVal = JSON.parse(newTarget);
      } catch (err) {
        // use string
      }
    }

    const newStepObj: FlowStep = {
      id: `step-${Date.now()}`,
      command: newCommand,
      target: targetVal || undefined,
      value: newValue || undefined,
      status: 'pending',
    };

    onStepsChange([...steps, newStepObj]);
    setShowAddModal(false);
    setNewTarget('');
    setNewValue('');
  };

  const handleVoiceDictateStep = (transcript: string) => {
    const text = transcript.trim();
    if (!text) return;
    let cmd: CommandType = 'click';
    let target = text;
    let val = '';

    if (/^(navigate|go to)\s+/i.test(text)) {
      cmd = 'navigate';
      target = text.replace(/^(navigate|go to)\s+/i, '');
    } else if (/^(type|fill|input)\s+/i.test(text)) {
      cmd = 'inputText';
      const parts = text.replace(/^(type|fill|input)\s+/i, '').split(/into|in/i);
      if (parts.length > 1) {
        val = parts[0].trim();
        target = parts[1].trim();
      } else {
        val = parts[0].trim();
        target = 'Input field';
      }
    } else if (/^(assert|check|verify|see)\s+/i.test(text)) {
      cmd = 'assertVisible';
      target = text.replace(/^(assert|check|verify|see)\s+/i, '');
    } else if (/^(click|press|tap)\s+/i.test(text)) {
      cmd = 'click';
      target = text.replace(/^(click|press|tap)\s+/i, '');
    }

    const voiceStep: FlowStep = {
      id: `step-voice-${Date.now()}`,
      command: cmd,
      target: target || undefined,
      value: val || undefined,
      status: 'pending',
    };
    onStepsChange([...steps, voiceStep]);
  };

  return (
    <div className="flex flex-col h-full bg-stone-950 text-stone-100 p-3 sm:p-4 overflow-y-auto space-y-3 font-sans text-xs">
      <div className="flex items-center justify-between bg-stone-900 p-3 rounded-[6px] border border-stone-800 shrink-0">
        <div className="flex items-center space-x-2">
          <Layers className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-amber-100 text-sm">Visual E2E Flow Blocks</span>
          <span className="bg-stone-950 text-stone-400 px-2 py-0.5 rounded-[6px] border border-stone-800 text-[10px] font-mono">
            {steps.length} Steps
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <VoiceInputButton
            onTranscript={handleVoiceDictateStep}
            size="sm"
            title="Speak a test action e.g. 'click Login button', 'navigate to /cart', or 'type john@example.com into Email'"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-amber-50 font-bold text-xs rounded-[6px] border border-amber-600 flex items-center space-x-1 shadow-xs transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Step</span>
          </button>
        </div>
      </div>

      {/* Step Cards List */}
      <div className="space-y-2 flex-1 min-w-0">
        {steps.map((step, idx) => {
          const isActive = activeStepIndex === idx;
          const isEditing = editingStepIdx === idx;

          return (
            <div
              key={step.id || idx}
              draggable={!isEditing}
              onDragStart={e => handleDragStart(e, idx)}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onDragEnd={handleDragEnd}
              className={`p-3 rounded-[6px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0 w-full overflow-hidden ${
                draggedIdx === idx
                  ? 'opacity-40 border-amber-500 border-dashed bg-amber-950/20'
                  : dragOverIdx === idx
                  ? 'border-amber-400 bg-amber-950/40 ring-1 ring-amber-400'
                  : isActive
                  ? 'bg-amber-950/60 border-amber-500 ring-1 ring-amber-500/50 shadow-md'
                  : step.status === 'passed'
                  ? 'bg-stone-900/80 border-stone-800/80'
                  : step.status === 'failed'
                  ? 'bg-rose-950/30 border-rose-800/80'
                  : 'bg-stone-900 border-stone-800 hover:border-stone-700'
              }`}
            >
              {isEditing ? (
                /* Inline Self-Edit Form */
                <div className="flex-1 space-y-2.5 w-full min-w-0">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
                    <span className="font-bold text-amber-300 text-xs flex items-center space-x-1">
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Step #{idx + 1}</span>
                    </span>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleSaveInlineEdit(idx)}
                        className="px-2.5 py-1 bg-amber-700 hover:bg-amber-600 text-amber-50 rounded-[4px] font-bold text-xs flex items-center space-x-1 border border-amber-600"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={handleCancelInlineEdit}
                        className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-[4px] text-xs border border-stone-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-400 mb-0.5">Command</label>
                      <select
                        value={editCommand}
                        onChange={e => setEditCommand(e.target.value as CommandType)}
                        className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[4px] p-1.5 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                      >
                        <option value="click">click</option>
                        <option value="inputText">inputText</option>
                        <option value="assertVisible">assertVisible</option>
                        <option value="assertNotVisible">assertNotVisible</option>
                        <option value="navigate">navigate</option>
                        <option value="selectOption">selectOption</option>
                        <option value="pressKey">pressKey</option>
                        <option value="interceptNetwork">interceptNetwork</option>
                        <option value="copyTextFrom">copyTextFrom</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-stone-400 mb-0.5">Target Selector / Text</label>
                      <input
                        type="text"
                        value={editTarget}
                        onChange={e => setEditTarget(e.target.value)}
                        placeholder='e.g., "Sign In" or {"testId": "cart"}'
                        className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[4px] p-1.5 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-400 mb-0.5">Value Parameter (Optional)</label>
                    <input
                      type="text"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder='e.g., user@example.com'
                      className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[4px] p-1.5 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                    />
                  </div>
                </div>
              ) : (
                /* Standard Card View Mode */
                <>
                  <div className="flex items-center space-x-2.5 min-w-0 flex-1 overflow-hidden">
                    <span title="Drag to reorder" className="shrink-0 flex items-center">
                      <GripVertical className="w-4 h-4 text-stone-600 hover:text-stone-300 cursor-grab active:cursor-grabbing" />
                    </span>

                    {/* Left Index & Icon */}
                    <span className="font-mono text-[10px] text-stone-500 w-4 font-bold shrink-0">{idx + 1}.</span>
                    <div className="p-1.5 bg-stone-950 rounded-[6px] border border-stone-800 flex items-center justify-center shrink-0">
                      {getCommandIcon(step.command)}
                    </div>

                    {/* Command & Target Details - Protected against Overflow */}
                    <div className="min-w-0 flex-1 overflow-hidden pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold font-mono text-amber-300 text-xs truncate">{step.command}</span>
                        {step.status === 'passed' && (
                          <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded-xs border border-emerald-500/20 font-semibold shrink-0">
                            PASSED
                          </span>
                        )}
                        {step.status === 'failed' && (
                          <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded-xs border border-rose-500/20 font-semibold shrink-0">
                            FAILED
                          </span>
                        )}
                      </div>

                      <p className="font-mono text-[11px] text-stone-300 mt-0.5 break-all max-w-full overflow-hidden leading-tight">
                        {typeof step.target === 'object'
                          ? JSON.stringify(step.target)
                          : step.target
                          ? `"${step.target}"`
                          : step.value
                          ? `"${step.value}"`
                          : '<no target>'}
                        {step.value && step.target && (
                          <span className="text-stone-400 ml-1.5">→ "{step.value}"</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Step Controls */}
                  <div className="flex items-center space-x-1 shrink-0 self-end sm:self-center pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800/60 w-full sm:w-auto justify-end">
                    {onRunStep && (
                      <button
                        onClick={() => onRunStep(idx)}
                        title="Run single step"
                        className="p-1.5 bg-stone-800 hover:bg-amber-700 text-stone-300 hover:text-amber-50 rounded-[6px] transition-all border border-stone-700"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    )}

                    <button
                      onClick={() => handleStartEdit(idx, step)}
                      title="Edit step inline"
                      className="p-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 rounded-[6px] transition-all border border-stone-700"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => handleMove(idx, 'up')}
                      disabled={idx === 0}
                      title="Move Up"
                      className="p-1 text-stone-500 hover:text-stone-200 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(idx, 'down')}
                      disabled={idx === steps.length - 1}
                      title="Move Down"
                      className="p-1 text-stone-500 hover:text-stone-200 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(idx)}
                      title="Delete Step"
                      className="p-1 text-stone-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Step Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-[6px] p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-amber-100 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Add E2E Test Step</span>
            </h3>

            <form onSubmit={handleAddStepSubmit} className="space-y-3">
              <div>
                <label className="block text-stone-400 text-[11px] font-bold mb-1">Command</label>
                <select
                  value={newCommand}
                  onChange={e => setNewCommand(e.target.value as CommandType)}
                  className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] p-2 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                >
                  <option value="click">click</option>
                  <option value="inputText">inputText</option>
                  <option value="assertVisible">assertVisible</option>
                  <option value="assertNotVisible">assertNotVisible</option>
                  <option value="navigate">navigate</option>
                  <option value="selectOption">selectOption</option>
                  <option value="pressKey">pressKey</option>
                  <option value="interceptNetwork">interceptNetwork</option>
                  <option value="copyTextFrom">copyTextFrom</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-400 text-[11px] font-bold mb-1">Target Selector (Text / ID / Object)</label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    placeholder='e.g., "Sign In" or {"testId": "cart-btn"}'
                    value={newTarget}
                    onChange={e => setNewTarget(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] p-2 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                  />
                  <VoiceInputButton
                    onTranscript={(text) => setNewTarget(prev => prev ? `${prev} ${text}` : text)}
                    size="sm"
                    title="Dictate target selector"
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-400 text-[11px] font-bold mb-1">Value / Text Parameter</label>
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    placeholder='e.g., user@example.com or Enter'
                    value={newValue}
                    onChange={e => setNewValue(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 text-stone-100 rounded-[6px] p-2 text-xs font-mono focus:border-amber-600 focus:outline-hidden"
                  />
                  <VoiceInputButton
                    onTranscript={(text) => setNewValue(prev => prev ? `${prev} ${text}` : text)}
                    size="sm"
                    title="Dictate input value"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-stone-800 text-stone-300 font-semibold rounded-[6px] hover:bg-stone-700 border border-stone-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-700 text-amber-50 font-bold rounded-[6px] hover:bg-amber-600 shadow-xs border border-amber-600"
                >
                  Save Step
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

