'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, CheckCircle2, Star, Circle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SkillNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  position: { x: number; y: number };
  prerequisites: string[];
  unlockConditions: {
    projectsCompleted: number;
    testScore: number;
    timeSpent: number;
  };
  resources: {
    lessons: string[];
    projects: string[];
    assessments: string[];
  };
  metadata: {
    estimatedHours: number;
    difficulty: 1 | 2 | 3 | 4 | 5;
    category: string;
  };
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'mastered';
  progress: number;
}

export interface SkillTree {
  id: string;
  name: string;
  description: string;
  nodes: SkillNode[];
  category: 'programming' | 'design' | 'trading';
  published: boolean;
}

export interface SkillTreeVisualizerProps {
  tree: SkillTree;
  onNodeClick?: (node: SkillNode) => void;
  onNodeUnlock?: (nodeId: string) => void;
  className?: string;
}

const statusConfig = {
  locked: { 
    icon: Lock, 
    color: 'bg-gray-300 border-gray-400', 
    textColor: 'text-gray-500',
    glow: '' 
  },
  available: { 
    icon: Circle, 
    color: 'bg-white border-amber-500', 
    textColor: 'text-amber-600',
    glow: 'animate-pulse shadow-lg shadow-amber-200' 
  },
  in_progress: { 
    icon: Play, 
    color: 'bg-amber-100 border-amber-500', 
    textColor: 'text-amber-700',
    glow: 'shadow-lg shadow-amber-300' 
  },
  completed: { 
    icon: CheckCircle2, 
    color: 'bg-emerald-100 border-emerald-500', 
    textColor: 'text-emerald-700',
    glow: 'shadow-lg shadow-emerald-200' 
  },
  mastered: { 
    icon: Star, 
    color: 'bg-amber-300 border-amber-600', 
    textColor: 'text-amber-800',
    glow: 'shadow-lg shadow-amber-400' 
  },
};

