import React, { useState, useRef } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Download, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import type { SharedAttachment } from './SharedImageBubble';

interface SharedVideoBubbleProps {
  attachments: SharedAttachment[];
  messageType?: 'in' | 'out';
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

const SharedVideoBubble: React.FC<SharedVideoBubbleProps> = ({
  attachments,
  messageType = 'in',
  onToast
}) => {
  return (
    <div className="space-y-2">
      {attachments.map((attachment, index) => (
        <VideoPlayer
          key={attachment.id || index}
          attachment={attachment}
          messageType={messageType}
          onToast={onToast}
        />
      ))}
    </div>
  );
};

interface VideoPlayerProps {
  attachment: SharedAttachment;
  messageType: 'in' | 'out';
  onToast?: (message: string, type?: 'success' | 'error') => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ attachment, messageType, onToast }) => {
  const { t } = useLanguage('attachments');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const videoUrl = attachment.data_url || attachment.file_url;
  const filename = attachment.fallback_title || t('video.title');

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const downloadVideo = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = filename;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onToast?.(t('video.downloadStarted', { filename }), 'success');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return `0 ${t('file.size.bytes')}`;

    const k = 1024;
    const sizes = [
      t('file.size.bytes'),
      t('file.size.kilobytes'),
      t('file.size.megabytes'),
      t('file.size.gigabytes')
    ];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (!videoUrl) {
    return (
      <div className={`rounded-lg p-3 max-w-xs ${
        messageType === 'out' ? 'bg-white/10' : 'bg-slate-100'
      }`}>
        <div className={`flex items-center gap-2 ${
          messageType === 'out' ? 'text-white/70' : 'text-slate-500'
        }`}>
          <Play className="h-4 w-4" />
          <span className="text-sm">{t('video.notAvailable')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-sm rounded-lg overflow-hidden">
      {/* Video Container */}
      <div
        className="relative group"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-auto max-h-64 object-cover"
          poster={attachment.thumb_url}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          controls={false}
          onClick={togglePlayPause}
        />

        {/* Video Overlay Controls */}
        <div className={`
          absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30
          transition-all duration-200 flex items-center justify-center
          ${showControls ? 'opacity-100' : 'opacity-0'}
        `}>
          {/* Play/Pause Button */}
          <button
            onClick={togglePlayPause}
            className="p-3 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all duration-200"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-gray-700" />
            ) : (
              <Play className="w-6 h-6 text-gray-700 ml-1" />
            )}
          </button>
        </div>

        {/* Top Controls */}
        <div className={`
          absolute top-2 right-2 flex gap-1 transition-all duration-200
          ${showControls ? 'opacity-100' : 'opacity-0'}
        `}>
          <button
            onClick={downloadVideo}
            className="p-1.5 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-all duration-200"
            title={t('video.download')}
          >
            <Download className="w-4 h-4 text-white" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-all duration-200"
            title={t('video.fullscreen')}
          >
            <Maximize className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Bottom Controls */}
        <div className={`
          absolute bottom-2 left-2 right-2 flex items-center justify-between
          transition-all duration-200
          ${showControls ? 'opacity-100' : 'opacity-0'}
        `}>
          {/* Mute Button */}
          <button
            onClick={toggleMute}
            className="p-1.5 bg-black bg-opacity-50 rounded-full hover:bg-opacity-70 transition-all duration-200"
            title={isMuted ? t('video.unmute') : t('video.mute')}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-white" />
            ) : (
              <Volume2 className="w-4 h-4 text-white" />
            )}
          </button>

          {/* Video Info */}
          <div className="text-white text-xs bg-black bg-opacity-50 rounded px-2 py-1">
            {attachment.file_size && formatFileSize(attachment.file_size)}
          </div>
        </div>
      </div>

      {/* Video Title */}
      <div className={`p-2 ${
        messageType === 'out' ? 'bg-white/10' : 'bg-slate-100'
      }`}>
        <p className={`text-sm font-medium truncate ${
          messageType === 'out' ? 'text-white/90' : 'text-slate-700'
        }`}>
          {filename}
        </p>
      </div>
    </div>
  );
};

export default SharedVideoBubble;
