import React, { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Download, ZoomIn, ZoomOut, X } from 'lucide-react';
import { openAttachmentInNewTab } from '@/components/chat/messages/utils/openAttachmentInNewTab';

export interface SharedAttachment {
  id: string;
  file_url: string;
  data_url?: string;
  thumb_url?: string;
  file_type: string;
  file_size: number;
  fallback_title?: string;
}

interface SharedImageBubbleProps {
  attachments: SharedAttachment[];
  messageType?: 'in' | 'out';
  onToast?: (message: string, type?: 'success' | 'error') => void;
  onOpenFullscreen?: (payload: { url: string; title?: string }) => void;
}

const SharedImageBubble: React.FC<SharedImageBubbleProps> = ({
  attachments,
  messageType = 'in',
  onToast,
  onOpenFullscreen
}) => {
  const { t } = useLanguage('attachments');
  const [selectedImage, setSelectedImage] = useState<SharedAttachment | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const isExternalViewerMode = typeof onOpenFullscreen === 'function';

  const downloadFile = (attachment: SharedAttachment) => {
    const url = attachment.data_url || attachment.file_url || attachment.thumb_url;
    if (url) {
      openAttachmentInNewTab({
        url,
        filename: attachment.fallback_title || 'image',
      });

      onToast?.(t('image.downloadStarted', { filename: attachment.fallback_title || t('image.title') }), 'success');
    }
  };

  const openImageModal = (attachment: SharedAttachment) => {
    const fullscreenUrl = attachment.data_url || attachment.file_url || attachment.thumb_url;
    if (isExternalViewerMode) {
      if (!fullscreenUrl) return;
      onOpenFullscreen({
        url: fullscreenUrl,
        title: attachment.fallback_title || t('image.title'),
      });
      return;
    }

    setSelectedImage(attachment);
    setImageZoom(1);
  };

  const closeImageModal = () => {
    setSelectedImage(null);
    setImageZoom(1);
  };

  const handleZoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setImageZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const resolveNextImageSrc = (
    currentSrc: string,
    attachment: SharedAttachment
  ): string | null => {
    const orderedSources = [attachment.thumb_url, attachment.data_url, attachment.file_url].filter(Boolean) as string[];
    const currentIndex = orderedSources.findIndex(source => currentSrc.includes(source));
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 1;

    return orderedSources[nextIndex] || null;
  };

  const resolveNextModalImageSrc = (
    currentSrc: string,
    attachment: SharedAttachment
  ): string | null => {
    const orderedSources = [attachment.data_url, attachment.file_url, attachment.thumb_url].filter(Boolean) as string[];
    const currentIndex = orderedSources.findIndex(source => currentSrc.includes(source));
    const nextIndex = currentIndex >= 0 ? currentIndex + 1 : 1;

    return orderedSources[nextIndex] || null;
  };

  return (
    <>
      {/* Image Grid */}
      <div className={`grid gap-1 ${attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {attachments.map((attachment, index) => {
          const imageSrc = attachment.thumb_url || attachment.data_url || attachment.file_url;
          return (
            <div
              key={attachment.id || index}
              className="relative group"
            >
              <div
                className="relative bg-slate-100 rounded-lg overflow-hidden"
                style={{
                  minWidth: '200px',
                  maxWidth: 'min(280px, calc(100vw - 120px))',
                  height: '180px',
                  aspectRatio: '16/9',
                }}
              >
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={attachment.fallback_title || t('image.title')}
                    className={`absolute inset-0 w-full h-full object-cover hover:opacity-90 transition-opacity ${isExternalViewerMode ? '' : 'cursor-pointer'}`}
                    onClick={() => {
                      if (!isExternalViewerMode) {
                        openImageModal(attachment);
                      }
                    }}
                    onError={(event) => {
                      const nextSrc = resolveNextImageSrc(event.currentTarget.src, attachment);
                      if (nextSrc) {
                        event.currentTarget.src = nextSrc;
                        return;
                      }

                      event.currentTarget.onerror = null;
                    }}
                    loading="lazy"
                    style={{
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 px-3 text-center">
                    {attachment.fallback_title || t('image.title')}
                  </div>
                )}

                {/* Overlay with actions */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        openImageModal(attachment);
                      }}
                      className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all duration-200"
                      title={t('image.view')}
                    >
                      <ZoomIn className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadFile(attachment);
                      }}
                      className="p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all duration-200"
                      title={t('image.download')}
                    >
                      <Download className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Image info */}
              {attachment.file_size && (
                <p className={`text-xs mt-1 ${
                  messageType === 'out' ? 'text-white/70' : 'text-gray-500'
                }`}>
                  {Math.round(attachment.file_size / 1024)} KB
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Full Screen Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeImageModal}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Header with controls */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
              {/* Title */}
              <div className="text-white text-sm bg-black bg-opacity-50 rounded px-3 py-1">
                {selectedImage.fallback_title || t('image.title')}
                {selectedImage.file_size && ` • ${Math.round(selectedImage.file_size / 1024)} KB`}
              </div>

              {/* Controls */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomOut();
                  }}
                  className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200"
                  title={t('image.zoomOut')}
                  disabled={imageZoom <= 0.5}
                >
                  <ZoomOut className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleZoomIn();
                  }}
                  className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200"
                  title={t('image.zoomIn')}
                  disabled={imageZoom >= 3}
                >
                  <ZoomIn className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadFile(selectedImage);
                  }}
                  className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200"
                  title={t('image.download')}
                >
                  <Download className="w-5 h-5 text-white" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    closeImageModal();
                  }}
                  className="p-2 bg-white bg-opacity-20 rounded-full hover:bg-opacity-30 transition-all duration-200"
                  title={t('image.close')}
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Full size image */}
            <div
              className="w-full h-full pt-20 pb-8 overflow-auto flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {(selectedImage.data_url || selectedImage.file_url || selectedImage.thumb_url) && (
                <img
                  src={selectedImage.data_url || selectedImage.file_url || selectedImage.thumb_url}
                  alt={selectedImage.fallback_title || t('image.title')}
                  className="max-w-[min(92vw,1200px)] max-h-[calc(100vh-140px)] object-contain transition-transform duration-200 rounded"
                  onError={(event) => {
                    const nextSrc = resolveNextModalImageSrc(event.currentTarget.src, selectedImage);
                    if (nextSrc) {
                      event.currentTarget.src = nextSrc;
                      return;
                    }

                    event.currentTarget.onerror = null;
                  }}
                  style={{
                    transform: `scale(${imageZoom})`,
                    transformOrigin: 'center center',
                    cursor: 'zoom-in'
                  }}
                />
              )}
            </div>

            {/* Zoom info */}
            {imageZoom !== 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                <div className="text-white text-sm bg-black bg-opacity-50 rounded px-3 py-1">
                  {Math.round(imageZoom * 100)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default SharedImageBubble;
