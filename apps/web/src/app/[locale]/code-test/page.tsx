'use client';

import React, { useState } from 'react';
import { LiveCodeEditor, CodeExecutionResult } from '@/components';
import { motion } from 'framer-motion';
import apiClient from '@/lib/api/client';

const codeExamples = {
  javascript: `// JavaScript Example
function calculateSum(numbers) {
  return numbers.reduce((sum, num) => sum + num, 0);
}

const result = calculateSum([1, 2, 3, 4, 5]);
console.log("Sum:", result);`,

  python: `# Python Example
def calculate_sum(numbers):
    return sum(numbers)

result = calculate_sum([1, 2, 3, 4, 5])
print(f"Sum: {result}")`,

  html: `<!-- HTML Example -->
<div class="container">
  <h1>Hello FiS Academy!</h1>
  <p>This is a test HTML page.</p>
  <button>Click me</button>
</div>`,

  css: `/* CSS Example */
.container {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
  border-radius: 1rem;
  color: white;
  text-align: center;
}`,
};

export default function CodeEditorTestPage() {
  const [language, setLanguage] = useState<keyof typeof codeExamples>('javascript');
  const [executionResult, setExecutionResult] = useState<CodeExecutionResult | null>(null);

  const handleRun = async (code: string): Promise<CodeExecutionResult> => {
    // HTML/CSS: preview only, no server execution needed
    if (language === 'html' || language === 'css') {
      const result: CodeExecutionResult = {
        output: `${language.toUpperCase()} rendered in preview tab`,
        error: null,
        executionTime: 0,
        status: 'success',
      };
      setExecutionResult(result);
      return result;
    }

    try {
      const { data } = await apiClient.post('/code-execution/execute', {
        sourceCode: code,
        languageId: language,
      });

      const isSuccess = data.status === 'accepted';
      const isTimeout = data.status === 'time_limit_exceeded';

      const result: CodeExecutionResult = {
        output: data.stdout || '',
        error: data.stderr || data.compileOutput || null,
        executionTime: data.executionTime ? Math.round(data.executionTime * 1000) : 0,
        status: isTimeout ? 'timeout' : isSuccess ? 'success' : 'error',
      };

      setExecutionResult(result);
      return result;
    } catch (err: any) {
      const message =
        err?.response?.data?.message || err?.message || 'فشل الاتصال بخادم التنفيذ';
      const result: CodeExecutionResult = {
        output: '',
        error: message,
        executionTime: 0,
        status: 'error',
      };
      setExecutionResult(result);
      return result;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            🧪 Code Editor Test Lab
          </h1>
          <p className="text-slate-600">
            Test the live code editor with different programming languages
          </p>
        </motion.div>

        {/* Language Selector */}
        <div className="flex gap-2 mb-6">
          {(Object.keys(codeExamples) as Array<keyof typeof codeExamples>).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                language === lang
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Code Editor */}
        <motion.div
          key={language}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <LiveCodeEditor
            initialCode={codeExamples[language]}
            language={language as any}
            lessonId="test-lesson"
            exerciseId={`test-exercise-${language}`}
            onRun={handleRun}
            className="h-[600px]"
          />
        </motion.div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-xl p-6 border">
          <h2 className="text-lg font-semibold mb-4">📝 How to Test</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
            <div className="space-y-2">
              <p>1. Select a language from the buttons above</p>
              <p>2. Edit the code in the editor</p>
              <p>3. Click "تشغيل الكود" (Run Code)</p>
            </div>
            <div className="space-y-2">
              <p>4. View output in the right panel</p>
              <p>5. Try the Console and Preview tabs</p>
              <p>6. Test fullscreen mode (top right icon)</p>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '🎨', title: 'Syntax Highlighting', desc: 'Color-coded code' },
            { icon: '▶️', title: 'Live Execution', desc: 'Run code instantly' },
            { icon: '💾', title: 'Auto Save', desc: 'Drafts saved locally' },
            { icon: '🔍', title: 'Error Detection', desc: 'Highlight issues' },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-4 rounded-lg border text-center"
            >
              <div className="text-2xl mb-2">{feature.icon}</div>
              <h3 className="font-medium text-slate-800">{feature.title}</h3>
              <p className="text-xs text-slate-500">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
