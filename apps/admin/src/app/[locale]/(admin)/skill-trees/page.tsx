'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';
import { motion } from 'framer-motion';
import {
  SkillTreeEditor,
  SkillTree,
  SkillNode,
} from '@/components/skill-tree/SkillTreeVisualizer';
import {
  Plus,
  Save,
  ArrowLeft,
  Trash2,
  Copy,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const createEmptySkillTree = (category: SkillTree['category']): SkillTree => ({
  id: '',
  name: 'New Learning Path',
  description: 'Learning path description',
  category,
  published: false,
  nodes: [
    {
      id: 'start',
      name: 'Start',
      description: 'Starting point of the path',
      icon: '🚀',
      position: { x: 500, y: 500 },
      prerequisites: [],
      unlockConditions: {
        projectsCompleted: 0,
        testScore: 0,
        timeSpent: 0,
      },
      resources: {
        lessons: [],
        projects: [],
        assessments: [],
      },
      metadata: {
        estimatedHours: 1,
        difficulty: 1,
        category: 'fundamentals',
      },
      status: 'available',
      progress: 0,
    },
  ],
});

const CATEGORY_CONFIG = [
  { category: 'programming' as const, label: 'Programming', icon: '💻', color: 'bg-blue-100 text-blue-700' },
  { category: 'design' as const, label: 'Design', icon: '🎨', color: 'bg-purple-100 text-purple-700' },
  { category: 'trading' as const, label: 'Trading', icon: '📈', color: 'bg-green-100 text-green-700' },
];

const CATEGORY_LABELS: Record<string, string> = {
  programming: '💻 Programming',
  design: '🎨 Design',
  trading: '📈 Trading',
};

// ─── Data normalisers (DB shape → component shape) ────────────────────────────
function normalizeNode(n: any): SkillNode {
  return {
    id: n.id,
    name: n.name,
    description: n.description ?? '',
    icon: n.icon ?? '📚',
    position: {
      x: n.positionX ?? n.position?.x ?? 500,
      y: n.positionY ?? n.position?.y ?? 300,
    },
    prerequisites: typeof n.prerequisites === 'string'
      ? JSON.parse(n.prerequisites)
      : (n.prerequisites ?? []),
    unlockConditions: typeof n.unlockConditions === 'string'
      ? JSON.parse(n.unlockConditions)
      : (n.unlockConditions ?? { projectsCompleted: 0, testScore: 0, timeSpent: 0 }),
    resources: typeof n.resources === 'string'
      ? JSON.parse(n.resources)
      : (n.resources ?? { lessons: [], projects: [], assessments: [] }),
    metadata: typeof n.metadata === 'string'
      ? JSON.parse(n.metadata)
      : (n.metadata ?? { estimatedHours: 1, difficulty: 1, category: 'fundamentals' }),
    status: n.status ?? 'available',
    progress: n.progress ?? 0,
  };
}

function normalizeTree(t: any): SkillTree {
  return {
    id: t.id,
    name: t.name,
    description: t.description ?? '',
    category: t.category,
    published: t.published ?? false,
    nodes: Array.isArray(t.nodes) ? t.nodes.map(normalizeNode) : [],
  };
}

export default function SkillTreeManagementPage() {
  const queryClient = useQueryClient();
  const [selectedTree, setSelectedTree] = useState<SkillTree | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<SkillTree['category'] | 'all'>('all');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Fetch skill trees from API
  const { data: skillTrees = [], isLoading, isError } = useQuery<SkillTree[]>({
    queryKey: ['skill-trees', categoryFilter],
    queryFn: async () => {
      try {
        const params = categoryFilter !== 'all' ? `?category=${categoryFilter}` : '';
        const response = await apiClient.get(`/admin/skill-trees${params}`);
        // API wraps response: { data: [...], statusCode: 200 }
        const result = response.data?.data ?? response.data;
        const arr = Array.isArray(result) ? result : [];
        return arr.map(normalizeTree);
      } catch (error) {
        console.error('Failed to fetch skill trees:', error);
        return [];
      }
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (tree: SkillTree) => {
      const { id, ...data } = tree;
      const response = await apiClient.post('/admin/skill-trees', data);
      const raw = response.data?.data ?? response.data;
      return raw ? normalizeTree(raw) : normalizeTree({ ...data, id: '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-trees'] });
      setIsEditing(false);
      setSelectedTree(null);
      toast({ title: 'Skill tree created successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to create skill tree', variant: 'destructive' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (tree: SkillTree) => {
      const response = await apiClient.put(`/admin/skill-trees/${tree.id}`, tree);
      const raw = response.data?.data ?? response.data;
      return raw ? normalizeTree(raw) : normalizeTree(tree);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-trees'] });
      setIsEditing(false);
      setSelectedTree(null);
      toast({ title: 'Skill tree updated successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to update skill tree', variant: 'destructive' });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (treeId: string) => {
      await apiClient.delete(`/admin/skill-trees/${treeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-trees'] });
      toast({ title: 'Skill tree deleted' });
    },
    onError: () => {
      toast({ title: 'Failed to delete skill tree', variant: 'destructive' });
    },
  });

  const handleCreateTree = (category: SkillTree['category']) => {
    const newTree = createEmptySkillTree(category);
    setSelectedTree(newTree);
    setIsEditing(true);
  };

  const handleSaveTree = async (tree: SkillTree) => {
    if (tree.id) {
      updateMutation.mutate(tree);
    } else {
      createMutation.mutate(tree);
    }
  };

  const handleDeleteTree = (treeId: string) => {
    setDeleteTarget(treeId);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleDuplicateTree = (tree: SkillTree) => {
    const treeNodes = Array.isArray(tree.nodes) ? tree.nodes : [];
    const duplicated: SkillTree = {
      ...tree,
      id: '',
      name: `${tree.name} (Copy)`,
      published: false,
      nodes: treeNodes.map(n => ({
        ...n,
        id: `${n.id}-copy`,
      })),
    };
    setSelectedTree(duplicated);
    setIsEditing(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (isEditing && selectedTree) {
    return (
      <div className="h-screen flex flex-col bg-slate-50">
        {/* Editor Header */}
        <div className="h-16 bg-white border-b px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setIsEditing(false);
                setSelectedTree(null);
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-semibold text-slate-800">
                {selectedTree.id ? 'Edit' : 'Create'} Skill Tree
              </h1>
              <p className="text-sm text-slate-500">{selectedTree.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveTree(selectedTree)}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>

        {/* Skill Tree Editor */}
        <div className="flex-1 overflow-hidden">
          <SkillTreeEditor
            initialTree={selectedTree}
            onSave={handleSaveTree}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Skill Tree Management</h1>
            <p className="text-slate-600 mt-1">Create and manage learning paths for students</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="all">All Categories</option>
              <option value="programming">Programming</option>
              <option value="design">Design</option>
              <option value="trading">Trading</option>
            </select>
          </div>
        </div>

        {/* Create New */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {CATEGORY_CONFIG.map((item) => (
            <button
              key={item.category}
              onClick={() => handleCreateTree(item.category)}
              className={cn(
                'p-6 rounded-xl border-2 border-dashed transition-all hover:border-solid',
                'flex flex-col items-center gap-3',
                item.color,
                'border-current hover:shadow-lg'
              )}
            >
              <span className="text-3xl">{item.icon}</span>
              <span className="font-medium">Create {item.label} Path</span>
              <Plus className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Skill Trees List */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-slate-500 mt-4">Loading skill trees...</p>
          </div>
        ) : isError ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <GraduationCap className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-700">Failed to load skill trees</h3>
            <p className="text-slate-500 mt-1">Please try refreshing the page</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['skill-trees'] })}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : !Array.isArray(skillTrees) || skillTrees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">No skill trees yet</h3>
            <p className="text-slate-500 mt-1">Create a new skill tree to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skillTrees.map((tree, index) => (
              <motion.div
                key={tree.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl border p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800">{tree.name}</h3>
                    <p className="text-sm text-slate-500 mt-1">{tree.description}</p>
                  </div>
                  <span className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    tree.published
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  )}>
                    {tree.published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    {(tree.nodes ?? []).length} skill{(tree.nodes ?? []).length !== 1 ? 's' : ''}
                  </span>
                  <span>{CATEGORY_LABELS[tree.category] || tree.category}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedTree(tree);
                      setIsEditing(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDuplicateTree(tree)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Duplicate"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTree(tree.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Skill Tree</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this skill tree? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