export function SkillTreeVisualizer({ 
  tree, 
  onNodeClick, 
  onNodeUnlock,
  className 
}: SkillTreeVisualizerProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Calculate SVG paths between nodes
  const connections = useMemo(() => {
    const paths: { from: SkillNode; to: SkillNode }[] = [];
    
    tree.nodes.forEach(node => {
      node.prerequisites.forEach(prereqId => {
        const prereqNode = tree.nodes.find(n => n.id === prereqId);
        if (prereqNode) {
          paths.push({ from: prereqNode, to: node });
        }
      });
    });
    
    return paths;
  }, [tree.nodes]);

  const handleNodeClick = useCallback((node: SkillNode) => {
    if (node.status === 'locked') {
      onNodeUnlock?.(node.id);
    } else {
      setSelectedNode(node.id);
      onNodeClick?.(node);
    }
  }, [onNodeClick, onNodeUnlock]);

  // Calculate canvas dimensions
  const canvasWidth = 1000;
  const canvasHeight = 600;

  return (
    <div className={cn('relative w-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl', className)}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{tree.name}</h2>
            <p className="text-sm text-slate-600">{tree.description}</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>
                {tree.nodes.filter(n => n.status === 'completed' || n.status === 'mastered').length}/{tree.nodes.length} مكتمل
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Skill Tree Canvas */}
      <div className="relative p-8 min-h-[600px]">
        <svg 
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connection Lines */}
          {connections.map((conn, idx) => {
            const isUnlocked = conn.from.status !== 'locked';
            return (
              <motion.line
                key={`${conn.from.id}-${conn.to.id}-${idx}`}
                x1={conn.from.position.x}
                y1={conn.from.position.y}
                x2={conn.to.position.x}
                y2={conn.to.position.y}
                stroke={isUnlocked ? '#10b981' : '#d1d5db'}
                strokeWidth={isUnlocked ? 3 : 2}
                strokeDasharray={isUnlocked ? '0' : '5,5'}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        {tree.nodes.map((node) => {
          const config = statusConfig[node.status];
          const Icon = config.icon;
          const isHovered = hoveredNode === node.id;
          const isSelected = selectedNode === node.id;

          return (
            <motion.div
              key={node.id}
              className="absolute"
              style={{
                left: node.position.x,
                top: node.position.y,
                transform: 'translate(-50%, -50%)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              onMouseEnter={() => setHoveredNode(node.id)}
              onMouseLeave={() => setHoveredNode(null)}
            >
              <button
                onClick={() => handleNodeClick(node)}
                className={cn(
                  'relative w-16 h-16 rounded-full border-3 flex items-center justify-center',
                  'transition-all duration-200 cursor-pointer',
                  config.color,
                  config.glow,
                  isHovered && 'scale-110',
                  isSelected && 'ring-4 ring-blue-400'
                )}
              >
                <Icon className={cn('w-7 h-7', config.textColor)} />
                
                {/* Progress Ring for in-progress */}
                {node.status === 'in_progress' && (
                  <svg className="absolute inset-0 w-full h-full -rotate-90">
                    <circle
                      cx="50%"
                      cy="50%"
                      r="46%"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-amber-500"
                      strokeDasharray={`${node.progress * 2.9} 290`}
                    />
                  </svg>
                )}

                {/* Mastered Star Badge */}
                {node.status === 'mastered' && (
                  <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5">
                    <Star className="w-3 h-3 text-white fill-white" />
                  </div>
                )}
              </button>

              {/* Node Label */}
              <div className={cn(
                'absolute top-full mt-2 left-1/2 -translate-x-1/2',
                'text-xs font-medium whitespace-nowrap',
                config.textColor
              )}>
                {node.name}
              </div>

              {/* Hover/Selected Tooltip */}
              <AnimatePresence>
                {(isHovered || isSelected) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={cn(
                      'absolute z-20 w-64 p-4 rounded-lg shadow-xl',
                      'bg-white border border-slate-200',
                      'top-full mt-8 left-1/2 -translate-x-1/2'
                    )}
                  >
                    <h3 className="font-bold text-slate-800 mb-1">{node.name}</h3>
                    <p className="text-sm text-slate-600 mb-3">{node.description}</p>
                    
                    <div className="space-y-2 text-xs text-slate-500">
                      <div className="flex justify-between">
                        <span>الوقت المتوقع:</span>
                        <span>{node.metadata.estimatedHours} ساعة</span>
                        </div>
                      <div className="flex justify-between">
                        <span>الصعوبة:</span>
                        <span>{'⭐'.repeat(node.metadata.difficulty)}</span>
                      </div>
                      
                      {node.status === 'locked' && (
                        <div className="mt-3 pt-2 border-t">
                          <span className="text-amber-600 font-medium">المتطلبات:</span>
                          <ul className="mt-1 space-y-0.5">
                            {node.prerequisites.map(prereqId => {
                              const prereq = tree.nodes.find(n => n.id === prereqId);
                              return prereq ? (
                                <li key={prereqId} className="text-slate-400">• {prereq.name}</li>
                              ) : null;
                            })}
                          </ul>
                        </div>
                      )}

                      {node.status === 'in_progress' && (
                        <div className="mt-3 pt-2 border-t">
                          <div className="flex justify-between text-sm">
                            <span>التقدم:</span>
                            <span className="text-amber-600 font-bold">{node.progress}%</span>
                          </div>
                          <div className="mt-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-amber-500 transition-all"
                              style={{ width: `${node.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="fixed bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg p-3 shadow-lg border text-xs space-y-2">
        <div className="font-medium text-slate-700 mb-2">حالة المهارات</div>
        {Object.entries(statusConfig).map(([status, config]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={cn('w-4 h-4 rounded-full border', config.color)} />
            <span className="text-slate-600">
              {status === 'locked' && 'مغلقة'}
              {status === 'available' && 'متاحة'}
              {status === 'in_progress' && 'قيد التقدم'}
              {status === 'completed' && 'مكتملة'}
              {status === 'mastered' && 'إتقان'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Skill Tree Editor for Instructors
export function SkillTreeEditor({ 
  initialTree,
  onSave,
}: { 
  initialTree: SkillTree;
  onSave: (tree: SkillTree) => void;
}) {
  const [tree, setTree] = useState<SkillTree>(initialTree);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);

  const handleAddNode = useCallback(() => {
    const newNode: SkillNode = {
      id: `node-${Date.now()}`,
      name: 'مهارة جديدة',
      description: 'وصف المهارة',
      icon: '📚',
      position: { x: 500, y: 300 },
      prerequisites: [],
      unlockConditions: { projectsCompleted: 0, testScore: 0, timeSpent: 0 },
      resources: { lessons: [], projects: [], assessments: [] },
      metadata: { estimatedHours: 10, difficulty: 1, category: tree.category },
      status: 'available',
      progress: 0,
    };
    setTree(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setSelectedNode(newNode);
  }, [tree.category]);

  return (
    <div className="flex h-screen">
      {/* Canvas */}
      <div className="flex-1 relative bg-slate-50 overflow-hidden">
        <SkillTreeVisualizer 
          tree={tree} 
          onNodeClick={setSelectedNode}
          className="h-full"
        />
        
        {/* Toolbar */}
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={handleAddNode}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
          >
            + إضافة مهارة
          </button>
          <button
            onClick={() => onSave(tree)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700"
          >
            حفظ
          </button>
        </div>
      </div>

      {/* Properties Panel */}
      {selectedNode && (
        <div className="w-80 bg-white border-l border-slate-200 p-6 overflow-auto">
          <h3 className="text-lg font-bold mb-4">تعديل المهارة</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الاسم</label>
              <input
                type="text"
                value={selectedNode.name}
                onChange={(e) => {
                  const updated = { ...selectedNode, name: e.target.value };
                  setSelectedNode(updated);
                  setTree(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(n => n.id === updated.id ? updated : n)
                  }));
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الوصف</label>
              <textarea
                value={selectedNode.description}
                onChange={(e) => {
                  const updated = { ...selectedNode, description: e.target.value };
                  setSelectedNode(updated);
                  setTree(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(n => n.id === updated.id ? updated : n)
                  }));
                }}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الوقت المتوقع (ساعات)</label>
              <input
                type="number"
                value={selectedNode.metadata.estimatedHours}
                onChange={(e) => {
                  const updated = { 
                    ...selectedNode, 
                    metadata: { ...selectedNode.metadata, estimatedHours: parseInt(e.target.value) || 0 }
                  };
                  setSelectedNode(updated);
                  setTree(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(n => n.id === updated.id ? updated : n)
                  }));
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الصعوبة</label>
              <select
                value={selectedNode.metadata.difficulty}
                onChange={(e) => {
                  const updated = { 
                    ...selectedNode, 
                    metadata: { ...selectedNode.metadata, difficulty: parseInt(e.target.value) as 1|2|3|4|5 }
                  };
                  setSelectedNode(updated);
                  setTree(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(n => n.id === updated.id ? updated : n)
                  }));
                }}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{'⭐'.repeat(n)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">المتطلبات</label>
              <div className="space-y-2 max-h-40 overflow-auto">
                {tree.nodes
                  .filter(n => n.id !== selectedNode.id)
                  .map(node => (
                    <label key={node.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedNode.prerequisites.includes(node.id)}
                        onChange={(e) => {
                          const prereqs = e.target.checked
                            ? [...selectedNode.prerequisites, node.id]
                            : selectedNode.prerequisites.filter(id => id !== node.id);
                          const updated = { ...selectedNode, prerequisites: prereqs };
                          setSelectedNode(updated);
                          setTree(prev => ({
                            ...prev,
                            nodes: prev.nodes.map(n => n.id === updated.id ? updated : n)
                          }));
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{node.name}</span>
                    </label>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
