'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Pause, 
  SkipForward, 
  RotateCcw, 
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Variable,
  Layers,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupportedLanguage, CodeExecutionResult } from './LiveCodeEditor';

export interface DebugState {
  lineNumber: number;
  variables: Record<string, { value: any; type: string; changed: boolean }>;
  callStack: string[];
  breakpoints: number[];
}

export interface DebugStep {
  lineNumber: number;
  variables: Record<string, { value: any; type: string; changed?: boolean }>;
  callStack: string[];
  output: string;
  explanation?: string;
}

export interface DebugModeProps {
  code: string;
  language: SupportedLanguage;
  steps: DebugStep[];
  onStepComplete?: (stepIndex: number) => void;
  className?: string;
}

export function DebugMode({ 
  code, 
  language, 
  steps,
  onStepComplete,
  className 
}: DebugModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [showVariables, setShowVariables] = useState(true);
  const [showCallStack, setShowCallStack] = useState(true);
  const [expandedVars, setExpandedVars] = useState<string[]>([]);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  
  const playIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);

  const codeLines = code.split('\n');
  const currentStepData = steps[currentStep];

  const speedDelays = {
    slow: 2000,
    normal: 1000,
    fast: 500,
  };

  // Auto-scroll to current line
  useEffect(() => {
    if (currentStepData && lineRefs.current[currentStepData.lineNumber - 1]) {
      lineRefs.current[currentStepData.lineNumber - 1]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentStep, currentStepData]);

  // Auto-play
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < steps.length - 1) {
            onStepComplete?.(prev + 1);
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, speedDelays[speed]);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, speed, steps.length, onStepComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      onStepComplete?.(currentStep + 1);
    }
  }, [currentStep, steps.length, onStepComplete]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleReset = useCallback(() => {
    setCurrentStep(0);
    setIsPlaying(false);
    onStepComplete?.(0);
  }, [onStepComplete]);

  const toggleVariableExpansion = useCallback((varName: string) => {
    setExpandedVars(prev => 
      prev.includes(varName) 
        ? prev.filter(v => v !== varName)
        : [...prev, varName]
    );
  }, []);

  const formatValue = (value: any, type: string): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (type === 'string') return `"${value}"`;
    if (type === 'array') return `[${value.join(', ')}]`;
    if (type === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className={cn('flex flex-col bg-slate-900 rounded-xl overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-400">
            <Zap className="w-5 h-5" />
            <span className="font-medium">وضع التصحيح</span>
          </div>
          <div className="h-4 w-px bg-slate-600" />
          <div className="text-sm text-slate-400">
            الخطوة {currentStep + 1} من {steps.length}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            title="إعادة"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="الخطوة السابقة"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all',
              isPlaying 
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            )}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                إيقاف
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                تشغيل
              </>
            )}
          </button>

          <button
            onClick={handleNext}
            disabled={currentStep === steps.length - 1}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            title="الخطوة التالية"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 ml-2 bg-slate-700 rounded-lg p-1">
            {(['slow', 'normal', 'fast'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={cn(
                  'px-2 py-1 text-xs rounded transition-colors',
                  speed === s 
                    ? 'bg-slate-600 text-white' 
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {s === 'slow' && 'بطيء'}
                {s === 'normal' && 'عادي'}
                {s === 'fast' && 'سريع'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Code View */}
        <div className="flex-1 flex min-w-0 bg-slate-900">
          {/* Line Numbers */}
          <div className="w-14 py-4 bg-slate-800 text-right text-xs text-slate-500 select-none">
            {codeLines.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  'px-2 leading-7',
                  currentStepData?.lineNumber === i + 1 && 'bg-emerald-500/20 text-emerald-400'
                )}
              >
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Lines */}
          <div className="flex-1 py-4 overflow-auto">
            {codeLines.map((line, i) => {
              const lineNum = i + 1;
              const isCurrentLine = currentStepData?.lineNumber === lineNum;
              const isExecuted = steps.some(s => s.lineNumber === lineNum && steps.indexOf(s) < currentStep);
              const isFuture = !isExecuted && !isCurrentLine;

              return (
                <div
                  key={i}
                  ref={el => { lineRefs.current[i] = el; }}
                  onMouseEnter={() => setHoveredLine(lineNum)}
                  onMouseLeave={() => setHoveredLine(null)}
                  className={cn(
                    'flex items-center leading-7 font-mono text-sm px-4 transition-colors',
                    isCurrentLine && 'bg-emerald-500/10',
                    isExecuted && !isCurrentLine && 'opacity-60',
                    isFuture && 'opacity-40'
                  )}
                >
                  {/* Execution Pointer */}
                  <div className="w-6 flex-shrink-0">
                    {isCurrentLine && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"
                      >
                        <ChevronRight className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                    {isExecuted && !isCurrentLine && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>

                  {/* Code */}
                  <pre className="text-slate-300">
                    {line || ' '}
                  </pre>

                  {/* Hover Tooltip */}
                  <AnimatePresence>
                    {hoveredLine === lineNum && currentStepData?.explanation && isCurrentLine && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="absolute left-full ml-4 bg-blue-600 text-white px-3 py-2 rounded-lg text-xs max-w-xs z-10"
                      >
                        {currentStepData.explanation}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>

        {/* Debug Info Panel */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
          {/* Variables Panel */}
          <div className="flex-1 border-b border-slate-700">
            <button
              onClick={() => setShowVariables(!showVariables)}
              className="w-full px-4 py-3 flex items-center justify-between text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Variable className="w-4 h-4" />
                <span className="font-medium">المتغيرات</span>
              </div>
              {showVariables ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showVariables && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-2">
                    {currentStepData?.variables && Object.entries(currentStepData.variables).length > 0 ? (
                      Object.entries(currentStepData.variables).map(([name, data]) => (
                        <div 
                          key={name}
                          className={cn(
                            'bg-slate-700/50 rounded-lg overflow-hidden',
                            data.changed && 'ring-1 ring-amber-500'
                          )}
                        >
                          <button
                            onClick={() => toggleVariableExpansion(name)}
                            className="w-full px-3 py-2 flex items-center justify-between text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-purple-400 font-mono text-sm">{name}</span>
                              <span className="text-xs text-slate-500">({data.type})</span>
                              {data.changed && (
                                <span className="text-xs text-amber-400">مُحدَّث</span>
                              )}
                            </div>
                            {data.type === 'object' || data.type === 'array' ? (
                              expandedVars.includes(name) ? 
                                <ChevronDown className="w-3 h-3 text-slate-500" /> :
                                <ChevronRight className="w-3 h-3 text-slate-500" />
                            ) : null}
                          </button>
                          
                          <div className="px-3 pb-2">
                            <code className="text-sm text-emerald-400 font-mono">
                              {formatValue(data.value, data.type)}
                            </code>
                          </div>

                          {/* Expanded view for complex types */}
                          <AnimatePresence>
                            {expandedVars.includes(name) && (data.type === 'object' || data.type === 'array') && (
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="px-3 pb-2"
                              >
                                <pre className="text-xs text-slate-400 bg-slate-800 rounded p-2 overflow-x-auto">
                                  {JSON.stringify(data.value, null, 2)}
                                </pre>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 py-4">
                        لا توجد متغيرات بعد
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Call Stack Panel */}
          <div className="h-1/3">
            <button
              onClick={() => setShowCallStack(!showCallStack)}
              className="w-full px-4 py-3 flex items-center justify-between text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                <span className="font-medium"> stack الاستدعاء</span>
              </div>
              {showCallStack ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {showCallStack && (
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: 'auto' }}
                  exit={{ height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4">
                    {currentStepData?.callStack && currentStepData.callStack.length > 0 ? (
                      <div className="space-y-1">
                        {currentStepData.callStack.map((func, i) => (
                          <div 
                            key={i}
                            className={cn(
                              'px-3 py-2 rounded-lg text-sm font-mono',
                              i === 0 
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-700/50 text-slate-400'
                            )}
                          >
                            {i === 0 && <span className="text-xs text-emerald-600 mr-2">الحالي</span>}
                            {func}()
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-4">
                        main() فقط
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Output Panel */}
          <div className="h-1/4 border-t border-slate-700">
            <div className="px-4 py-2 text-xs text-slate-500 font-medium uppercase tracking-wide">
              Output
            </div>
            <div className="px-4 pb-4 h-full">
              <div className="h-full bg-slate-900 rounded-lg p-3 font-mono text-sm text-slate-300 overflow-auto">
                {currentStepData?.output ? (
                  currentStepData.output.split('\n').map((line, i) => (
                    <div key={i} className="text-green-400">{line}</div>
                  ))
                ) : (
                  <span className="text-slate-600 italic">لا يوجد إخراج بعد...</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs text-slate-400">
            {Math.round(((currentStep + 1) / steps.length) * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
