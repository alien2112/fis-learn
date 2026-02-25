'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ConnectionBanner } from '@/components/community/ConnectionBanner';
import { ChannelList } from '@/components/community/ChannelList';
import { MessageComposer } from '@/components/community/MessageComposer';
import { MessageItem, CommunityMessageWithDelivery } from '@/components/community/MessageItem';
import { ThreadPanel } from '@/components/community/ThreadPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { communityApi, CommunityChannel, CommunityMessage } from '@/lib/api/community';
import { createCommunitySocket } from '@/lib/realtime/community-socket';
import { useAuth } from '@/contexts/auth-context';
import { Pin, MessageSquare, Info, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function CourseCommunityPage() {
  const t = useTranslations('community');
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const params = useParams();
  const slug = params?.slug as string;
  const { user, isLoading: isAuthLoading } = useAuth();

  const [course, setCourse] = useState<any | null>(null);
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<CommunityChannel | null>(null);
  const [messages, setMessages] = useState<CommunityMessageWithDelivery[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [threadParent, setThreadParent] = useState<CommunityMessageWithDelivery | null>(null);
  const [threadMessages, setThreadMessages] = useState<CommunityMessageWithDelivery[]>([]);
  const [threadCursor, setThreadCursor] = useState<string | null>(null);
  const [isThreadLoading, setIsThreadLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const socketRef = useRef<ReturnType<typeof createCommunitySocket> | null>(null);
  const activeChannelRef = useRef<string | null>(null);
  const threadParentRef = useRef<string | null>(null);
  // Cache messages per channel to avoid refetching when switching channels
  const channelCacheRef = useRef<Map<string, { messages: CommunityMessageWithDelivery[]; cursor: string | null }>>(new Map());
  // Timeouts for socket send acks; clear when ack or community:message received
  const sendAckTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const sendPendingRef = useRef<Map<string, { body: string; parentId?: string }>>(new Map());
  const failedRecoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const canModerate = user ? ['INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'].includes(user.role) : false;
  const channelType = activeChannel?.type ?? 'DISCUSSION';
  const isChannelLocked = !!activeChannel?.isLocked && !canModerate;
  const isThreadLocked = !!threadParent?.isLocked;
  const canLockThread = canModerate && channelType !== 'ANNOUNCEMENTS';

  useEffect(() => {
    activeChannelRef.current = activeChannel?.id ?? null;
  }, [activeChannel]);

  useEffect(() => {
    threadParentRef.current = threadParent?.id ?? null;
  }, [threadParent]);

  useEffect(() => {
    if (!slug) return;
    const loadCourse = async () => {
      try {
        const data = await communityApi.getCourseBySlug(slug);
        setCourse(data);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : t('unavailable_title'));
      }
    };

    loadCourse();
  }, [slug, t]);

  useEffect(() => {
    if (!course || !user) return;
    const loadChannels = async () => {
      try {
        const data = await communityApi.listChannels(course.id);
        setChannels(data);
        setActiveChannel(data[0] || null);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : t('no_channels'));
      }
    };

    loadChannels();
  }, [course, user, t]);

  const loadMessages = useCallback(async (channelId: string, cursor?: string, options?: { forceRefresh?: boolean }) => {
    const forceRefresh = options?.forceRefresh === true;
    // Serve from cache on first load (no cursor = initial load) unless forceRefresh
    if (!cursor && !forceRefresh) {
      const cached = channelCacheRef.current.get(channelId);
      if (cached) {
        setMessages(cached.messages);
        setNextCursor(cached.cursor);
        return;
      }
    }

    setIsLoadingMessages(true);
    try {
      const page = await communityApi.listMessages(channelId, { cursor, limit: 30 });
      setMessages((prev) => {
        const next = cursor ? [...prev, ...page.data] : page.data;
        // Update cache
        channelCacheRef.current.set(channelId, { messages: next, cursor: page.nextCursor });
        return next;
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t('errors.load_messages'));
    } finally {
      setIsLoadingMessages(false);
    }
  }, [t]);

  const scheduleFailedRecoveryRefetch = useCallback(() => {
    if (failedRecoveryTimeoutRef.current) return;
    failedRecoveryTimeoutRef.current = setTimeout(() => {
      failedRecoveryTimeoutRef.current = null;
      const ch = activeChannelRef.current;
      if (ch) loadMessages(ch, undefined, { forceRefresh: true });
    }, 2500);
  }, [loadMessages]);

  const loadThreadMessages = useCallback(async (parentId: string, cursor?: string) => {
    const channelId = activeChannelRef.current;
    if (!channelId) return;
    setIsThreadLoading(true);
    try {
      const page = await communityApi.listMessages(channelId, {
        parentId,
        cursor,
        limit: 30,
      });
      setThreadMessages((prev) => (cursor ? [...prev, ...page.data] : page.data));
      setThreadCursor(page.nextCursor);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t('errors.load_thread'));
    } finally {
      setIsThreadLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!activeChannel) return;
    setThreadParent(null);
    setThreadMessages([]);
    // Only clear messages if we have no cache for this channel (avoids blank flash)
    if (!channelCacheRef.current.has(activeChannel.id)) {
      setMessages([]);
      setNextCursor(null);
    }
    loadMessages(activeChannel.id);
  }, [activeChannel?.id, loadMessages]);

  useEffect(() => {
    if (!threadParent) return;
    setThreadMessages([]);
    setThreadCursor(null);
    loadThreadMessages(threadParent.id);
  }, [threadParent?.id, loadThreadMessages]);

  useEffect(() => {
    if (!user) return;
    const socket = createCommunitySocket();
    socketRef.current = socket;

    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('connect_error', () => setConnectionStatus('connecting'));

    socket.on('community:message', ({ message, clientId }: { message: CommunityMessage; clientId?: string }) => {
      if (!message || message.channelId !== activeChannelRef.current) {
        return;
      }
      // Clear ack timeout when we receive our own message (server confirmed)
      if (clientId) {
        const tid = sendAckTimeoutsRef.current.get(clientId);
        if (tid) {
          clearTimeout(tid);
          sendAckTimeoutsRef.current.delete(clientId);
          sendPendingRef.current.delete(clientId);
        }
      }

      if (message.parentId) {
        if (threadParentRef.current !== message.parentId) {
          return;
        }
        setThreadMessages((prev) => mergeMessage(prev, message, clientId));
      } else {
        setMessages((prev) => {
          const next = mergeMessage(prev, message, clientId);
          // Keep channel cache in sync with live messages
          const cached = channelCacheRef.current.get(message.channelId);
          if (cached) {
            channelCacheRef.current.set(message.channelId, { ...cached, messages: next });
          }
          return next;
        });
      }
    });

    socket.on('community:message:update', ({ message }: { message: CommunityMessage }) => {
      if (!message || message.channelId !== activeChannelRef.current) return;
      setMessages((prev) => updateMessage(prev, message));
      setThreadMessages((prev) => updateMessage(prev, message));
      setThreadParent((prev) => (prev && prev.id === message.id ? { ...prev, ...message } : prev));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      sendAckTimeoutsRef.current.forEach((tid) => clearTimeout(tid));
      sendAckTimeoutsRef.current.clear();
      sendPendingRef.current.clear();
      if (failedRecoveryTimeoutRef.current) {
        clearTimeout(failedRecoveryTimeoutRef.current);
        failedRecoveryTimeoutRef.current = null;
      }
    };
  }, [user?.id]);

  useEffect(() => {
    if (!course || !activeChannel || !socketRef.current) return;
    socketRef.current.emit('community:join', {
      courseId: course.id,
      channelId: activeChannel.id,
    });
  }, [course?.id, activeChannel?.id]);

  const SEND_ACK_TIMEOUT_MS = 8000;

  const sendMessage = useCallback(async (body: string) => {
    if (!activeChannel || !user) return;

    const clientId = `client-${Date.now()}`;
    const optimisticMessage: CommunityMessageWithDelivery = {
      id: clientId,
      courseId: course.id,
      channelId: activeChannel.id,
      author: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      body,
      status: 'ACTIVE',
      isPinned: false,
      isAnswer: false,
      isLocked: false,
      parentId: null,
      clientId,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending',
      _count: { replies: 0 },
    };

    setMessages((prev) => [optimisticMessage, ...prev]);

    if (socketRef.current?.connected) {
      sendPendingRef.current.set(clientId, { body, parentId: undefined });
      const timeoutId = setTimeout(async () => {
        sendAckTimeoutsRef.current.delete(clientId);
        sendPendingRef.current.delete(clientId);
        // Fallback: sync via REST (idempotent by clientId)
        try {
          const created = await communityApi.createMessage(activeChannel.id, body, undefined, clientId);
          setMessages((prev) => replaceMessage(prev, clientId, created));
        } catch {
          setMessages((prev) => markFailed(prev, clientId));
          scheduleFailedRecoveryRefetch();
        }
      }, SEND_ACK_TIMEOUT_MS);
      sendAckTimeoutsRef.current.set(clientId, timeoutId);

      socketRef.current.emit(
        'community:send',
        {
          channelId: activeChannel.id,
          body,
          clientId,
        },
        (ack: { ok?: boolean; error?: string; message?: CommunityMessage } | undefined) => {
          if (ack && ack.ok === true) {
            const tid = sendAckTimeoutsRef.current.get(clientId);
            if (tid) {
              clearTimeout(tid);
              sendAckTimeoutsRef.current.delete(clientId);
              sendPendingRef.current.delete(clientId);
            }
            if (ack.message) {
              setMessages((prev) => {
                const next = replaceMessage(prev, clientId, ack.message!);
                const cached = channelCacheRef.current.get(activeChannel.id);
                if (cached) channelCacheRef.current.set(activeChannel.id, { ...cached, messages: next });
                return next;
              });
            }
            return;
          }
          if (ack && ack.ok === false) {
            const tid = sendAckTimeoutsRef.current.get(clientId);
            if (tid) {
              clearTimeout(tid);
              sendAckTimeoutsRef.current.delete(clientId);
              sendPendingRef.current.delete(clientId);
            }
            setMessages((prev) => markFailed(prev, clientId));
            scheduleFailedRecoveryRefetch();
            return;
          }
          // ack missing or malformed – don't mark failed; let REST fallback sync
        }
      );
      return;
    }

    try {
      const created = await communityApi.createMessage(activeChannel.id, body, undefined, clientId);
      setMessages((prev) => replaceMessage(prev, clientId, created));
    } catch (error) {
      setMessages((prev) => markFailed(prev, clientId));
      scheduleFailedRecoveryRefetch();
    }
  }, [activeChannel, course, user, scheduleFailedRecoveryRefetch]);

  const sendReply = useCallback(async (body: string) => {
    if (!threadParent || !activeChannel || !user) return;

    const clientId = `client-${Date.now()}`;
    const optimisticReply: CommunityMessageWithDelivery = {
      id: clientId,
      courseId: course.id,
      channelId: activeChannel.id,
      author: {
        id: user.id,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      body,
      status: 'ACTIVE',
      isPinned: false,
      isAnswer: false,
      isLocked: false,
      parentId: threadParent.id,
      clientId,
      createdAt: new Date().toISOString(),
      deliveryStatus: 'sending',
    };

    setThreadMessages((prev) => [optimisticReply, ...prev]);

    if (socketRef.current?.connected) {
      sendPendingRef.current.set(clientId, { body, parentId: threadParent.id });
      const timeoutId = setTimeout(async () => {
        sendAckTimeoutsRef.current.delete(clientId);
        sendPendingRef.current.delete(clientId);
        try {
          const created = await communityApi.createMessage(activeChannel.id, body, threadParent.id, clientId);
          setThreadMessages((prev) => replaceMessage(prev, clientId, created));
        } catch {
          setThreadMessages((prev) => markFailed(prev, clientId));
          scheduleFailedRecoveryRefetch();
        }
      }, SEND_ACK_TIMEOUT_MS);
      sendAckTimeoutsRef.current.set(clientId, timeoutId);

      socketRef.current.emit(
        'community:send',
        {
          channelId: activeChannel.id,
          body,
          parentId: threadParent.id,
          clientId,
        },
        (ack: { ok?: boolean; error?: string; message?: CommunityMessage } | undefined) => {
          if (ack && ack.ok === true) {
            const tid = sendAckTimeoutsRef.current.get(clientId);
            if (tid) {
              clearTimeout(tid);
              sendAckTimeoutsRef.current.delete(clientId);
              sendPendingRef.current.delete(clientId);
            }
            if (ack.message) {
              setThreadMessages((prev) => replaceMessage(prev, clientId, ack.message!));
            }
            return;
          }
          if (ack && ack.ok === false) {
            const tid = sendAckTimeoutsRef.current.get(clientId);
            if (tid) {
              clearTimeout(tid);
              sendAckTimeoutsRef.current.delete(clientId);
              sendPendingRef.current.delete(clientId);
            }
            setThreadMessages((prev) => markFailed(prev, clientId));
            scheduleFailedRecoveryRefetch();
            return;
          }
          // ack missing or malformed – don't mark failed; let REST fallback sync
        }
      );
      return;
    }

    try {
      const created = await communityApi.createMessage(activeChannel.id, body, threadParent.id, clientId);
      setThreadMessages((prev) => replaceMessage(prev, clientId, created));
    } catch (error) {
      setThreadMessages((prev) => markFailed(prev, clientId));
      scheduleFailedRecoveryRefetch();
    }
  }, [activeChannel, course, threadParent, user, scheduleFailedRecoveryRefetch]);

  const handlePin = useCallback(async (message: CommunityMessageWithDelivery) => {
    try {
      await communityApi.pinMessage(message.id, !message.isPinned);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t('errors.update_message'));
    }
  }, [t]);

  const handleMarkAnswer = useCallback(async (message: CommunityMessageWithDelivery) => {
    try {
      await communityApi.markAnswer(message.id, !message.isAnswer);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t('errors.update_message'));
    }
  }, [t]);

  const handleLock = useCallback(async (message: CommunityMessageWithDelivery) => {
    try {
      const updated = await communityApi.lockThread(message.id, !message.isLocked);
      setMessages((prev) => updateMessage(prev, updated));
      setThreadMessages((prev) => updateMessage(prev, updated));
      setThreadParent((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t('errors.update_message'));
    }
  }, [t]);

  const handleReport = useCallback(async (message: CommunityMessageWithDelivery) => {
    try {
      await communityApi.reportMessage(message.id);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t('errors.report_message'));
    }
  }, [t]);

  const handleRemove = useCallback(async (message: CommunityMessageWithDelivery) => {
    try {
      await communityApi.removeMessage(message.id);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : t('errors.remove_message'));
    }
  }, [t]);

  const handleRetryMessage = useCallback(
    async (message: CommunityMessageWithDelivery) => {
      if (!activeChannel || !message.clientId || message.deliveryStatus !== 'failed') return;
      try {
        const created = await communityApi.createMessage(
          activeChannel.id,
          message.body,
          message.parentId ?? undefined,
          message.clientId,
        );
        if (message.parentId) {
          setThreadMessages((prev) => replaceMessage(prev, message.clientId!, created));
        } else {
          setMessages((prev) => replaceMessage(prev, message.clientId, created));
        }
      } catch {
        scheduleFailedRecoveryRefetch();
      }
    },
    [activeChannel, scheduleFailedRecoveryRefetch],
  );

  const pinnedMessages = useMemo(
    () => messages.filter((message) => message.isPinned && !message.parentId),
    [messages],
  );

  const displayMessages = useMemo(
    () => messages.filter((message) => !message.isPinned || message.parentId),
    [messages],
  );
  const threadComposerDisabled = isChannelLocked || isThreadLocked;
  const threadHelper = isThreadLocked
    ? t('locked_channel_helper')
    : isChannelLocked
      ? t('locked_channel_helper')
      : undefined;

  if (isAuthLoading) {
    return (
      <div className="container py-16 space-y-8">
        <Skeleton className="h-12 w-64 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[240px_1fr_360px]">
          <Skeleton className="h-96 w-full rounded-[2rem]" />
          <Skeleton className="h-[600px] w-full rounded-[2rem]" />
          <Skeleton className="h-96 w-full rounded-[2rem]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-24 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8 border-dashed shadow-none bg-muted/20">
          <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border text-primary">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl mb-2">{t('sign_in_title')}</CardTitle>
          <CardDescription className="mb-6 text-base">{t('sign_in_desc')}</CardDescription>
          <Button asChild size="lg" className="rounded-full w-full shadow-lg shadow-primary/20">
            <Link href="/login">{t('login_button')}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="container py-24 flex items-center justify-center px-4">
        <Card className="max-w-md w-full text-center p-8 border-destructive/20 bg-destructive/5 shadow-none rounded-[2rem]">
          <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border text-destructive">
            <Info className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl mb-2 text-destructive">{t('unavailable_title')}</CardTitle>
          <CardDescription className="mb-6 text-base font-medium">{pageError}</CardDescription>
          <Button asChild variant="outline" className="rounded-full w-full border-2 border-destructive/20 hover:bg-destructive hover:text-white">
            <Link href="/courses">{isRTL ? "الرجوع للكورسات" : "Back to Courses"}</Link>
          </Button>
        </Card>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container py-16 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Community Header */}
      <section className="bg-primary/5 py-10 md:py-14 mb-8 relative overflow-hidden border-b border-primary/10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="container px-4 relative z-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className={cn(isRTL ? "text-right" : "text-left")}>
              <Link href={`/courses/${slug}`} className="inline-flex items-center text-xs font-black uppercase tracking-widest text-primary mb-4 hover:opacity-70 transition-opacity">
                <ArrowLeft className={cn("w-3 h-3 mr-2", isRTL && "rotate-180 ml-2 mr-0")} />
                {isRTL ? "الرجوع للكورس" : "Back to Course"}
              </Link>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight mb-2">{t('title')}</h1>
              <p className="text-muted-foreground font-bold text-lg opacity-80">{course?.title}</p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="uppercase text-[10px] font-black tracking-[0.2em] px-4 py-1.5 bg-primary/10 text-primary border-none shadow-sm">
                {t(`channel_types.${channelType.toLowerCase()}`)}
              </Badge>
              <ConnectionBanner status={connectionStatus} />
            </div>
          </div>
        </div>
      </section>

      <div className="container px-4">
        <div className="grid gap-8 lg:grid-cols-[260px_1fr_380px]">
          {/* Channels & Guidelines */}
          <aside className="space-y-6">
            <Card className="border-none shadow-md rounded-[2rem] overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
              <CardHeader className="bg-muted/30 pb-4 border-b border-border/40">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('channels')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {channels.length === 0 ? (
                  <p className="text-sm text-muted-foreground font-medium text-center py-4">{t('no_channels')}</p>
                ) : (
                  <ChannelList
                    channels={channels}
                    activeId={activeChannel?.id}
                    onSelect={(channel) => setActiveChannel(channel)}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-md rounded-[2rem] overflow-hidden bg-card/50 backdrop-blur-sm border border-border/40">
              <CardHeader className="bg-muted/30 pb-4 border-b border-border/40 text-primary">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest">{t('guidelines_title')}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 text-[11px] text-muted-foreground space-y-4 font-bold leading-relaxed">
                <p className="flex gap-3"><span className="text-primary">•</span> {t('guideline_1')}</p>
                <p className="flex gap-3"><span className="text-primary">•</span> {t('guideline_2')}</p>
                <p className="flex gap-3"><span className="text-primary">•</span> {t('guideline_3')}</p>
              </CardContent>
            </Card>
          </aside>

          {/* Messages Main section */}
          <section className="space-y-8">
            <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden border border-border/40 bg-card/30 backdrop-blur-md">
              <CardHeader className="border-b border-border/40 pb-6 bg-card/50 p-8">
                <CardTitle className="text-2xl font-black tracking-tight">{activeChannel?.name || t('channel_types.discussion')}</CardTitle>
                <CardDescription className="font-bold text-sm opacity-70">{t(`channel_descriptions.${channelType.toLowerCase()}`)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-10 p-8 pt-10">
                {pinnedMessages.length > 0 && (
                  <div className="space-y-4 bg-primary/[0.03] p-6 rounded-[2rem] border border-primary/10 shadow-inner">
                    <div className="text-[9px] font-black uppercase tracking-[0.25em] text-primary flex items-center gap-2 mb-2">
                      <Pin className="w-3 h-3" />
                      {t('pinned')}
                    </div>
                    {pinnedMessages.map((message, index) => (
                      <MessageItem
                        key={`pinned-${message.id}`}
                        message={message}
                        isGrouped={index > 0}
                        canModerate={canModerate}
                        allowAnswer={activeChannel?.type === 'QA'}
                        allowLock={canLockThread}
                        onPin={handlePin}
                        onMarkAnswer={handleMarkAnswer}
                        onLock={handleLock}
                        onReport={handleReport}
                        onRemove={handleRemove}
                        onRetry={handleRetryMessage}
                        onSelectThread={activeChannel?.type !== 'ANNOUNCEMENTS' ? setThreadParent : undefined}
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-6">
                  {isLoadingMessages ? (
                    <div className="space-y-6">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                      ))}
                    </div>
                  ) : (
                    displayMessages.map((message, index) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isGrouped={
                          index > 0 &&
                          displayMessages[index - 1].author.id === message.author.id &&
                          displayMessages[index - 1].parentId === message.parentId
                        }
                        canModerate={canModerate}
                        allowAnswer={activeChannel?.type === 'QA'}
                        allowLock={canLockThread}
                        onPin={handlePin}
                        onMarkAnswer={handleMarkAnswer}
                        onLock={handleLock}
                        onReport={handleReport}
                        onRemove={handleRemove}
                        onRetry={handleRetryMessage}
                        onSelectThread={activeChannel?.type !== 'ANNOUNCEMENTS' ? setThreadParent : undefined}
                      />
                    ))
                  )}
                </div>

                {nextCursor && (
                  <Button variant="outline" className="w-full rounded-2xl font-black uppercase tracking-[0.15em] text-[10px] h-12 border-2 shadow-sm hover:bg-primary hover:text-white transition-all" onClick={() => loadMessages(activeChannel!.id, nextCursor)}>
                    {t('load_older')}
                  </Button>
                )}
              </CardContent>
            </Card>

            {activeChannel?.type === 'ANNOUNCEMENTS' && !canModerate ? null : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-none shadow-xl rounded-[2.5rem] overflow-hidden border-t-4 border-t-primary bg-card/50 backdrop-blur-md">
                  <CardHeader className="pb-4 px-8 pt-8">
                    <CardTitle className="text-xl font-black">
                      {activeChannel?.type === 'QA' ? t('ask_question_title') : t('start_discussion_title')}
                    </CardTitle>
                    <CardDescription className="font-bold text-xs opacity-60">
                      {activeChannel?.type === 'QA'
                        ? t('ask_question_desc')
                        : t('start_discussion_desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-8 pb-8">
                    <MessageComposer
                      placeholder={
                        activeChannel?.type === 'ANNOUNCEMENTS'
                          ? t('post_announcement_placeholder')
                          : activeChannel?.type === 'QA'
                            ? t('ask_question_placeholder')
                            : t('share_placeholder')
                      }
                      onSend={sendMessage}
                      helper={isChannelLocked ? t('locked_channel_helper') : t('composer_helper')}
                      disabled={isChannelLocked}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </section>

          {/* Thread Panel DeskTop */}
          <div className="hidden lg:block h-full relative">
            <AnimatePresence mode="wait">
              {threadParent ? (
                <motion.div 
                  key="thread-panel"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="sticky top-24 h-[calc(100vh-120px)] rounded-[2.5rem] overflow-hidden shadow-2xl border border-border/40"
                >
                  <ThreadPanel
                    parent={threadParent}
                    replies={threadMessages}
                    onClose={() => setThreadParent(null)}
                    onSendReply={sendReply}
                    onPin={handlePin}
                    onMarkAnswer={handleMarkAnswer}
                    onLock={handleLock}
                    onReport={handleReport}
                    onRemove={handleRemove}
                    onRetry={handleRetryMessage}
                    canModerate={canModerate}
                    allowAnswer={activeChannel?.type === 'QA'}
                    allowLock={canLockThread}
                    hasMore={!!threadCursor}
                    onLoadMore={() => threadParent && loadThreadMessages(threadParent.id, threadCursor || undefined)}
                    isLoading={isThreadLoading}
                    disabled={threadComposerDisabled}
                    helper={threadHelper}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="thread-empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="sticky top-24 h-[400px] flex items-center justify-center p-8 text-center border-2 border-dashed rounded-[3rem] border-border/40 bg-muted/10"
                >
                  <div className="space-y-4 max-w-[240px]">
                    <div className="w-20 h-20 bg-background rounded-[2rem] flex items-center justify-center mx-auto shadow-xl border border-border/50 text-muted-foreground/20">
                      <MessageSquare className="w-10 h-10" />
                    </div>
                    <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{t('thread_view_title')}</CardTitle>
                    <p className="text-[11px] text-muted-foreground/60 font-black leading-relaxed">
                      {t('thread_view_desc')}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Thread Panel Mobile */}
      <AnimatePresence>
        {threadParent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-50 bg-background/90 backdrop-blur-md p-4 flex items-center justify-center"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full h-[90vh] bg-background rounded-[3rem] shadow-2xl overflow-hidden border border-border/50 relative"
            >
              <ThreadPanel
                parent={threadParent}
                replies={threadMessages}
                onClose={() => setThreadParent(null)}
                onSendReply={sendReply}
                onPin={handlePin}
                onMarkAnswer={handleMarkAnswer}
                onLock={handleLock}
                onReport={handleReport}
                onRemove={handleRemove}
                onRetry={handleRetryMessage}
                canModerate={canModerate}
                allowAnswer={activeChannel?.type === 'QA'}
                allowLock={canLockThread}
                hasMore={!!threadCursor}
                onLoadMore={() => threadParent && loadThreadMessages(threadParent.id, threadCursor || undefined)}
                isLoading={isThreadLoading}
                disabled={threadComposerDisabled}
                helper={threadHelper}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function mergeMessage(
  list: CommunityMessageWithDelivery[],
  message: CommunityMessage,
  clientId?: string,
): CommunityMessageWithDelivery[] {
  if (clientId) {
    const existingIndex = list.findIndex((item) => item.clientId === clientId);
    if (existingIndex !== -1) {
      const next = [...list];
      next[existingIndex] = { ...message, deliveryStatus: undefined };
      return next;
    }
  }
  if (list.some((item) => item.id === message.id)) {
    return list;
  }
  return [message, ...list];
}

function replaceMessage(
  list: CommunityMessageWithDelivery[],
  clientId: string,
  message: CommunityMessage,
): CommunityMessageWithDelivery[] {
  return list.map((item) =>
    item.clientId === clientId ? ({ ...message, deliveryStatus: undefined } as CommunityMessageWithDelivery) : item,
  );
}

function markFailed(list: CommunityMessageWithDelivery[], clientId: string): CommunityMessageWithDelivery[] {
  return list.map((item) =>
    item.clientId === clientId ? { ...item, deliveryStatus: 'failed' as const } : item,
  );
}

function updateMessage(list: CommunityMessageWithDelivery[], message: CommunityMessage) {
  return list.map((item) => (item.id === message.id ? { ...item, ...message } : item));
}