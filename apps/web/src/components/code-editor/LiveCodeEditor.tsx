'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  Terminal,
  Globe,
  Code2,
  Loader2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type SupportedLanguage = 'html' | 'css' | 'javascript' | 'python' | 'java';

export interface CodeExecutionResult {
  output: string;
  error: string | null;
  executionTime: number;
  status: 'success' | 'error' | 'timeout';
}

export interface CodeEditorProps {
  initialCode: string;
  language: SupportedLanguage;
  lessonId: string;
  exerciseId: string;
  onRun?: (code: string) => Promise<CodeExecutionResult>;
  onSubmit?: (code: string, result: CodeExecutionResult) => void;
  onProgress?: (progress: number) => void;
  className?: string;
  readOnly?: boolean;
  expectedOutput?: string;
}

const languageConfig: Record<SupportedLanguage, { 
  name: string; 
  extension: string; 
  placeholder: string;
  color: string;
}> = {
  html: {
    name: 'HTML',
    extension: 'html',
    placeholder: '<!-- اكتب كود HTML هنا -->',
    color: 'text-orange-600 bg-orange-50',
  },
  css: {
    name: 'CSS',
    extension: 'css',
    placeholder: '/* اكتب كود CSS هنا */',
    color: 'text-blue-600 bg-blue-50',
  },
  javascript: {
    name: 'JavaScript',
    extension: 'js',
    placeholder: '// اكتب كود JavaScript هنا',
    color: 'text-yellow-600 bg-yellow-50',
  },
  python: {
    name: 'Python',
    extension: 'py',
    placeholder: '# اكتب كود Python هنا',
    color: 'text-green-600 bg-green-50',
  },
  java: {
    name: 'Java',
    extension: 'java',
    placeholder: '// اكتب كود Java هنا',
    color: 'text-red-600 bg-red-50',
  },
};

// Simple syntax highlighting - disabled to prevent text overlap
// In production, use Monaco Editor or CodeMirror
const highlightCode = (code: string, language: SupportedLanguage): string => {
  // Return plain code without highlighting to avoid overlap issues
  return code;
};

