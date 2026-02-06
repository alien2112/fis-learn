'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MessageSquare,
  Users,
  Settings,
  PhoneOff,
  Share,
  MoreVertical,
  Hand,
  Smile,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StreamViewer {
  userID: string;
  userName: string;
  role: 'host' | 'coHost' | 'audience';
  cameraOn: boolean;
  micOn: boolean;
}

export interface ZegoStreamConfig {
  appID: number;
  server: string;
  roomID: string;
  userID: string;
  userName: string;
  token: string;
  role: 'Host' | 'Cohost' | 'Audience';
}

export interface ZegoStreamingRoomProps {
  config: ZegoStreamConfig;
  onLeave?: () => void;
  className?: string;
}

export function ZegoStreamingRoom({ config, onLeave, className }: ZegoStreamingRoomProps) {
  const [zegoEngine, setZegoEngine] = useState<ZegoExpressEngine | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isJoined, setIsJoined] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [viewers, setViewers] = useState<StreamViewer[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [messages, setMessages] = useState<{ user: string; text: string; time: Date }[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isHandRaised, setIsHandRaised] = useState(false);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Initialize ZegoCloud engine
  useEffect(() => {
    const initEngine = async () => {
      try {
        const engine = new ZegoExpressEngine(config.appID, config.server);
        
        // Set room config
        engine.setRoomConfig({
          maxMemberCount: 100,
        });

        // Listen for remote users
        engine.on('roomStreamUpdate', async (_roomID: string, updateType: 'ADD' | 'DELETE', streamList: Array<{ streamID: string }>) => {
          if (updateType === 'ADD') {
            for (const stream of streamList) {
              const remoteStream = await engine.startPlayingStream(stream.streamID);
              setRemoteStreams(prev => new Map(prev).set(stream.streamID, remoteStream));
            }
          } else if (updateType === 'DELETE') {
            for (const stream of streamList) {
              engine.stopPlayingStream(stream.streamID);
              setRemoteStreams(prev => {
                const next = new Map(prev);
                next.delete(stream.streamID);
                return next;
              });
            }
          }
        });

        // Listen for room user updates
        engine.on('roomUserUpdate', (_roomID, updateType, userList) => {
          if (updateType === 'ADD') {
            setViewers(prev => [
              ...prev,
              ...userList.map((u: { userID: string; userName?: string }) => ({
                userID: u.userID,
                userName: u.userName || 'Unknown',
                role: 'audience' as const,
                cameraOn: false,
                micOn: false,
              })),
            ]);
          } else {
            setViewers(prev => prev.filter(v => !userList.some((u: { userID: string }) => u.userID === v.userID)));
          }
        });

        // Listen for IM messages
        engine.on('IMRecvBroadcastMessage', (_roomID, messageList) => {
          const newMsgs = messageList.map((msg: { fromUser: { userName?: string }; message: string }) => ({
            user: msg.fromUser.userName || 'Unknown',
            text: msg.message,
            time: new Date(),
          }));
          setMessages(prev => [...prev, ...newMsgs]);
        });

        setZegoEngine(engine);

        // Create local stream and join room
        const stream = await engine.createStream({
          camera: { video: true, audio: true },
        });
        setLocalStream(stream);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Login to room
        await engine.loginRoom(config.roomID, config.token, {
          userID: config.userID,
          userName: config.userName,
        });

        // Start publishing if host or cohost
        if (config.role === 'Host' || config.role === 'Cohost') {
          await engine.startPublishingStream(`${config.roomID}_${config.userID}`, localStream as MediaStream);
        }

        setIsJoined(true);
      } catch (error) {
        console.error('Failed to initialize ZegoCloud:', error);
      }
    };

    initEngine();

    return () => {
      if (zegoEngine) {
        zegoEngine.stopPublishingStream(`${config.roomID}_${config.userID}`);
        zegoEngine.logoutRoom(config.roomID);
        zegoEngine.destroyEngine();
      }
      if (localStream) {
        localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [config]);

  // Update remote video elements
  useEffect(() => {
    remoteStreams.forEach((stream, streamID) => {
      const videoEl = remoteVideoRefs.current.get(streamID);
      if (videoEl) {
        videoEl.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const toggleCamera = useCallback(async () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCameraOn;
        setIsCameraOn(!isCameraOn);
      }
    }
  }, [localStream, isCameraOn]);

  const toggleMic = useCallback(async () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    }
  }, [localStream, isMicOn]);

  const toggleScreenShare = useCallback(async () => {
    if (!zegoEngine || !localStream) return;

    try {
      if (!isScreenSharing) {
        const screenStream = await zegoEngine.createStream({
          screen: {
            audio: true,
            videoQuality: 2,
          },
        });
        
        await zegoEngine.stopPublishingStream(`${config.roomID}_${config.userID}`);
        await zegoEngine.startPublishingStream(`${config.roomID}_${config.userID}_screen`, screenStream as MediaStream);
        
        setIsScreenSharing(true);
      } else {
        await zegoEngine.stopPublishingStream(`${config.roomID}_${config.userID}_screen`);
        await zegoEngine.startPublishingStream(`${config.roomID}_${config.userID}`, localStream);
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  }, [zegoEngine, localStream, isScreenSharing, config]);

  const sendMessage = useCallback(() => {
    if (!zegoEngine || !newMessage.trim()) return;
    
    zegoEngine.sendBroadcastMessage(config.roomID, newMessage);
    setMessages(prev => [...prev, {
      user: config.userName,
      text: newMessage,
      time: new Date(),
    }]);
    setNewMessage('');
  }, [zegoEngine, newMessage, config]);

  const raiseHand = useCallback(() => {
    if (!zegoEngine) return;
    
    zegoEngine.sendCustomCommand(config.roomID, JSON.stringify({
      action: isHandRaised ? 'hand_down' : 'hand_up',
      userID: config.userID,
    }), []);
    setIsHandRaised(!isHandRaised);
  }, [zegoEngine, isHandRaised, config]);

  const handleLeave = useCallback(() => {
    if (zegoEngine) {
      zegoEngine.stopPublishingStream(`${config.roomID}_${config.userID}`);
      zegoEngine.logoutRoom(config.roomID);
      zegoEngine.destroyEngine();
    }
    if (localStream) {
      localStream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
    }
    onLeave?.();
  }, [zegoEngine, localStream, config.roomID, config.userID, onLeave]);

  return (
    <div className={cn('flex h-screen bg-slate-900 overflow-hidden', className)}>
      {/* Main Video Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="font-medium text-white">{config.roomID}</span>
            <span className="text-sm text-slate-400">
              ({viewers.length + 1} مشارك)
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showParticipants ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              )}
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowChat(!showChat)}
              className={cn(
                'p-2 rounded-lg transition-colors',
                showChat ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
              )}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className={cn(
            'grid gap-4 h-full',
            remoteStreams.size === 0 ? 'grid-cols-1' :
            remoteStreams.size === 1 ? 'grid-cols-2' :
            remoteStreams.size <= 3 ? 'grid-cols-2' :
            'grid-cols-3'
          )}>
            {/* Local Video */}
            <div className="relative bg-slate-800 rounded-xl overflow-hidden">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  'w-full h-full object-cover',
                  !isCameraOn && 'hidden'
                )}
              />
              {!isCameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center">
                    <span className="text-4xl">{config.userName[0]}</span>
                  </div>
                </div>
              )}
              
              {/* Local User Info */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
                <span className="text-sm text-white font-medium">{config.userName}</span>
                <span className="text-xs text-amber-400">(أنت)</span>
                {!isMicOn && <MicOff className="w-4 h-4 text-red-400" />}
              </div>

              {/* Host Badge */}
              {config.role === 'Host' && (
                <div className="absolute top-3 left-3 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  مقدم
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {Array.from(remoteStreams.entries()).map(([streamID, stream]) => (
              <div key={streamID} className="relative bg-slate-800 rounded-xl overflow-hidden">
                <video
                  ref={el => {
                    if (el) remoteVideoRefs.current.set(streamID, el);
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-3 left-3 bg-black/50 px-3 py-1.5 rounded-full">
                  <span className="text-sm text-white">
                    {streamID.includes('_screen') ? 'مشاركة الشاشة' : 'مشارك'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Controls */}
        <div className="h-20 bg-slate-800 border-t border-slate-700 flex items-center justify-center gap-4 px-4">
          <button
            onClick={toggleMic}
            className={cn(
              'p-3 rounded-full transition-all',
              isMicOn 
                ? 'bg-slate-700 text-white hover:bg-slate-600' 
                : 'bg-red-500 text-white hover:bg-red-600'
            )}
          >
            {isMicOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleCamera}
            className={cn(
              'p-3 rounded-full transition-all',
              isCameraOn 
                ? 'bg-slate-700 text-white hover:bg-slate-600' 
                : 'bg-red-500 text-white hover:bg-red-600'
            )}
          >
            {isCameraOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={cn(
              'p-3 rounded-full transition-all',
              isScreenSharing
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            )}
          >
            <MonitorUp className="w-6 h-6" />
          </button>

          <button
            onClick={raiseHand}
            className={cn(
              'p-3 rounded-full transition-all',
              isHandRaised
                ? 'bg-amber-500 text-white'
                : 'bg-slate-700 text-white hover:bg-slate-600'
            )}
          >
            <Hand className={cn('w-6 h-6', isHandRaised && 'animate-bounce')} />
          </button>

          <div className="w-px h-10 bg-slate-600 mx-2" />

          <button
            onClick={handleLeave}
            className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
          >
            <PhoneOff className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-slate-800 border-l border-slate-700 flex flex-col"
          >
            <div className="h-14 border-b border-slate-700 flex items-center px-4">
              <span className="font-medium text-white">الدردشة</span>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-blue-400">{msg.user}</span>
                    <span className="text-xs text-slate-500">
                      {msg.time.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300">{msg.text}</p>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-slate-500 py-8">
                  لا توجد رسائل بعد
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="اكتب رسالة..."
                  className="flex-1 bg-slate-700 text-white px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={sendMessage}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Share className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Participants Panel */}
      <AnimatePresence>
        {showParticipants && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="bg-slate-800 border-l border-slate-700 flex flex-col"
          >
            <div className="h-14 border-b border-slate-700 flex items-center px-4">
              <span className="font-medium text-white">المشاركون</span>
              <span className="text-sm text-slate-400 mr-2">({viewers.length + 1})</span>
            </div>
            
            <div className="flex-1 overflow-auto p-2">
              {/* Local User */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/50">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-medium">{config.userName[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{config.userName}</p>
                  <p className="text-xs text-amber-400">{config.role === 'Host' ? 'مقدم' : 'أنت'}</p>
                </div>
                <div className="flex items-center gap-1">
                  {!isMicOn && <MicOff className="w-4 h-4 text-red-400" />}
                  {!isCameraOn && <VideoOff className="w-4 h-4 text-red-400" />}
                </div>
              </div>

              {/* Remote Users */}
              {viewers.map((viewer) => (
                <div key={viewer.userID} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700/30">
                  <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center">
                    <span className="text-white font-medium">{viewer.userName[0]}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{viewer.userName}</p>
                    <p className="text-xs text-slate-400">
                      {viewer.role === 'host' ? 'مقدم' : 'مشاهد'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {!viewer.micOn && <MicOff className="w-4 h-4 text-red-400" />}
                    {!viewer.cameraOn && <VideoOff className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Streaming Room Page Component
interface StreamingRoomPageProps {
  roomID: string;
  userID: string;
  userName: string;
  token: string;
  role: 'Host' | 'Cohost' | 'Audience';
}

export function StreamingRoomPage({ 
  roomID, 
  userID, 
  userName, 
  token, 
  role 
}: StreamingRoomPageProps) {
  const [isLeft, setIsLeft] = useState(false);

  if (isLeft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">تم المغادرة</h1>
          <p className="text-slate-400 mb-6">غادرت الجلسة بنجاح</p>
          <button
            onClick={() => window.location.href = '/courses'}
            className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            العودة للدورات
          </button>
        </div>
      </div>
    );
  }

  const config: ZegoStreamConfig = {
    appID: 1765136310,
    server: 'wss://webliveroom1765136310-api.zego.im/ws',
    roomID,
    userID,
    userName,
    token,
    role,
  };

  return (
    <ZegoStreamingRoom 
      config={config} 
      onLeave={() => setIsLeft(true)}
    />
  );
}
