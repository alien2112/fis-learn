'use client';

import { useState, useCallback, useRef } from 'react';
import apiClient from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Link, FileVideo, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface VideoUploadProps {
  onUploadComplete: (assetId: string, playbackId?: string) => void;
  courseId?: string;
  lessonId?: string;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'error';

interface DirectUploadResponse {
  uploadUrl: string;
  assetId: string;
  playbackId?: string;
}

export function VideoUpload({ onUploadComplete, courseId, lessonId }: VideoUploadProps) {
  const [activeTab, setActiveTab] = useState('file');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection and upload
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    setStatus('uploading');
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get direct upload URL from backend
      const uploadRes = await apiClient.post('/video/upload/direct', {
        title: title || file.name,
        description: courseId ? `Uploaded for course ${courseId}` : undefined,
      });

      const { uploadUrl, assetId: newAssetId } = uploadRes.data.data as DirectUploadResponse;
      setAssetId(newAssetId);

      // Step 2: Upload file directly to Mux
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setProgress(percentComplete);
        }
      });

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', resolve);
        xhr.addEventListener('error', reject);
        xhr.addEventListener('abort', reject);
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      setStatus('processing');
      setProgress(100);

      // Notify parent component
      onUploadComplete(newAssetId);

      // Poll for asset status (optional)
      pollAssetStatus(newAssetId);
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Upload failed';
      setError(message);
      setStatus('error');
    }
  }, [title, courseId, onUploadComplete]);

  // Handle URL import
  const handleUrlUpload = useCallback(async () => {
    if (!urlInput.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setStatus('uploading');
    setProgress(0);
    setError(null);

    try {
      const response = await apiClient.post('/video/upload/url', {
        url: urlInput,
        title: title || undefined,
        description: courseId ? `Imported for course ${courseId}` : undefined,
      });

      const { assetId: newAssetId } = response.data.data;
      setAssetId(newAssetId);
      setStatus('processing');
      setProgress(100);

      onUploadComplete(newAssetId);
      pollAssetStatus(newAssetId);
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Import failed';
      setError(message);
      setStatus('error');
    }
  }, [urlInput, title, courseId, onUploadComplete]);

  // Poll asset status
  const pollAssetStatus = async (id: string) => {
    const maxAttempts = 30;
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await apiClient.get(`/video/assets/${id}`);
        const { status: assetStatus, playbackId } = response.data.data;

        if (assetStatus === 'ready') {
          setStatus('ready');
          onUploadComplete(id, playbackId);
        } else if (assetStatus === 'errored') {
          setError('Video processing failed');
          setStatus('error');
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000); // Check every 5 seconds
        } else {
          setError('Video processing is taking longer than expected');
        }
      } catch (err) {
        // Continue polling on error
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 5000);
        }
      }
    };

    checkStatus();
  };

  // Handle file drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      handleFileUpload(file);
    } else {
      setError('Please upload a valid video file');
    }
  }, [handleFileUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'processing':
        return 'Processing video...';
      case 'ready':
        return 'Video ready!';
      case 'error':
        return 'Upload failed';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload File
            </TabsTrigger>
            <TabsTrigger value="url" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Import URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="file" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-title">Video Title (optional)</Label>
              <Input
                id="video-title"
                placeholder="Enter video title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={status === 'uploading'}
              />
            </div>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors duration-200
                ${status === 'uploading' ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={status === 'uploading'}
              />

              {status === 'uploading' ? (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
                  <Progress value={progress} className="w-full max-w-xs mx-auto" />
                </div>
              ) : status === 'processing' ? (
                <div className="space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">{getStatusMessage()}</p>
                  <p className="text-xs text-muted-foreground">This may take a few minutes</p>
                </div>
              ) : status === 'ready' ? (
                <div className="space-y-3">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500" />
                  <p className="text-sm font-medium text-green-600">Video ready!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileVideo className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MP4, MOV, AVI, or WebM (max 2GB)
                    </p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="video-title-url">Video Title (optional)</Label>
              <Input
                id="video-title-url"
                placeholder="Enter video title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={status === 'uploading'}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video-url">Video URL</Label>
              <Input
                id="video-url"
                placeholder="https://example.com/video.mp4 or YouTube URL"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={status === 'uploading'}
              />
              <p className="text-xs text-muted-foreground">
                Supports direct video URLs and YouTube links
              </p>
            </div>

            <Button
              onClick={handleUrlUpload}
              disabled={status === 'uploading' || !urlInput.trim()}
              className="w-full"
            >
              {status === 'uploading' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Import Video
                </>
              )}
            </Button>

            {status === 'processing' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing video...
              </div>
            )}

            {status === 'ready' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Video imported successfully!
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