export function LiveCodeEditor({
  initialCode,
  language,
  lessonId,
  exerciseId,
  onRun,
  onSubmit,
  onProgress,
  className,
  readOnly = false,
  expectedOutput,
}: CodeEditorProps) {
  const [code, setCode] = useState(initialCode);
  const [originalCode] = useState(initialCode);
  const [output, setOutput] = useState<CodeExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'output' | 'console' | 'preview'>('output');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  // Sync scroll between textarea and line numbers
  const handleScroll = useCallback((e: React.UIEvent<HTMLTextAreaElement>) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, []);

  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    setHasChanges(newCode !== originalCode);
    
    // Calculate progress based on code length/complexity
    const progress = Math.min(100, Math.round((newCode.length / (originalCode.length * 1.5)) * 100));
    onProgress?.(progress);
  }, [originalCode, onProgress]);

  const handleRun = useCallback(async () => {
    if (!onRun || isRunning) return;
    
    setIsRunning(true);
    setOutput(null);
    
    try {
      const result = await onRun(code);
      setOutput(result);
      
      if (result.status === 'success') {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        
        // Auto-switch to appropriate tab based on language
        if (language === 'html' || language === 'css') {
          setActiveTab('preview');
        } else {
          setActiveTab('output');
        }
      }
    } catch (error) {
      setOutput({
        output: '',
        error: 'حدث خطأ أثناء تشغيل الكود',
        executionTime: 0,
        status: 'error',
      });
    } finally {
      setIsRunning(false);
    }
  }, [code, onRun, isRunning, language]);

  const handleReset = useCallback(() => {
    if (confirm('هل تريد إعادة تعيين الكود إلى الحالة الأصلية؟')) {
      setCode(originalCode);
      setHasChanges(false);
      setOutput(null);
    }
  }, [originalCode]);

  const handleSave = useCallback(() => {
    // Save to localStorage as draft
    const draftKey = `code-draft-${lessonId}-${exerciseId}`;
    localStorage.setItem(draftKey, code);
    setHasChanges(false);
    
    // Show toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = 'تم حفظ المسودة';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2000);
  }, [code, lessonId, exerciseId]);

  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

  const config = languageConfig[language];

  // Generate preview for HTML/CSS
  const generatePreview = () => {
    if (language === 'html') {
      return code;
    } else if (language === 'css') {
      return `
        <style>${code}</style>
        <div class="preview-content">
          <h1>عنوان تجريبي</h1>
          <p>فقرة نصية للاختبار</p>
          <button>زر تجريبي</button>
        </div>
      `;
    }
    return '';
  };

  return (
    <div className={cn(
      'flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden',
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : '',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className={cn('px-3 py-1 rounded-full text-xs font-medium', config.color)}>
            {config.name}
          </span>
          {hasChanges && (
            <span className="text-xs text-amber-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              تعديلات غير محفوظة
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Language Selector (if multiple supported) */}
          <select
            value={language}
            disabled
            className="text-sm border rounded-lg px-2 py-1 bg-slate-100 text-slate-600"
          >
            <option value={language}>{config.name}</option>
          </select>

          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
            title="حفظ مسودة"
          >
            <Save className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
            title="إعادة تعيين"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            title={isFullscreen ? 'تصغير' : 'تكبير'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Editor */}
        <div className="flex-1 flex min-w-0">
          {/* Line Numbers - Fixed: Better scroll sync */}
          <div 
            ref={lineNumbersRef}
            className="w-12 py-4 bg-slate-50 border-r border-slate-200 text-right text-xs text-slate-400 select-none overflow-hidden"
          >
            {lineNumbers.map(num => (
              <div key={num} className="px-2 h-6 flex items-center justify-end">{num}</div>
            ))}
          </div>

          {/* Code Area - Fixed: Removed overlapping overlay */}
          <div className="flex-1 relative overflow-hidden">
            <textarea
              ref={editorRef}
              value={code}
              onChange={handleCodeChange}
              onScroll={handleScroll}
              placeholder={config.placeholder}
              readOnly={readOnly}
              spellCheck={false}
              className={cn(
                'w-full h-full p-4 font-mono text-sm leading-6 resize-none',
                'bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                'selection:bg-blue-200',
                readOnly && 'bg-slate-50 cursor-not-allowed'
              )}
              style={{ 
                tabSize: 2,
                direction: 'ltr',
                textAlign: 'left',
              }}
            />
          </div>
        </div>

        {/* Output Panel */}
        <div className="w-96 border-l border-slate-200 flex flex-col bg-slate-50">
          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('output')}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors',
                activeTab === 'output' 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Terminal className="w-4 h-4" />
              النتيجة
            </button>
            <button
              onClick={() => setActiveTab('console')}
              className={cn(
                'flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors',
                activeTab === 'console' 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                  : 'text-slate-600 hover:bg-slate-100'
              )}
            >
              <Code2 className="w-4 h-4" />
              الكونسول
            </button>
            {(language === 'html' || language === 'css') && (
              <button
                onClick={() => setActiveTab('preview')}
                className={cn(
                  'flex-1 px-3 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors',
                  activeTab === 'preview' 
                    ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Globe className="w-4 h-4" />
                المعاينة
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            <AnimatePresence mode="wait">
              {activeTab === 'output' && (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  {!output ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <Play className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm">اضغط "تشغيل" لرؤية النتيجة</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {output.status === 'success' ? (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <div className="flex items-center gap-2 text-emerald-700 mb-2">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">تم التنفيذ بنجاح</span>
                          </div>
                          <p className="text-xs text-emerald-600">
                            وقت التنفيذ: {output.executionTime}ms
                          </p>
                        </div>
                      ) : (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 text-red-700 mb-2">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">حدث خطأ</span>
                          </div>
                        </div>
                      )}

                      {output.output && (
                        <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-sm font-mono overflow-x-auto">
                          {output.output}
                        </pre>
                      )}

                      {output.error && (
                        <pre className="p-3 bg-red-900/10 text-red-800 rounded-lg text-sm font-mono overflow-x-auto border border-red-200">
                          {output.error}
                        </pre>
                      )}

                      {expectedOutput && output.status === 'success' && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-slate-700 mb-2">النتيجة المتوقعة:</p>
                          <pre className="p-3 bg-slate-100 rounded-lg text-sm font-mono">
                            {expectedOutput}
                          </pre>
                          
                          {output.output?.trim() === expectedOutput?.trim() ? (
                            <p className="mt-2 text-sm text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              النتيجة صحيحة! ✓
                            </p>
                          ) : (
                            <p className="mt-2 text-sm text-amber-600">
                              النتيجة غير مطابقة. حاول مرة أخرى.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'console' && (
                <motion.div
                  key="console"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  <div className="h-full flex flex-col">
                    <div className="flex-1 bg-slate-900 rounded-lg p-3 font-mono text-sm text-slate-100 overflow-auto">
                      <span className="text-slate-500">{'>'}</span> جاهز للتنفيذ...
                      {output?.output?.split('\n').map((line, i) => (
                        <div key={i} className="text-green-400">{line}</div>
                      ))}
                      {output?.error?.split('\n').map((line, i) => (
                        <div key={i} className="text-red-400">{line}</div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'preview' && (language === 'html' || language === 'css') && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="h-full"
                >
                  <iframe
                    srcDoc={generatePreview()}
                    className="w-full h-full bg-white rounded-lg border border-slate-200"
                    sandbox="allow-scripts"
                    title="Preview"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Run Button */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <button
              onClick={handleRun}
              disabled={isRunning || readOnly}
              className={cn(
                'w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2',
                'transition-all duration-200',
                isRunning 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300'
              )}
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التنفيذ...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  تشغيل الكود
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Toast */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 z-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>أحسنت! الكود يعمل بشكل صحيح</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
