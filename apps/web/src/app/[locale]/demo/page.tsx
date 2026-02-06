'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  SkillTreeVisualizer, 
  SkillTree,
  LiveCodeEditor, 
  DebugMode, 
  CodeComparison,
  DebugStep 
} from '@/components';
import { cn } from '@/lib/utils';

// Sample Skill Tree Data
const sampleSkillTree: SkillTree = {
  id: 'web-dev-fundamentals',
  name: 'أساسيات تطوير الويب',
  description: 'مسارك الأول لتصبح مطور ويب محترف',
  category: 'programming',
  published: true,
  nodes: [
    {
      id: 'setup',
      name: 'إعداد البيئة',
      description: 'تثبيت الأدوات اللازمة للبدء',
      icon: '🛠️',
      position: { x: 500, y: 500 },
      prerequisites: [],
      unlockConditions: { projectsCompleted: 0, testScore: 0, timeSpent: 0 },
      resources: { lessons: ['intro'], projects: [], assessments: [] },
      metadata: { estimatedHours: 2, difficulty: 1, category: 'setup' },
      status: 'completed',
      progress: 100,
    },
    {
      id: 'html-basics',
      name: 'أساسيات HTML',
      description: 'بناء هيكل صفحات الويب',
      icon: '📄',
      position: { x: 500, y: 400 },
      prerequisites: ['setup'],
      unlockConditions: { projectsCompleted: 1, testScore: 80, timeSpent: 5 },
      resources: { lessons: ['html-tags'], projects: ['portfolio-1'], assessments: ['html-quiz'] },
      metadata: { estimatedHours: 8, difficulty: 1, category: 'html' },
      status: 'completed',
      progress: 100,
    },
    {
      id: 'css-basics',
      name: 'أساسيات CSS',
      description: 'تنسيق وتجميل الصفحات',
      icon: '🎨',
      position: { x: 400, y: 300 },
      prerequisites: ['html-basics'],
      unlockConditions: { projectsCompleted: 2, testScore: 80, timeSpent: 10 },
      resources: { lessons: ['css-selectors'], projects: ['styled-portfolio'], assessments: ['css-quiz'] },
      metadata: { estimatedHours: 12, difficulty: 2, category: 'css' },
      status: 'in_progress',
      progress: 45,
    },
    {
      id: 'css-advanced',
      name: 'CSS متقدم',
      description: 'Flexbox, Grid, Animations',
      icon: '✨',
      position: { x: 300, y: 200 },
      prerequisites: ['css-basics'],
      unlockConditions: { projectsCompleted: 3, testScore: 85, timeSpent: 15 },
      resources: { lessons: ['flexbox', 'grid'], projects: ['responsive-site'], assessments: ['advanced-css'] },
      metadata: { estimatedHours: 15, difficulty: 3, category: 'css' },
      status: 'locked',
      progress: 0,
    },
    {
      id: 'js-basics',
      name: 'JavaScript أساسي',
      description: 'إضافة التفاعل للصفحات',
      icon: '⚡',
      position: { x: 600, y: 300 },
      prerequisites: ['html-basics'],
      unlockConditions: { projectsCompleted: 2, testScore: 80, timeSpent: 12 },
      resources: { lessons: ['js-variables', 'functions'], projects: ['interactive-page'], assessments: ['js-basics'] },
      metadata: { estimatedHours: 20, difficulty: 3, category: 'javascript' },
      status: 'available',
      progress: 0,
    },
    {
      id: 'dom-manipulation',
      name: 'التعامل مع DOM',
      description: 'تحكم كامل بعناصر الصفحة',
      icon: '🎯',
      position: { x: 600, y: 200 },
      prerequisites: ['js-basics'],
      unlockConditions: { projectsCompleted: 3, testScore: 85, timeSpent: 18 },
      resources: { lessons: ['dom-api'], projects: ['todo-app'], assessments: ['dom-quiz'] },
      metadata: { estimatedHours: 15, difficulty: 3, category: 'javascript' },
      status: 'locked',
      progress: 0,
    },
    {
      id: 'first-project',
      name: 'المشروع الأول',
      description: 'بناء موقع متكامل',
      icon: '🚀',
      position: { x: 500, y: 100 },
      prerequisites: ['css-basics', 'js-basics'],
      unlockConditions: { projectsCompleted: 5, testScore: 90, timeSpent: 30 },
      resources: { lessons: ['project-guide'], projects: ['final-project'], assessments: ['project-review'] },
      metadata: { estimatedHours: 25, difficulty: 4, category: 'project' },
      status: 'locked',
      progress: 0,
    },
  ],
};

// Sample Code for Editor
const sampleCode = `// مرحباً! اكتب كود JavaScript هنا
function greet(name) {
  return "مرحباً " + name + "!";
}

const message = greet("فريق FiS");
console.log(message);`;

