'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Eye,
  EyeOff,
  GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Sample initial skill tree data
const createEmptySkillTree = (category: SkillTree['category']): SkillTree => ({
  id: '',
  name: 'مسار تعليمي جديد',
  description: 'وصف المسار التعليمي',
  category,
  published: false,
  nodes: [
    {
      id: 'start',
      name: 'البداية',
      description: 'نقطة البداية في المسار',
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

export default function SkillTreeManagementPage() {
  const router = useRouter();
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>([]);
  const [selectedTree, setSelectedTree] = useState<SkillTree | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<SkillTree['category'] | 'all'>('all');

  // Load skill trees from API
  useEffect(() => {
    loadSkillTrees();
  }, []);

  const loadSkillTrees = async () => {
    setIsLoading(true);
    try {
      // In production, call your API
      // const response = await fetch('/api/admin/skill-trees');
      // const data = await response.json();
      // setSkillTrees(data);
      
      // For now, use empty array
      setSkillTrees([]);
    } catch (error) {
      console.error('Failed to load skill trees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTree = (category: SkillTree['category']) => {
    const newTree = createEmptySkillTree(category);
    setSelectedTree(newTree);
    setIsEditing(true);
  };

  const handleSaveTree = async (tree: SkillTree) => {
    try {
      // In production, call your API
      // const method = tree.id ? 'PUT' : 'POST';
      // const url = tree.id ? `/api/admin/skill-trees/${tree.id}` : '/api/admin/skill-trees';
      // await fetch(url, {
      //   method,
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(tree),
      // });
      
      // Update local state
      if (tree.id) {
        setSkillTrees(prev => 
          prev.map(t => t.id === tree.id ? tree : t)
        );
      } else {
        const newTree = { ...tree, id: `tree-${Date.now()}` };
        setSkillTrees(prev => [...prev, newTree]);
      }
      
      setIsEditing(false);
      setSelectedTree(null);
      alert('تم حفظ شجرة المهارات بنجاح!');
    } catch (error) {
      console.error('Failed to save skill tree:', error);
      alert('فشل حفظ شجرة المهارات');
    }
  };

  const handleDeleteTree = async (treeId: string) => {
    if (!confirm('هل أنت متأكد من حذف شجرة المهارات؟')) return;
    
    try {
      // await fetch(`/api/admin/skill-trees/${treeId}`, { method: 'DELETE' });
      setSkillTrees(prev => prev.filter(t => t.id !== treeId));
    } catch (error) {
      console.error('Failed to delete skill tree:', error);
    }
  };

  const handleDuplicateTree = (tree: SkillTree) => {
    const duplicated: SkillTree = {
      ...tree,
      id: '',
      name: `${tree.name} (نسخة)`,
      published: false,
      nodes: tree.nodes.map(n => ({
        ...n,
        id: `${n.id}-copy-${Date.now()}`,
      })),
    };
    setSelectedTree(duplicated);
    setIsEditing(true);
  };

  const filteredTrees = categoryFilter === 'all' 
    ? skillTrees 
    : skillTrees.filter(t => t.category === categoryFilter);

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
                {selectedTree.id ? 'تعديل' : 'إنشاء'} شجرة المهارات
              </h1>
              <p className="text-sm text-slate-500">{selectedTree.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSaveTree(selectedTree)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              حفظ
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
            <h1 className="text-2xl font-bold text-slate-800">إدارة أشجار المهارات</h1>
            <p className="text-slate-600 mt-1">إنشاء وتعديل مسارات التعلم للطلاب</p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              <option value="all">جميع الفئات</option>
              <option value="programming">برمجة</option>
              <option value="design">تصميم</option>
              <option value="trading">تداول</option>
            </select>
          </div>
        </div>

        {/* Create New */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {([
            { category: 'programming', label: 'برمجة', icon: '💻', color: 'bg-blue-100 text-blue-700' },
            { category: 'design', label: 'تصميم', icon: '🎨', color: 'bg-purple-100 text-purple-700' },
            { category: 'trading', label: 'تداول', icon: '📈', color: 'bg-green-100 text-green-700' },
          ] as const).map((item) => (
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
              <span className="font-medium">إنشاء مسار {item.label}</span>
              <Plus className="w-5 h-5" />
            </button>
          ))}
        </div>

        {/* Skill Trees List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-slate-500 mt-4">جاري التحميل...</p>
          </div>
        ) : filteredTrees.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border">
            <GraduationCap className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700">لا توجد أشجار مهارات</h3>
            <p className="text-slate-500 mt-1">قم بإنشاء شجرة مهارات جديدة للبدء</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrees.map((tree, index) => (
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
                    {tree.published ? 'منشور' : 'مسودة'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                  <span className="flex items-center gap-1">
                    <GraduationCap className="w-4 h-4" />
                    {tree.nodes.length} مهارة
                  </span>
                  <span className="flex items-center gap-1">
                    {tree.category === 'programming' && '💻 برمجة'}
                    {tree.category === 'design' && '🎨 تصميم'}
                    {tree.category === 'trading' && '📈 تداول'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedTree(tree);
                      setIsEditing(true);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDuplicateTree(tree)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="نسخ"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTree(tree.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
