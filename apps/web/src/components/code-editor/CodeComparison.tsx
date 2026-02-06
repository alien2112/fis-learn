'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GitCompare, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  ChevronLeft,
  FileCode,
  Award,
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupportedLanguage, CodeExecutionResult } from './LiveCodeEditor';

export interface CodeComparisonProps {
  studentCode: string;
  modelCode: string;
  language: SupportedLanguage;
  studentOutput: CodeExecutionResult;
  modelOutput: CodeExecutionResult;
  score: number;
  maxScore: number;
  onAcceptModel?: () => void;
  onKeepMine?: () => void;
  onRetry?: () => void;
  className?: string;
}

type DiffType = 'added' | 'removed' | 'unchanged' | 'modified';

interface DiffLine {
  type: DiffType;
  studentLine?: string;
  modelLine?: string;
  studentLineNum?: number;
  modelLineNum?: number;
}

// Simple diff algorithm
function computeDiff(studentLines: string[], modelLines: string[]): DiffLine[] {
  const diff: DiffLine[] = [];
  let studentIdx = 0;
  let modelIdx = 0;

  while (studentIdx < studentLines.length || modelIdx < modelLines.length) {
    const studentLine = studentLines[studentIdx];
    const modelLine = modelLines[modelIdx];

    if (studentIdx >= studentLines.length) {
      // Remaining model lines are additions
      diff.push({
        type: 'added',
        modelLine,
        modelLineNum: modelIdx + 1,
      });
      modelIdx++;
    } else if (modelIdx >= modelLines.length) {
      // Remaining student lines are removals
      diff.push({
        type: 'removed',
        studentLine,
        studentLineNum: studentIdx + 1,
      });
      studentIdx++;
    } else if (studentLine === modelLine) {
      // Lines match
      diff.push({
        type: 'unchanged',
        studentLine,
        modelLine,
        studentLineNum: studentIdx + 1,
        modelLineNum: modelIdx + 1,
      });
      studentIdx++;
      modelIdx++;
    } else {
      // Lines differ - check if it's a modification
      const nextStudentMatch = modelLines.indexOf(studentLine, modelIdx);
      const nextModelMatch = studentLines.indexOf(modelLine, studentIdx);

      if (nextModelMatch === -1 || (nextStudentMatch !== -1 && nextStudentMatch < nextModelMatch)) {
        // Model line was added
        diff.push({
          type: 'added',
          modelLine,
          modelLineNum: modelIdx + 1,
        });
        modelIdx++;
      } else if (nextStudentMatch === -1 || (nextModelMatch !== -1 && nextModelMatch < nextStudentMatch)) {
        // Student line was removed
        diff.push({
          type: 'removed',
          studentLine,
          studentLineNum: studentIdx + 1,
        });
        studentIdx++;
      } else {
        // Modified line
        diff.push({
          type: 'modified',
          studentLine,
          modelLine,
          studentLineNum: studentIdx + 1,
          modelLineNum: modelIdx + 1,
        });
        studentIdx++;
        modelIdx++;
      }
    }
  }

  return diff;
}

