'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Video,
  FileText,
  HelpCircle,
  ClipboardList,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Eye,
  Lock,
  Youtube,
  CheckCircle2,
  Circle,
  Layers,
  GraduationCap,
  Code,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Lesson {
  id: string;
  title: string;
  contentType: 'VIDEO' | 'PDF' | 'QUIZ' | 'ASSIGNMENT';
  isFreePreview: boolean;
  sortOrder: number;
  duration?: number;
  material?: {
    youtubeUrl?: string;
    youtubeEnabled?: boolean;
  };
  codeExercises?: any[];
}

interface Section {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  lessons: Lesson[];
}

interface CourseTreeViewProps {
  course: any;
  sections: Section[];
  onEditLesson?: (lesson: Lesson) => void;
}

const CONTENT_TYPE_CONFIG = {
  VIDEO: {
    icon: Video,
    label: 'فيديو',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  PDF: {
    icon: FileText,
    label: 'PDF',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  QUIZ: {
    icon: HelpCircle,
    label: 'اختبار',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-500',
  },
  ASSIGNMENT: {
    icon: ClipboardList,
    label: 'تكليف',
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    badge: 'bg-purple-100 text-purple-700',
    dot: 'bg-purple-500',
  },
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}د`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}س ${rem}د` : `${hrs}س`;
}

function getTotalDuration(lessons: Lesson[]): number {
  return lessons.reduce((sum, l) => sum + (l.duration || 0), 0);
}

function getTypeCounts(lessons: Lesson[]) {
  return lessons.reduce((acc, l) => {
    acc[l.contentType] = (acc[l.contentType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ─── Lesson Node ────────────────────────────────────────────────────────────
function LessonNode({
  lesson,
  index,
  isLast,
  onEdit,
}: {
  lesson: Lesson;
  index: number;
  isLast: boolean;
  onEdit?: (l: Lesson) => void;
}) {
  const cfg = CONTENT_TYPE_CONFIG[lesson.contentType];
  const Icon = cfg.icon;
  const hasYt = !!lesson.material?.youtubeUrl;
  const hasExercises = (lesson.codeExercises?.length ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="flex items-start gap-0"
    >
      {/* Connector lines */}
      <div className="flex flex-col items-center w-8 flex-shrink-0">
        {/* Vertical line from above */}
        <div className="w-px bg-slate-200 flex-1 min-h-[12px]" />
        {/* Horizontal elbow */}
        <div className="flex items-center w-full">
          <div className="w-px bg-slate-200 h-px" style={{ height: '1px' }} />
          <div className="h-px bg-slate-200 flex-1" />
        </div>
        {/* Vertical line below (if not last) */}
        {!isLast ? (
          <div className="w-px bg-slate-200 flex-1 min-h-[12px]" />
        ) : (
          <div className="flex-1" />
        )}
      </div>

      {/* Lesson card */}
      <div
        className={cn(
          'flex-1 mb-2 flex items-center gap-3 px-3 py-2 rounded-lg border transition-all group cursor-pointer',
          cfg.border,
          cfg.bg,
          'hover:shadow-sm hover:scale-[1.01]'
        )}
        onClick={() => onEdit?.(lesson)}
      >
        {/* Type icon */}
        <div className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', cfg.bg)}>
          <Icon className={cn('w-4 h-4', cfg.color)} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-medium text-slate-800 truncate">{lesson.title}</span>
            {lesson.isFreePreview && (
              <Badge className="text-[10px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-0 flex-shrink-0">
                <Eye className="w-2.5 h-2.5 mr-0.5" />
                مجاني
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn('text-[11px] font-medium', cfg.color)}>{cfg.label}</span>
            {lesson.duration ? (
              <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {formatDuration(lesson.duration)}
              </span>
            ) : null}
            {hasYt && (
              <span className="text-[11px] text-red-500 flex items-center gap-0.5">
                <Youtube className="w-2.5 h-2.5" />
                YouTube
              </span>
            )}
            {hasExercises && (
              <span className="text-[11px] text-indigo-500 flex items-center gap-0.5">
                <Code className="w-2.5 h-2.5" />
                {lesson.codeExercises!.length} تمرين
              </span>
            )}
          </div>
        </div>

        {/* Order badge */}
        <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
          <span className="text-[10px] font-bold text-slate-500">{lesson.sortOrder}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section Node ────────────────────────────────────────────────────────────
function SectionNode({
  section,
  index,
  isLast,
  onEditLesson,
}: {
  section: Section;
  index: number;
  isLast: boolean;
  onEditLesson?: (l: Lesson) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const totalDur = getTotalDuration(section.lessons);
  const typeCounts = getTypeCounts(section.lessons);

  const sectionColors = [
    { border: 'border-blue-300', bg: 'bg-blue-600', light: 'bg-blue-50', text: 'text-blue-700' },
    { border: 'border-violet-300', bg: 'bg-violet-600', light: 'bg-violet-50', text: 'text-violet-700' },
    { border: 'border-emerald-300', bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-700' },
    { border: 'border-amber-300', bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700' },
    { border: 'border-rose-300', bg: 'bg-rose-600', light: 'bg-rose-50', text: 'text-rose-700' },
    { border: 'border-cyan-300', bg: 'bg-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-700' },
  ];
  const clr = sectionColors[index % sectionColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex items-start gap-0"
    >
      {/* Left connector to root */}
      <div className="flex flex-col items-center w-6 flex-shrink-0 mt-5">
        <div className="w-px bg-slate-300 flex-1 min-h-[12px]" />
        <div className="h-px bg-slate-300 w-full" />
        {!isLast && <div className="w-px bg-slate-300 flex-1 min-h-[12px]" />}
      </div>

      {/* Section content */}
      <div className="flex-1 mb-4">
        {/* Section header */}
        <div
          className={cn(
            'flex items-center justify-between px-4 py-3 rounded-xl border-2 cursor-pointer transition-all',
            'hover:shadow-md',
            clr.border, clr.light
          )}
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3">
            {/* Section number pill */}
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0', clr.bg)}>
              {section.sortOrder}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn('font-semibold text-slate-800')}>{section.title}</span>
                {section.description && (
                  <span className="text-xs text-slate-500 hidden md:inline">— {section.description}</span>
                )}
              </div>
              {/* Type summary chips */}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {Object.entries(typeCounts).map(([type, count]) => {
                  const c = CONTENT_TYPE_CONFIG[type as keyof typeof CONTENT_TYPE_CONFIG];
                  const I = c?.icon;
                  return I ? (
                    <span key={type} className={cn('inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium', c.badge)}>
                      <I className="w-2.5 h-2.5" />
                      {count} {c.label}
                    </span>
                  ) : null;
                })}
                {totalDur > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDuration(totalDur)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="secondary" className="text-xs">
              {section.lessons.length} درس
            </Badge>
            <div className={cn('w-6 h-6 rounded-md flex items-center justify-center transition-transform', expanded && 'rotate-0')}>
              {expanded
                ? <ChevronDown className={cn('w-4 h-4', clr.text)} />
                : <ChevronRight className={cn('w-4 h-4', clr.text)} />
              }
            </div>
          </div>
        </div>

        {/* Lessons tree */}
        <AnimatePresence>
          {expanded && section.lessons.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1 ml-6"
            >
              {section.lessons
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((lesson, i) => (
                  <LessonNode
                    key={lesson.id}
                    lesson={lesson}
                    index={i}
                    isLast={i === section.lessons.length - 1}
                    onEdit={onEditLesson}
                  />
                ))}
            </motion.div>
          )}
          {expanded && section.lessons.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="ml-6 mt-2 py-4 border border-dashed border-slate-200 rounded-lg text-center"
            >
              <p className="text-xs text-slate-400">لا توجد دروس في هذا القسم</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main Tree View ──────────────────────────────────────────────────────────
export function CourseTreeView({ course, sections, onEditLesson }: CourseTreeViewProps) {
  const allLessons = sections.flatMap(s => s.lessons);
  const totalDuration = getTotalDuration(allLessons);
  const freeCount = allLessons.filter(l => l.isFreePreview).length;
  const typeCounts = getTypeCounts(allLessons);

  const levelConfig = {
    BEGINNER: { label: 'مبتدئ', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    INTERMEDIATE: { label: 'متوسط', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    ADVANCED: { label: 'متقدم', color: 'text-red-600 bg-red-50 border-red-200' },
  };
  const lvl = levelConfig[course?.level as keyof typeof levelConfig] ?? levelConfig.BEGINNER;

  if (sections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <BookOpen className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-lg font-medium">لا يوجد محتوى بعد</p>
        <p className="text-sm mt-1">أضف أقساماً ودروساً من تبويب "المحتوى"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Course Root Node ── */}
      <div className="relative">
        {/* Root card */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">{course?.title}</h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge className={cn('border text-xs font-medium', lvl.color)}>
                    {lvl.label}
                  </Badge>
                  {course?.pricingModel === 'FREE' && (
                    <Badge className="bg-emerald-500 text-white border-0 text-xs">مجاني</Badge>
                  )}
                  {course?.pricingModel === 'PAID' && (
                    <Badge className="bg-amber-500 text-white border-0 text-xs">مدفوع</Badge>
                  )}
                  <span className="text-white/60 text-xs">{course?.status}</span>
                </div>
              </div>
            </div>
            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0 text-center">
              <div className="bg-white/10 rounded-xl px-3 py-2">
                <p className="text-2xl font-bold">{sections.length}</p>
                <p className="text-xs text-white/70">قسم</p>
              </div>
              <div className="bg-white/10 rounded-xl px-3 py-2">
                <p className="text-2xl font-bold">{allLessons.length}</p>
                <p className="text-xs text-white/70">درس</p>
              </div>
              {totalDuration > 0 && (
                <div className="bg-white/10 rounded-xl px-3 py-2">
                  <p className="text-lg font-bold">{formatDuration(totalDuration)}</p>
                  <p className="text-xs text-white/70">إجمالي</p>
                </div>
              )}
              {freeCount > 0 && (
                <div className="bg-emerald-500/20 rounded-xl px-3 py-2">
                  <p className="text-lg font-bold text-emerald-300">{freeCount}</p>
                  <p className="text-xs text-white/70">مجانية</p>
                </div>
              )}
            </div>
          </div>

          {/* Content type breakdown bar */}
          <div className="mt-5">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-3.5 h-3.5 text-white/60" />
              <span className="text-xs text-white/60">توزيع المحتوى</span>
            </div>
            <div className="flex gap-1 h-2 rounded-full overflow-hidden">
              {Object.entries(typeCounts).map(([type, count]) => {
                const pct = Math.round((count / allLessons.length) * 100);
                const colors = {
                  VIDEO: 'bg-blue-400',
                  PDF: 'bg-emerald-400',
                  QUIZ: 'bg-amber-400',
                  ASSIGNMENT: 'bg-purple-400',
                };
                return (
                  <div
                    key={type}
                    className={cn('rounded-full', colors[type as keyof typeof colors] || 'bg-slate-400')}
                    style={{ width: `${pct}%` }}
                    title={`${type}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {Object.entries(typeCounts).map(([type, count]) => {
                const cfg = CONTENT_TYPE_CONFIG[type as keyof typeof CONTENT_TYPE_CONFIG];
                const Icon = cfg?.icon;
                return Icon ? (
                  <span key={type} className={cn('flex items-center gap-1 text-[11px]', cfg.badge, 'px-2 py-0.5 rounded-full bg-white/10 text-white/80')}>
                    <Icon className="w-3 h-3" />
                    {count} {cfg.label}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </div>

        {/* Root → sections connector */}
        <div className="flex justify-center">
          <div className="w-px h-6 bg-slate-300" />
        </div>

        {/* Section branch container */}
        <div className="border-r-2 border-slate-200 mr-3 pr-0">
          {sections
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((section, i) => (
              <SectionNode
                key={section.id}
                section={section}
                index={i}
                isLast={i === sections.length - 1}
                onEditLesson={onEditLesson}
              />
            ))}
        </div>

        {/* End node */}
        <div className="flex justify-start gap-3 items-center mt-2 ml-4">
          <div className="w-px h-4 bg-slate-200 ml-2.5" />
        </div>
        <div className="ml-3 flex items-center gap-3 py-3 px-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl">
          <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">إتمام الكورس</p>
            <p className="text-xs text-amber-600">
              {allLessons.length} درس • {sections.length} أقسام
              {totalDuration > 0 && ` • ${formatDuration(totalDuration)} محتوى`}
            </p>
          </div>
          <Badge className="ml-auto bg-amber-100 text-amber-700 border-amber-200 text-xs">
            شهادة إتمام
          </Badge>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
        <span className="text-xs text-slate-400 flex items-center gap-1 mr-1">دليل:</span>
        {Object.entries(CONTENT_TYPE_CONFIG).map(([type, cfg]) => {
          const Icon = cfg.icon;
          return (
            <span key={type} className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-full border', cfg.badge, cfg.border)}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
          );
        })}
        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Eye className="w-3 h-3" />
          معاينة مجانية
        </span>
      </div>
    </div>
  );
}
