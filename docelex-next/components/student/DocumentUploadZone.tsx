'use strict';
'use client';

import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Camera, 
  Link2, 
  FileText, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Trash2, 
  RotateCcw,
  Eye,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type UploadSource = 'device' | 'drive' | 'camera';

interface DocumentRecord {
  _id: string;
  documentType: string;
  fileUrl: string;
  publicId: string;
  uploadDate: string | Date;
  status: 'Pending' | 'Verified' | 'Rejected';
  remarks?: string;
  verifiedBy?: string;
}

interface DocumentUploadZoneProps {
  studentId: string;
  documentType: string;
  documentLabel: string;
  existingDocument?: DocumentRecord;
  onUploadSuccess: () => void;
  onPreviewClick: (url: string, title: string) => void;
}

export function DocumentUploadZone({
  studentId,
  documentType,
  documentLabel,
  existingDocument,
  onUploadSuccess,
  onPreviewClick,
}: DocumentUploadZoneProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drive URL Modal state
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveUrl, setDriveUrl] = useState('');
  const [driveFileName, setDriveFileName] = useState('');

  // Camera Modal state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Status mapping colors & text
  const getStatusDisplay = (status?: string) => {
    switch (status) {
      case 'Verified':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50',
          icon: CheckCircle,
          label: 'Verified',
        };
      case 'Rejected':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50',
          icon: XCircle,
          label: 'Rejected',
        };
      case 'Pending':
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50',
          icon: Clock,
          label: 'Pending Verification',
        };
    }
  };

  const statusInfo = getStatusDisplay(existingDocument?.status);

  // Handle Standard Device File upload
  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 10MB limit.');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/students/${studentId}/documents/${documentType}`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload document');
      }

      onUploadSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  // Google Drive URL Upload
  const handleDriveSubmit = async () => {
    if (!driveUrl) {
      setErrorMessage('Google Drive Link is required.');
      return;
    }
    if (!driveUrl.startsWith('https://')) {
      setErrorMessage('Please enter a secure Google Drive link starting with https://');
      return;
    }

    setIsUploading(true);
    setDriveModalOpen(false);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/students/${studentId}/documents/${documentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveUrl,
          fileName: driveFileName || `${documentLabel}_Link.pdf`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit Google Drive link');
      }

      setDriveUrl('');
      setDriveFileName('');
      onUploadSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit Google Drive link');
    } finally {
      setIsUploading(false);
    }
  };

  // Camera Capturing functions
  const startCamera = async () => {
    setErrorMessage(null);
    setCameraModalOpen(true);
    try {
      // Small timeout to allow video tag to mount in DOM
      setTimeout(async () => {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err: any) {
      setCameraModalOpen(false);
      setErrorMessage('Unable to access device camera. Please check browser permissions.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraModalOpen(false);
  };

  const captureSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Align canvas sizing to video input size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Data = canvas.toDataURL('image/jpeg');
    stopCamera();

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/students/${studentId}/documents/${documentType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraDataUrl: base64Data,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload camera capture');
      }

      onUploadSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload camera photo');
    } finally {
      setIsUploading(false);
    }
  };

  // Delete document record
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the uploaded "${documentLabel}"?`)) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/students/${studentId}/documents/${documentType}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete document');
      }

      onUploadSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col border border-border rounded-xl bg-card text-card-foreground p-5 space-y-4 shadow-2xs hover:shadow-xs transition-shadow">
      {/* Doc details & Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-bold text-foreground">{documentLabel}</h4>
          {existingDocument ? (
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px] sm:max-w-xs font-mono">
              {existingDocument.publicId}
            </p>
          ) : (
            <p className="text-xs text-rose-500 font-semibold mt-0.5">Not Uploaded</p>
          )}
        </div>

        {/* Status indicator */}
        {existingDocument && (
          <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.bg}`}>
            <statusInfo.icon className="h-3.5 w-3.5" />
            {statusInfo.label}
          </div>
        )}
      </div>

      {/* Upload Date & Remarks */}
      {existingDocument && (
        <div className="text-xs space-y-1 bg-muted/40 p-3 rounded-lg border border-border/50">
          <div className="flex justify-between text-muted-foreground font-medium">
            <span>Uploaded On:</span>
            <span className="font-mono text-foreground">
              {new Date(existingDocument.uploadDate).toLocaleString()}
            </span>
          </div>
          {existingDocument.remarks && (
            <div className="mt-1.5 pt-1.5 border-t border-border/50">
              <span className="font-bold text-foreground block mb-0.5">Verifier Remarks:</span>
              <p className="text-destructive font-semibold italic">{existingDocument.remarks}</p>
            </div>
          )}
        </div>
      )}

      {/* Error block */}
      {errorMessage && (
        <div className="flex items-center gap-1.5 p-2.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 rounded-lg dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        {isUploading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold py-1">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Processing upload...
          </div>
        ) : existingDocument ? (
          // Re-upload or Actions
          <>
            <button
              onClick={() => onPreviewClick(existingDocument.fileUrl, documentLabel)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-3 cursor-pointer transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              View File
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-3 cursor-pointer transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-upload
            </button>
            <button
              onClick={handleDelete}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/20 dark:hover:bg-rose-950/45 dark:text-rose-400 h-9 w-9 cursor-pointer transition-colors border border-rose-100 dark:border-rose-900/50 ml-auto"
              title="Delete Document"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          // Standard uploads options
          <>
            {/* Standard device file picker */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-3.5 cursor-pointer shadow-sm transition-colors"
            >
              <Upload className="h-3.5 w-3.5" />
              Device File
            </button>

            {/* Camera Capture */}
            <button
              onClick={startCamera}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-3 cursor-pointer transition-colors"
            >
              <Camera className="h-3.5 w-3.5" />
              Camera
            </button>

            {/* Google Drive Link */}
            <button
              onClick={() => setDriveModalOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground text-xs font-semibold px-3 cursor-pointer transition-colors"
            >
              <Link2 className="h-3.5 w-3.5" />
              Drive Link
            </button>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleDeviceUpload}
        className="hidden"
        accept=".pdf,image/*"
      />

      {/* 1. Google Drive Link Modal */}
      <Dialog open={driveModalOpen} onOpenChange={setDriveModalOpen}>
        <DialogContent className="max-w-md bg-card text-card-foreground">
          <DialogHeader>
            <DialogTitle className="font-bold">Google Drive Upload</DialogTitle>
            <DialogDescription>
              Link a shareable Google Drive file directly. Make sure the file sharing setting is set to **"Anyone with the link can view"**.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label htmlFor="driveUrl" className="font-semibold text-xs text-muted-foreground">Google Drive Link <span className="text-destructive">*</span></Label>
              <Input
                id="driveUrl"
                placeholder="https://drive.google.com/file/d/FILE_ID/view?usp=sharing"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="driveFileName" className="font-semibold text-xs text-muted-foreground">Display Name</Label>
              <Input
                id="driveFileName"
                placeholder={`e.g. Student_Aadhaar_${studentId.substring(18)}.pdf`}
                value={driveFileName}
                onChange={(e) => setDriveFileName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <button
              onClick={() => setDriveModalOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-border hover:bg-accent px-4 py-2 text-xs font-semibold text-muted-foreground cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDriveSubmit}
              className="inline-flex h-9 items-center justify-center rounded-lg bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-4 py-2 cursor-pointer shadow-xs transition-colors"
            >
              Register Link
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. Webcam Snapshot Modal */}
      <Dialog open={cameraModalOpen} onOpenChange={(open) => { if (!open) stopCamera(); }}>
        <DialogContent className="max-w-lg p-0 overflow-hidden bg-zinc-950 flex flex-col h-[70vh]">
          {/* Header overlay */}
          <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10 flex items-center justify-between text-white">
            <div>
              <DialogTitle className="font-bold text-sm">Webcam Document Scanner</DialogTitle>
              <DialogDescription className="text-[10px] text-zinc-400">
                Align document inside camera frame
              </DialogDescription>
            </div>
            <button 
              onClick={stopCamera}
              className="h-8 w-8 rounded-full bg-zinc-900/80 flex items-center justify-center hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <span className="text-white text-xs">✕</span>
            </button>
          </div>

          {/* Camera Viewport */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-zinc-950">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Targeting overlay boundary */}
            <div className="absolute inset-8 border-2 border-dashed border-primary/50 rounded-lg pointer-events-none flex items-center justify-center">
              <span className="text-[10px] bg-black/60 text-white/80 px-3 py-1 rounded-full uppercase tracking-wider font-semibold border border-white/10">
                Document Overlay Guide
              </span>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="bg-black p-5 flex justify-center border-t border-zinc-900 z-10">
            <button
              onClick={captureSnapshot}
              className="h-14 w-14 rounded-full border-4 border-white bg-red-600 flex items-center justify-center hover:bg-red-700 active:scale-95 transition-all shadow-md cursor-pointer"
              title="Capture Image"
            >
              <span className="h-4 w-4 bg-white rounded-full"></span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