export function CodeComparison({
  studentCode,
  modelCode,
  language,
  studentOutput,
  modelOutput,
  score,
  maxScore,
  onAcceptModel,
  onKeepMine,
  onRetry,
  className,
}: CodeComparisonProps) {
  const [activeView, setActiveView] = useState<'split' | 'student' | 'model' | 'diff'>('split');
  const [showExplanation, setShowExplanation] = useState(true);

  const studentLines = useMemo(() => studentCode.split('\n'), [studentCode]);
  const modelLines = useMemo(() => modelCode.split('\n'), [modelCode]);
  const diff = useMemo(() => computeDiff(studentLines, modelLines), [studentLines, modelLines]);

  const isOutputCorrect = studentOutput.output?.trim() === modelOutput.output?.trim();
  const percentage = Math.round((score / maxScore) * 100);

  const getScoreColor = (pct: number) => {
    if (pct >= 90) return 'text-emerald-600 bg-emerald-100';
    if (pct >= 70) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (pct: number) => {
    if (pct >= 90) return 'أداء ممتاز';
    if (pct >= 70) return 'جيد';
    if (pct >= 50) return 'يحتاج تحسين';
    return 'غير مقبول';
  };

  return (
    <div className={cn('flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden', className)}>
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <GitCompare className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800">مقارنة الحلول</h2>
            </div>
            
            <div className={cn('px-3 py-1 rounded-full text-sm font-medium', getScoreColor(percentage))}>
              {score}/{maxScore} - {getScoreLabel(percentage)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">عرض:</span>
            <div className="flex bg-slate-100 rounded-lg p-1">
              {[
                { id: 'split', label: 'مقارنة' },
                { id: 'diff', label: 'الفرق' },
                { id: 'student', label: 'حلك' },
                { id: 'model', label: 'النموذج' },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setActiveView(view.id as any)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    activeView === view.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {view.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Output Comparison */}
        <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">مقارنة النتيجة:</span>
            {isOutputCorrect ? (
              <span className="text-sm text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                الناتج صحيح
              </span>
            ) : (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <XCircle className="w-4 h-4" />
                الناتج مختلف
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-slate-500 mb-1 block">حلك:</span>
              <pre className="p-2 bg-slate-50 rounded text-sm font-mono text-slate-700 overflow-x-auto">
                {studentOutput.output || '(لا يوجد إخراج)'}
              </pre>
            </div>
            <div>
              <span className="text-xs text-slate-500 mb-1 block">الحل المثالي:</span>
              <pre className="p-2 bg-emerald-50 rounded text-sm font-mono text-emerald-700 overflow-x-auto">
                {modelOutput.output || '(لا يوجد إخراج)'}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Code Views */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Split View */}
          {activeView === 'split' && (
            <motion.div
              key="split"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-2 h-full"
            >
              {/* Student Code */}
              <div className="border-l border-slate-200 flex flex-col">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <FileCode className="w-4 h-4" />
                    حلك
                  </span>
                  <span className="text-xs text-slate-500">{studentLines.length} سطر</span>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                  {studentLines.map((line, i) => (
                    <div key={i} className="flex">
                      <span className="w-8 text-slate-400 text-right mr-3 select-none">{i + 1}</span>
                      <pre className="text-slate-700">{line || ' '}</pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model Code */}
              <div className="flex flex-col">
                <div className="px-4 py-2 bg-emerald-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-sm font-medium text-emerald-700 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    الحل المثالي
                  </span>
                  <span className="text-xs text-emerald-600">{modelLines.length} سطر</span>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                  {modelLines.map((line, i) => (
                    <div key={i} className="flex">
                      <span className="w-8 text-emerald-400 text-right mr-3 select-none">{i + 1}</span>
                      <pre className="text-emerald-800">{line || ' '}</pre>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Diff View */}
          {activeView === 'diff' && (
            <motion.div
              key="diff"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-auto"
            >
              {/* Legend */}
              <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-6 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded" />
                  <span className="text-slate-600">إضافة مطلوبة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-100 border border-red-300 rounded" />
                  <span className="text-slate-600">حذف زائد</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded" />
                  <span className="text-slate-600">تعديل مقترح</span>
                </div>
              </div>

              {/* Diff Lines */}
              <div className="p-4 font-mono text-sm">
                {diff.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      'flex -mx-4 px-4 py-0.5',
                      line.type === 'added' && 'bg-emerald-50 border-l-4 border-emerald-400',
                      line.type === 'removed' && 'bg-red-50 border-l-4 border-red-400',
                      line.type === 'modified' && 'bg-amber-50 border-l-4 border-amber-400',
                      line.type === 'unchanged' && 'hover:bg-slate-50'
                    )}
                  >
                    {/* Line Numbers */}
                    <div className="flex w-16 text-xs text-slate-400 select-none">
                      <span className="w-8 text-right">{line.studentLineNum || ''}</span>
                      <span className="w-8 text-right ml-1">{line.modelLineNum || ''}</span>
                    </div>

                    {/* Change Indicator */}
                    <div className="w-6 flex-shrink-0">
                      {line.type === 'added' && <span className="text-emerald-600">+</span>}
                      {line.type === 'removed' && <span className="text-red-600">−</span>}
                      {line.type === 'modified' && <span className="text-amber-600">~</span>}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      {line.type === 'modified' ? (
                        <div className="space-y-1">
                          <div className="text-red-700">{line.studentLine}</div>
                          <div className="text-emerald-700">{line.modelLine}</div>
                        </div>
                      ) : (
                        <div className={cn(
                          line.type === 'added' && 'text-emerald-700',
                          line.type === 'removed' && 'text-red-700',
                          line.type === 'unchanged' && 'text-slate-700'
                        )}>
                          {line.studentLine || line.modelLine || ' '}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Student Only View */}
          {activeView === 'student' && (
            <motion.div
              key="student"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-auto p-4 font-mono text-sm"
            >
              {studentLines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-slate-400 text-right mr-3 select-none">{i + 1}</span>
                  <pre className="text-slate-700">{line || ' '}</pre>
                </div>
              ))}
            </motion.div>
          )}

          {/* Model Only View */}
          {activeView === 'model' && (
            <motion.div
              key="model"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full overflow-auto p-4 font-mono text-sm bg-emerald-50/50"
            >
              {modelLines.map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-emerald-400 text-right mr-3 select-none">{i + 1}</span>
                  <pre className="text-emerald-800">{line || ' '}</pre>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Explanation Panel */}
      <AnimatePresence>
        {showExplanation && percentage < 100 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="border-t border-slate-200 overflow-hidden"
          >
            <div className="p-4 bg-amber-50">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900 mb-1">ملاحظات التحسين</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    {!isOutputCorrect && (
                      <li>• الناتج لا يطابق المتوقع - تحقق من منطق الكود</li>
                    )}
                    {diff.filter(l => l.type === 'added').length > 0 && (
                      <li>• هناك {diff.filter(l => l.type === 'added').length} سطر/أسطر مفقودة في حلك</li>
                    )}
                    {diff.filter(l => l.type === 'removed').length > 0 && (
                      <li>• هناك {diff.filter(l => l.type === 'removed').length} سطر/أسطر زائدة يمكن حذفها</li>
                    )}
                    {diff.filter(l => l.type === 'modified').length > 0 && (
                      <li>• هناك {diff.filter(l => l.type === 'modified').length} سطر/أسطر تحتاج تعديلاً</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {percentage >= 90 ? (
              <>
                <span className="text-emerald-600 font-medium flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  حلك ممتاز! يمكنك الاستمرار
                </span>
              </>
            ) : percentage >= 70 ? (
              <span className="text-amber-600 font-medium">
                حلك جيد، لكن يمكن تحسينه
              </span>
            ) : (
              <span className="text-red-600 font-medium">
                يُنصح بمراجعة الحل المثالي
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRetry}
              className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg flex items-center gap-2 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              إعادة المحاولة
            </button>

            {percentage < 100 && (
              <button
                onClick={onAcceptModel}
                className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <ThumbsUp className="w-4 h-4" />
                اعتماد الحل المثالي
              </button>
            )}

            <button
              onClick={onKeepMine}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
            >
              <ThumbsUp className="w-4 h-4" />
              حفظ حلي
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
