'use strict';
'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { X, ExternalLink, AlertCircle } from 'lucide-react';

interface DocumentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  documentTitle: string;
}

export function DocumentPreviewModal({
  isOpen,
  onClose,
  fileUrl,
  documentTitle,
}: DocumentPreviewModalProps) {
  if (!fileUrl) return null;

  const isPdf = fileUrl.toLowerCase().endsWith('.pdf') || fileUrl.includes('drive.google.com') || fileUrl.includes('application/pdf');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl w-[90vw] h-[85vh] p-0 flex flex-col overflow-hidden bg-card text-card-foreground">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="space-y-0.5">
            <DialogTitle className="text-lg font-bold">{documentTitle}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Document Preview (Local Vault / Google Drive Link)
            </DialogDescription>
          </div>
          <div className="flex items-center gap-2 mr-6">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-secondary hover:bg-muted text-secondary-foreground text-xs font-semibold px-3 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in New Tab
            </a>
          </div>
        </div>

        {/* Preview Container */}
        <div className="flex-1 bg-zinc-950 flex items-center justify-center relative p-1">
          {isPdf ? (
            fileUrl.includes('drive.google.com') ? (
              // For google drive, we load it in an iframe view mode, replacing the view/sharing url
              // Example: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
              // Becomes: https://drive.google.com/file/d/FILE_ID/preview
              <iframe
                src={fileUrl.replace(/\/view(\?.*)?$/, '/preview')}
                className="w-full h-full border-0 rounded-sm"
                allow="autoplay"
              />
            ) : (
              <iframe src={fileUrl} className="w-full h-full border-0 rounded-sm" />
            )
          ) : (
            // Image files
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fileUrl}
              alt={documentTitle}
              className="max-w-full max-h-full object-contain"
            />
          )}

          {/* Fallback info for non-working preview iframes */}
          {fileUrl.includes('drive.google.com') && (
            <div className="absolute bottom-4 left-4 bg-zinc-900/90 text-zinc-300 text-[10px] px-3 py-1.5 rounded-md border border-zinc-800 flex items-center gap-1.5 shadow-md">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
              If preview is empty, ensure the file is shared as "Anyone with the link can view" in Google Drive.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