// Sample Debug Steps
const debugSteps: DebugStep[] = [
  {
    lineNumber: 3,
    variables: { name: { value: '"فريق FiS"', type: 'string', changed: true } },
    callStack: ['main', 'greet'],
    output: '',
    explanation: 'تم استدعاء الدالة greet مع المعامل name'
  },
  {
    lineNumber: 4,
    variables: { 
      name: { value: '"فريق FiS"', type: 'string' },
      message: { value: '"مرحباً فريق FiS!"', type: 'string', changed: true }
    },
    callStack: ['main'],
    output: '',
    explanation: 'تم تخزين نتيجة الدالة في المتغير message'
  },
  {
    lineNumber: 5,
    variables: { 
      name: { value: '"فريق FiS"', type: 'string' },
      message: { value: '"مرحباً فريق FiS!"', type: 'string' }
    },
    callStack: ['main'],
    output: 'مرحباً فريق FiS!',
    explanation: 'طباعة الرسالة في الكونسول'
  },
];

// Sample Student and Model Code for Comparison
const studentCode = `function calculateSum(numbers) {
  let sum = 0;
  for (let i = 0; i < numbers.length; i++) {
    sum += numbers[i];
  }
  return sum;
}

const result = calculateSum([1, 2, 3, 4, 5]);
console.log(result);`;

const modelCode = `function calculateSum(numbers) {
  if (!Array.isArray(numbers)) {
    throw new Error('Input must be an array');
  }
  
  return numbers.reduce((sum, num) => sum + num, 0);
}

const numbers = [1, 2, 3, 4, 5];
const result = calculateSum(numbers);
console.log('Sum:', result);`;

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState('skilltree');

  const handleNodeClick = (node: any) => {
    console.log('Node clicked:', node);
  };

  const handleCodeRun = async (code: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      output: 'مرحباً فريق FiS!',
      error: null,
      executionTime: 120,
      status: 'success' as const,
    };
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            FiS Academy - Interactive Components Demo
          </h1>
          <p className="text-slate-600">
            عرض تفاعلي لمكونات منصة التعلم التفاعلي
          </p>
        </div>

        {/* Custom Tabs */}
        <div className="space-y-6">
          <div className="grid grid-cols-4 max-w-2xl bg-slate-100 rounded-lg p-1">
            {[
              { id: 'skilltree', label: 'شجرة المهارات' },
              { id: 'editor', label: 'محرر الكود' },
              { id: 'debug', label: 'وضع التصحيح' },
              { id: 'compare', label: 'مقارنة الحلول' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-2 text-sm rounded-md transition-colors',
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-4">
            {activeTab === 'skilltree' && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">Skill Tree Visualizer</h2>
                <p className="text-slate-600 mb-6">
                  عرض تفاعلي لمسار التعلم بنظام RPG. انقر على أي مهارة لرؤية التفاصيل.
                </p>
                <SkillTreeVisualizer 
                  tree={sampleSkillTree} 
                  onNodeClick={handleNodeClick}
                  className="h-[600px]"
                />
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">Live Code Editor</h2>
                <p className="text-slate-600 mb-6">
                  محرر أكواد تفاعلي مع تشغيل مباشر. جرب كتابة كود JavaScript وتشغيله!
                </p>
                <LiveCodeEditor
                  initialCode={sampleCode}
                  language="javascript"
                  lessonId="demo-1"
                  exerciseId="ex-1"
                  onRun={handleCodeRun}
                  className="h-[600px]"
                />
              </div>
            )}

            {activeTab === 'debug' && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">Debug Mode</h2>
                <p className="text-slate-600 mb-6">
                  وضح التصحيح البصري - خطوة بخطوة مع مراقبة المتغيرات.
                </p>
                <DebugMode
                  code={sampleCode}
                  language="javascript"
                  steps={debugSteps}
                  className="h-[600px]"
                />
              </div>
            )}

            {activeTab === 'compare' && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold mb-4">Code Comparison</h2>
                <p className="text-slate-600 mb-6">
                  مقارنة بين حل الطالب والحل المثالي مع عرض الفروقات.
                </p>
                <CodeComparison
                  studentCode={studentCode}
                  modelCode={modelCode}
                  language="javascript"
                  studentOutput={{
                    output: '15',
                    error: null,
                    executionTime: 80,
                    status: 'success',
                  }}
                  modelOutput={{
                    output: 'Sum: 15',
                    error: null,
                    executionTime: 75,
                    status: 'success',
                  }}
                  score={85}
                  maxScore={100}
                  onAcceptModel={() => alert('تم اعتماد الحل المثالي!')}
                  onKeepMine={() => alert('تم حفظ حلك!')}
                  onRetry={() => alert('إعادة المحاولة...')}
                  className="h-[600px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Component Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {[
            { 
              title: 'Skill Tree', 
              desc: 'نظام RPG للمهارات مع متطلبات وإنجازات',
              color: 'bg-purple-100 text-purple-700'
            },
            { 
              title: 'Code Editor', 
              desc: 'محرر أكواد مع تشغيل مباشر وعدة لغات',
              color: 'bg-blue-100 text-blue-700'
            },
            { 
              title: 'Debug Mode', 
              desc: 'تصحيح بصري خطوة بخطوة',
              color: 'bg-emerald-100 text-emerald-700'
            },
            { 
              title: 'Diff View', 
              desc: 'مقارنة الحلول مع Git-style diff',
              color: 'bg-amber-100 text-amber-700'
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`p-4 rounded-xl ${card.color}`}
            >
              <h3 className="font-semibold mb-1">{card.title}</h3>
              <p className="text-sm opacity-80">{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
