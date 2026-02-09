'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

import { useTranslations } from 'next-intl';

export default function CourseCommunityPage() {
  const t = useTranslations('community');
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
  }, [slug]);

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
  }, [course, user]);

  const loadMessages = async (channelId: string, cursor?: string) => {
    setIsLoadingMessages(true);
    try {
      const page = await communityApi.listMessages(channelId, { cursor, limit: 30 });
      setMessages((prev) => (cursor ? [...prev, ...page.data] : page.data));
      setNextCursor(page.nextCursor);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to load messages.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const loadThreadMessages = async (parentId: string, cursor?: string) => {
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
      setPageError(error instanceof Error ? error.message : 'Failed to load thread.');
    } finally {
      setIsThreadLoading(false);
    }
  };

  useEffect(() => {
    if (!activeChannel) return;
    setMessages([]);
    setNextCursor(null);
    setThreadParent(null);
    setThreadMessages([]);
    loadMessages(activeChannel.id);
  }, [activeChannel?.id]);

  useEffect(() => {
    if (!threadParent) return;
    setThreadMessages([]);
    setThreadCursor(null);
    loadThreadMessages(threadParent.id);
  }, [threadParent?.id]);

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

      if (message.parentId) {
        if (threadParentRef.current !== message.parentId) {
          return;
        }

        setThreadMessages((prev) => mergeMessage(prev, message, clientId));
      } else {
        setMessages((prev) => mergeMessage(prev, message, clientId));
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
    };
  }, [user?.id]);

  useEffect(() => {
    if (!course || !activeChannel || !socketRef.current) return;
    socketRef.current.emit('community:join', {
      courseId: course.id,
      channelId: activeChannel.id,
    });
  }, [course?.id, activeChannel?.id]);

  const sendMessage = async (body: string) => {
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
      socketRef.current.emit(
        'community:send',
        {
          channelId: activeChannel.id,
          body,
          clientId,
        },
        (ack: { ok?: boolean }) => {
          if (!ack?.ok) {
            setMessages((prev) => markFailed(prev, clientId));
          }
        }
      );
      return;
    }

    try {
      const created = await communityApi.createMessage(activeChannel.id, body, undefined, clientId);
      setMessages((prev) => replaceMessage(prev, clientId, created));
    } catch (error) {
      setMessages((prev) => markFailed(prev, clientId));
    }
  };

  const sendReply = async (body: string) => {
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
      socketRef.current.emit(
        'community:send',
        {
          channelId: activeChannel.id,
          body,
          parentId: threadParent.id,
          clientId,
        },
        (ack: { ok?: boolean }) => {
          if (!ack?.ok) {
            setThreadMessages((prev) => markFailed(prev, clientId));
          }
        }
      );
      return;
    }

    try {
      const created = await communityApi.createMessage(activeChannel.id, body, threadParent.id, clientId);
      setThreadMessages((prev) => replaceMessage(prev, clientId, created));
    } catch (error) {
      setThreadMessages((prev) => markFailed(prev, clientId));
    }
  };

  const handlePin = async (message: CommunityMessageWithDelivery) => {
    try {
      await communityApi.pinMessage(message.id, !message.isPinned);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update message.');
    }
  };

  const handleMarkAnswer = async (message: CommunityMessageWithDelivery) => {
    try {
      await communityApi.markAnswer(message.id, !message.isAnswer);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update message.');
    }
  };

  const handleLock = async (message: CommunityMessageWithDelivery) => {
    try {
      const updated = await communityApi.lockThread(message.id, !message.isLocked);
      setMessages((prev) => updateMessage(prev, updated));
      setThreadMessages((prev) => updateMessage(prev, updated));
      setThreadParent((prev) => (prev && prev.id === updated.id ? { ...prev, ...updated } : prev));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to update message.');
    }
  };

  const handleReport = async (message: CommunityMessageWithDelivery) => {
    try {
      await communityApi.reportMessage(message.id);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to report message.');
    }
  };

  const handleRemove = async (message: CommunityMessageWithDelivery) => {
    try {
      await communityApi.removeMessage(message.id);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to remove message.');
    }
  };

  const pinnedMessages = useMemo(
    () => messages.filter((message) => message.isPinned && !message.parentId),
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
      <div className="container py-16">
        <Skeleton className="h-8 w-48" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container py-16">
        <Card>
          <CardHeader>
            <CardTitle>{t('sign_in_title')}</CardTitle>
            <CardDescription>{t('sign_in_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/login">{t('login_button')}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="container py-16">
        <Card>
          <CardHeader>
            <CardTitle>{t('unavailable_title')}</CardTitle>
            <CardDescription>{pageError}</CardDescription>
          </CardHeader>
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
    <div className="container py-10 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground">{course?.title}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="uppercase text-xs">
            {channelType}
          </Badge>
          <ConnectionBanner status={connectionStatus} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr_360px]">
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">{t('channels')}</CardTitle>
            </CardHeader>
            <CardContent>
              {channels.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('no_channels')}</p>
              ) : (
                <ChannelList
                  channels={channels}
                  activeId={activeChannel?.id}
                  onSelect={(channel) => setActiveChannel(channel)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">{t('guidelines_title')}</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>{t('guideline_1')}</p>
              <p>{t('guideline_2')}</p>
              <p>{t('guideline_3')}</p>
            </CardContent>
          </Card>
        </aside>

        <section className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{activeChannel?.name || 'Channel'}</CardTitle>
              <CardDescription>{t(`channel_descriptions.${channelType.toLowerCase()}`)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {pinnedMessages.length > 0 && (
                <div className="space-y-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
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
                      onSelectThread={activeChannel?.type !== 'ANNOUNCEMENTS' ? setThreadParent : undefined}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {isLoadingMessages ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : (
                  messages
                    .filter((message) => !message.isPinned || message.parentId)
                    .map((message, index, list) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        isGrouped={
                          index > 0 &&
                          list[index - 1].author.id === message.author.id &&
                          list[index - 1].parentId === message.parentId
                        }
                        canModerate={canModerate}
                        allowAnswer={activeChannel?.type === 'QA'}
                        allowLock={canLockThread}
                        onPin={handlePin}
                        onMarkAnswer={handleMarkAnswer}
                        onLock={handleLock}
                        onReport={handleReport}
                        onRemove={handleRemove}
                        onSelectThread={activeChannel?.type !== 'ANNOUNCEMENTS' ? setThreadParent : undefined}
                      />
                    ))
                )}
              </div>

              {nextCursor && (
                <Button variant="outline" className="w-full" onClick={() => loadMessages(activeChannel!.id, nextCursor)}>
                  {t('load_older')}
                </Button>
              )}
            </CardContent>
          </Card>

          {activeChannel?.type === 'ANNOUNCEMENTS' && !canModerate ? null : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {activeChannel?.type === 'QA' ? t('ask_question_title') : t('start_discussion_title')}
                </CardTitle>
                <CardDescription>
                  {activeChannel?.type === 'QA'
                    ? t('ask_question_desc')
                    : t('start_discussion_desc')}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
          )}
        </section>

        <div className="hidden lg:block">
          {threadParent ? (
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
              canModerate={canModerate}
              allowAnswer={activeChannel?.type === 'QA'}
              allowLock={canLockThread}
              hasMore={!!threadCursor}
              onLoadMore={() => threadParent && loadThreadMessages(threadParent.id, threadCursor || undefined)}
              isLoading={isThreadLoading}
              disabled={threadComposerDisabled}
              helper={threadHelper}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">{t('thread_view_title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t('thread_view_desc')}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {threadParent && (
        <div className="lg:hidden">
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
            canModerate={canModerate}
            allowAnswer={activeChannel?.type === 'QA'}
            allowLock={canLockThread}
            hasMore={!!threadCursor}
            onLoadMore={() => threadParent && loadThreadMessages(threadParent.id, threadCursor || undefined)}
            isLoading={isThreadLoading}
            disabled={threadComposerDisabled}
            helper={threadHelper}
          />
        </div>
      )}
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
