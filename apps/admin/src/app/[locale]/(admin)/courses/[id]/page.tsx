'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { coursesApi } from '@/lib/api/courses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Save, 
  BookOpen, 
  Video, 
  FileText, 
  Plus, 
  GripVertical,
  Play,
  Youtube,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink
} from 'lucide-react';
import { LessonEditorDialog } from './LessonEditorDialog';
import { CourseTreeView } from './CourseTreeView';

interface Section {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  contentType: 'VIDEO' | 'PDF' | 'QUIZ' | 'ASSIGNMENT';
  isFreePreview: boolean;
  sortOrder: number;
  duration?: number;
  material?: {
    id: string;
    youtubeUrl?: string;
    youtubeEnabled?: boolean;
    fileUrl?: string;
    videoAssetId?: string;
  };
}

export default function CourseEditPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const courseId = params.id as string;

  const [activeTab, setActiveTab] = useState('content');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesApi.getById(courseId),
    enabled: !!courseId,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => coursesApi.update(courseId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  const addSectionMutation = useMutation({
    mutationFn: (title: string) => coursesApi.createSection(courseId, { title, sortOrder: (course as any)?.sections?.length + 1 || 1 }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  const deleteSectionMutation = useMutation({
    mutationFn: (sectionId: string) => coursesApi.deleteSection(sectionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  const addLessonMutation = useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: any }) => coursesApi.createLesson(sectionId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: string; data: any }) => coursesApi.updateLesson(lessonId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: string) => coursesApi.deleteLesson(lessonId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['course', courseId] }),
  });

  // Sections come from the API via the course query
  const sections: Section[] = (course as any)?.sections || [];

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const handleAddLesson = (sectionId: string) => {
    setEditingSectionId(sectionId);
    setEditingLesson(null);
    setIsLessonDialogOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setIsLessonDialogOpen(true);
  };

  const handleSaveLesson = (lessonData: any) => {
    if (editingLesson) {
      updateLessonMutation.mutate({ lessonId: editingLesson.id, data: lessonData });
    } else if (editingSectionId) {
      addLessonMutation.mutate({ sectionId: editingSectionId, data: lessonData });
    }
    setIsLessonDialogOpen(false);
    setEditingLesson(null);
  };

  const handleDeleteLesson = (lessonId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الدرس؟')) {
      deleteLessonMutation.mutate(lessonId);
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return <Video className="w-4 h-4" />;
      case 'PDF': return <FileText className="w-4 h-4" />;
      case 'QUIZ': return <BookOpen className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'VIDEO': return 'فيديو';
      case 'PDF': return 'PDF';
      case 'QUIZ': return 'اختبار';
      case 'ASSIGNMENT': return 'تكليف';
      default: return type;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => router.push('/courses')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">تعديل الكورس</h1>
            <p className="text-sm text-slate-500">{course?.title}</p>
          </div>
        </div>
        <Button onClick={() => updateMutation.mutate(course)} disabled={updateMutation.isPending}>
          <Save className="w-4 h-4 mr-2" />
          {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-[520px]">
          <TabsTrigger value="details">التفاصيل</TabsTrigger>
          <TabsTrigger value="content">المحتوى</TabsTrigger>
          <TabsTrigger value="tree">شجرة الكورس</TabsTrigger>
          <TabsTrigger value="settings">الإعدادات</TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>معلومات الكورس</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>عنوان الكورس</Label>
                  <Input defaultValue={course?.title} placeholder="أدخل عنوان الكورس" />
                </div>
                <div className="space-y-2">
                  <Label>التصنيف</Label>
                  <Select defaultValue={course?.categoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر التصنيف" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cat1">تصنيف 1</SelectItem>
                      <SelectItem value="cat2">تصنيف 2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>وصف الكورس</Label>
                <Textarea 
                  defaultValue={course?.description} 
                  placeholder="وصف تفصيلي للكورس"
                  rows={4}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>المستوى</Label>
                  <Select defaultValue={course?.level}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BEGINNER">مبتدئ</SelectItem>
                      <SelectItem value="INTERMEDIATE">متوسط</SelectItem>
                      <SelectItem value="ADVANCED">متقدم</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>نموذج التسعير</Label>
                  <Select defaultValue={course?.pricingModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FREE">مجاني</SelectItem>
                      <SelectItem value="PAID">مدفوع</SelectItem>
                      <SelectItem value="ACCESS_CODE_ONLY">كود دخول</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>السعر ($)</Label>
                  <Input 
                    type="number" 
                    defaultValue={course?.price} 
                    disabled={course?.pricingModel === 'FREE'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Tab - Lessons & Sections */}
        <TabsContent value="content" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>الأقسام والدروس</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const title = prompt('اسم القسم الجديد:');
                  if (title?.trim()) addSectionMutation.mutate(title.trim());
                }}
                disabled={addSectionMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                إضافة قسم
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {sections.map((section) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  {/* Section Header */}
                  <div 
                    className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-slate-400" />
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                      <div>
                        <h3 className="font-medium text-slate-800">{section.title}</h3>
                        {section.description && (
                          <p className="text-xs text-slate-500">{section.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {section.lessons.length} درس
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddLesson(section.id);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        إضافة درس
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('حذف هذا القسم وجميع دروسه؟')) {
                            deleteSectionMutation.mutate(section.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Lessons List */}
                  {expandedSections.has(section.id) && (
                    <div className="divide-y divide-slate-100">
                      {section.lessons.map((lesson, index) => (
                        <div 
                          key={lesson.id}
                          className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-3">
                            <GripVertical className="w-4 h-4 text-slate-300" />
                            <span className="text-sm text-slate-400 w-6">{index + 1}</span>
                            <div className="flex items-center gap-2">
                              {getContentTypeIcon(lesson.contentType)}
                              <span className="font-medium text-slate-700">{lesson.title}</span>
                              {lesson.isFreePreview && (
                                <Badge variant="outline" className="text-xs">
                                  معاينة مجانية
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {/* Video indicators */}
                            <div className="flex items-center gap-2">
                              {lesson.material?.youtubeUrl && (
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
                                  <Youtube className="w-3 h-3 mr-1" />
                                  YouTube
                                </Badge>
                              )}
                              {lesson.duration && (
                                <span className="text-sm text-slate-500 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatDuration(lesson.duration)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditLesson(lesson)}
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {section.lessons.length === 0 && (
                        <div className="px-4 py-8 text-center text-slate-400">
                          <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                          <p>لا توجد دروس في هذا القسم</p>
                          <Button 
                            variant="link" 
                            onClick={() => handleAddLesson(section.id)}
                          >
                            إضافة أول درس
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}

              {sections.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-slate-500 mb-4">لا توجد أقسام في هذا الكورس</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    إضافة قسم جديد
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tree Tab */}
        <TabsContent value="tree" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">شجرة الكورس</h2>
              <p className="text-sm text-slate-500">خريطة بصرية كاملة لبنية الكورس والمحتوى</p>
            </div>
          </div>
          <CourseTreeView
            course={course}
            sections={sections}
            onEditLesson={handleEditLesson}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>إعدادات الكورس</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">كورس مميز</Label>
                  <p className="text-sm text-slate-500">عرض في الصفحة الرئيسية</p>
                </div>
                <Switch defaultChecked={course?.isFeatured} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">السماح بالتعليقات</Label>
                  <p className="text-sm text-slate-500">الطلاب يمكنهم إضافة تعليقات</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">شهادة إتمام</Label>
                  <p className="text-sm text-slate-500">إصدار شهادة عند اكتمال الكورس</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Lesson Editor Dialog */}
      <LessonEditorDialog
        isOpen={isLessonDialogOpen}
        onClose={() => {
          setIsLessonDialogOpen(false);
          setEditingLesson(null);
        }}
        lesson={editingLesson}
        sectionId={editingSectionId}
        onSave={handleSaveLesson}
      />
    </div>
  );
}
