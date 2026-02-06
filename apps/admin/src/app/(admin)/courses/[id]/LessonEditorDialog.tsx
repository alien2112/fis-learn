'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  FileText,
  HelpCircle,
  Youtube,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  ListVideo,
  Link as LinkIcon,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';

interface LessonEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  lesson: any | null;
  sectionId: string | null;
  onSave: (data: any) => void;
}

type ContentType = 'VIDEO' | 'PDF' | 'QUIZ' | 'ASSIGNMENT';
type VideoSource = 'youtube' | 'upload' | 'stream';

interface VideoData {
  type: VideoSource;
  url: string;
  isPlaylist: boolean;
  startTime?: number;
  duration?: number;
  thumbnailUrl?: string;
}

export function LessonEditorDialog({
  isOpen,
  onClose,
  lesson,
  sectionId,
  onSave,
}: LessonEditorDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<ContentType>('VIDEO');
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [duration, setDuration] = useState('');
  
  // Video specific
  const [videoSource, setVideoSource] = useState<VideoSource>('youtube');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPlaylist, setIsPlaylist] = useState(false);
  const [previewValid, setPreviewValid] = useState<boolean | null>(null);
  const [extractedId, setExtractedId] = useState<string>('');
  
  // Thumbnail
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [thumbnailSource, setThumbnailSource] = useState<'youtube' | 'custom'>('youtube');

  // Initialize form when editing existing lesson
  useEffect(() => {
    if (lesson) {
      setTitle(lesson.title || '');
      setDescription(lesson.description || '');
      setContentType(lesson.contentType || 'VIDEO');
      setIsFreePreview(lesson.isFreePreview || false);
      setDuration(lesson.duration ? String(Math.floor(lesson.duration / 60)) : '');
      
      if (lesson.material?.youtubeUrl) {
        setVideoSource('youtube');
        setVideoUrl(lesson.material.youtubeUrl);
        setIsPlaylist(lesson.material.youtubeUrl.includes('list='));
        validateYouTubeUrl(lesson.material.youtubeUrl);
      }
      if (lesson.material?.thumbnailUrl) {
        setThumbnailUrl(lesson.material.thumbnailUrl);
        setThumbnailSource('custom');
      } else {
        setThumbnailUrl('');
        setThumbnailSource('youtube');
      }
    } else {
      // Reset for new lesson
      setTitle('');
      setDescription('');
      setContentType('VIDEO');
      setIsFreePreview(false);
      setDuration('');
      setVideoUrl('');
      setIsPlaylist(false);
      setPreviewValid(null);
      setExtractedId('');
      setThumbnailUrl('');
      setThumbnailSource('youtube');
    }
  }, [lesson, isOpen]);

  // YouTube URL validation
  const validateYouTubeUrl = (url: string): boolean => {
    if (!url) return false;
    
    // Video patterns
    const videoPatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.+&v=([a-zA-Z0-9_-]{11})/,
    ];
    
    // Playlist patterns
    const playlistPatterns = [
      /[?&]list=([a-zA-Z0-9_-]+)/,
      /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    ];
    
    // Check for video
    for (const pattern of videoPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        setExtractedId(match[1]);
        setIsPlaylist(false);
        return true;
      }
    }
    
    // Check for playlist
    for (const pattern of playlistPatterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        setExtractedId(match[1]);
        setIsPlaylist(true);
        return true;
      }
    }
    
    // Check if it's just an ID (11 chars)
    if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
      setExtractedId(url);
      setIsPlaylist(false);
      return true;
    }
    
    // Check if it's a playlist ID
    if (/^PL[a-zA-Z0-9_-]+$/.test(url)) {
      setExtractedId(url);
      setIsPlaylist(true);
      return true;
    }
    
    return false;
  };

  const handleVideoUrlChange = (url: string) => {
    setVideoUrl(url);
    const isValid = validateYouTubeUrl(url);
    setPreviewValid(isValid);
  };

  // Get YouTube thumbnail URL
  const getYouTubeThumbnail = (videoId: string): string => {
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  const handleThumbnailUrlChange = (url: string) => {
    setThumbnailUrl(url);
    setThumbnailSource('custom');
  };

  const getEmbedUrl = () => {
    if (!extractedId) return '';
    
    if (isPlaylist) {
      return `https://www.youtube-nocookie.com/embed/videoseries?list=${extractedId}`;
    }
    return `https://www.youtube-nocookie.com/embed/${extractedId}`;
  };

  const handleSave = () => {
    const videoData: VideoData | null = contentType === 'VIDEO' ? {
      type: videoSource,
      url: videoUrl,
      isPlaylist,
      duration: duration ? parseInt(duration) * 60 : undefined,
    } : null;

    onSave({
      id: lesson?.id,
      sectionId,
      title,
      description,
      contentType,
      isFreePreview,
      duration: duration ? parseInt(duration) * 60 : undefined,
      videoData,
    });
    
    onClose();
  };

  const isValid = title.trim() && (contentType !== 'VIDEO' || (videoUrl && previewValid));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {lesson ? 'تعديل الدرس' : 'إضافة درس جديد'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>عنوان الدرس *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: مقدمة في HTML"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>وصف الدرس</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="وصف مختصر لمحتوى الدرس"
                rows={2}
              />
            </div>
          </div>

          {/* Content Type */}
          <div className="space-y-2">
            <Label>نوع المحتوى</Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'VIDEO', icon: Video, label: 'فيديو' },
                { type: 'PDF', icon: FileText, label: 'PDF' },
                { type: 'QUIZ', icon: HelpCircle, label: 'اختبار' },
                { type: 'ASSIGNMENT', icon: Upload, label: 'تكليف' },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setContentType(type as ContentType)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    contentType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Video Content */}
          <AnimatePresence mode="wait">
            {contentType === 'VIDEO' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <Tabs value={videoSource} onValueChange={(v) => setVideoSource(v as VideoSource)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="youtube" className="flex items-center gap-2">
                      <Youtube className="w-4 h-4" />
                      YouTube
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      رفع مباشر
                    </TabsTrigger>
                    <TabsTrigger value="stream" className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      بث مباشر
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="youtube" className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                      <p className="text-sm text-amber-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          يمكنك استخدام فيديوهات <strong>YouTube</strong> العامة أو غير المدرجة (Unlisted).
                          الفيديوهات الخاصة (Private) لا يمكن تضمينها.
                        </span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>رابط YouTube أو معرف الفيديو/قائمة التشغيل</Label>
                        {isPlaylist && (
                          <Badge className="bg-purple-100 text-purple-700">
                            <ListVideo className="w-3 h-3 mr-1" />
                            قائمة تشغيل
                          </Badge>
                        )}
                      </div>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input
                          value={videoUrl}
                          onChange={(e) => handleVideoUrlChange(e.target.value)}
                          placeholder="https://youtube.com/watch?v=... أو معرف الفيديو"
                          className="pl-10"
                        />
                      </div>
                      
                      {/* Validation Status */}
                      {videoUrl && (
                        <div className="flex items-center gap-2">
                          {previewValid ? (
                            <span className="text-sm text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" />
                              {isPlaylist ? 'قائمة تشغيل صالحة' : 'فيديو صالح'}
                            </span>
                          ) : (
                            <span className="text-sm text-red-500 flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              رابط غير صالح
                            </span>
                          )}
                        </div>
                      )}

                      {/* Help Text */}
                      <p className="text-xs text-slate-500">
                        يقبل: روابط كاملة (youtube.com/watch?v=...,youtu.be/...), معرف الفيديو (11 حرف),
                        أو معرف قائمة التشغيل (PL...)
                      </p>
                    </div>

                    {/* Video Preview */}
                    {previewValid && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-2"
                      >
                        <Label>معاينة الفيديو</Label>
                        <div className="aspect-video bg-slate-900 rounded-lg overflow-hidden">
                          <iframe
                            src={getEmbedUrl()}
                            title="YouTube Preview"
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-slate-500">
                            <span className="font-medium">المعرف:</span> {extractedId}
                          </span>
                          <a
                            href={isPlaylist 
                              ? `https://youtube.com/playlist?list=${extractedId}`
                              : `https://youtube.com/watch?v=${extractedId}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            فتح على YouTube
                          </a>
                        </div>
                      </motion.div>
                    )}
                  </TabsContent>

                  <TabsContent value="upload" className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center">
                      <Upload className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-slate-500 mb-2">اسحب الفيديو هنا أو اختر ملف</p>
                      <Button variant="outline">اختر ملف فيديو</Button>
                      <p className="text-xs text-slate-400 mt-2">
                        MP4, MOV, AVI حتى 2GB
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="stream" className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">بث مباشر (Live Stream)</h4>
                      <p className="text-sm text-blue-600 mb-3">
                        استخدم ZegoCloud لبث محتوى مباشر للطلاب
                      </p>
                      <Button variant="outline" size="sm">
                        <Video className="w-4 h-4 mr-2" />
                        إعداد البث المباشر
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Duration & Settings */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                مدة الدرس (دقائق)
              </Label>
              <Input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30"
              />
            </div>
            
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label className="cursor-pointer">معاينة مجانية</Label>
                <p className="text-xs text-slate-500">السماح للطلاب بمشاهدة الدرس بدون اشتراك</p>
              </div>
              <Switch
                checked={isFreePreview}
                onCheckedChange={setIsFreePreview}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleSave} disabled={!isValid}>
            {lesson ? 'حفظ التغييرات' : 'إضافة الدرس'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
