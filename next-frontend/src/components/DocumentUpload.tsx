'use client';

import * as React from 'react';
import { Button } from './ui/button';
import { Camera, FileText, RefreshCw, Trash2, Upload, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import api from '@/lib/api';

interface DocumentUploadProps {
  studentId: string;
  documentType: string;
  documentName: string;
  docRecord?: {
    url: string;
    publicId: string;
    status: string;
    remarks: string;
    uploadDate: string;
  };
  onUploadSuccess: () => void;
}

export default function DocumentUpload({
  studentId,
  documentType,
  documentName,
  docRecord,
  onUploadSuccess,
}: DocumentUploadProps) {
  const [uploading, setUploading] = React.useState(false);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [stream, setStream] = React.useState<MediaStream | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // standard file input trigger
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const isUploaded = !!docRecord?.url;

  // 1. Device Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    await uploadFile(e.target.files[0]);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post(`/students/${studentId}/document/${documentType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data?.success) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  // 2. Camera Upload
  const startCamera = async () => {
    setCameraOpen(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Could not access camera. Make sure permissions are granted.');
      setCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], `${documentType}_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
          await uploadFile(file);
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  // 3. Google Drive Upload (utilizes the same Google SDK loader as index page)
  const handleDriveUpload = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;

    if (!clientId || !apiKey) {
      alert('Google Drive integration setup required. Please configure NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY in frontend environment.');
      return;
    }

    setUploading(true);
    try {
      // Lazy load SDKs
      await new Promise<void>((resolve, reject) => {
        if ((window as any).gapi && (window as any).google?.accounts?.oauth2) {
          resolve();
          return;
        }
        // Load scripts dynamically
        const scriptGapi = document.createElement('script');
        scriptGapi.src = 'https://apis.google.com/js/api.js';
        scriptGapi.async = true;
        
        const scriptGis = document.createElement('script');
        scriptGis.src = 'https://accounts.google.com/gsi/client';
        scriptGis.async = true;

        scriptGapi.onload = () => {
          scriptGis.onload = () => resolve();
          document.head.appendChild(scriptGis);
        };
        scriptGapi.onerror = reject;
        document.head.appendChild(scriptGapi);
      });

      // OAuth Flow
      const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error !== undefined) {
            throw tokenResponse;
          }
          openDrivePicker(tokenResponse.access_token, clientId, apiKey);
        },
      });
      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      console.error(err);
      alert('Google Picker loading failed.');
      setUploading(false);
    }
  };

  const openDrivePicker = (accessToken: string, clientId: string, apiKey: string) => {
    (window as any).gapi.load('picker', () => {
      const view = new (window as any).google.picker.DocsView((window as any).google.picker.ViewId.DOCS);
      view.setMimeTypes('image/jpeg,image/jpg,image/png,application/pdf');

      const picker = new (window as any).google.picker.PickerBuilder()
        .enableFeature((window as any).google.picker.Feature.NAV_HIDDEN)
        .setDeveloperKey(apiKey)
        .setAppId(clientId)
        .setOAuthToken(accessToken)
        .addView(view)
        .setCallback(async (data: any) => {
          if (data[(window as any).google.picker.Response.ACTION] === (window as any).google.picker.Action.PICKED) {
            const document = data[(window as any).google.picker.Response.DOCUMENTS][0];
            const fileId = document[(window as any).google.picker.Document.ID];
            const fileName = document[(window as any).google.picker.Document.NAME];
            const mimeType = document[(window as any).google.picker.Document.MIME_TYPE];
            await fetchAndUploadDriveFile(fileId, fileName, mimeType, accessToken);
          }
        })
        .build();
      picker.setVisible(true);
    });
  };

  const fetchAndUploadDriveFile = async (fileId: string, fileName: string, mimeType: string, token: string) => {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const file = new File([blob], fileName, { type: mimeType });
      await uploadFile(file);
    } catch (err) {
      console.error(err);
      alert('Failed to retrieve file content from Drive.');
      setUploading(false);
    }
  };

  // 4. Delete Document
  const handleDeleteDoc = async () => {
    if (!confirm('Are you sure you want to remove this document?')) return;
    setUploading(true);
    try {
      const response = await api.delete(`/students/${studentId}/document/${documentType}`);
      if (response.data?.success) {
        onUploadSuccess();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete document.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/50 flex flex-col justify-between h-full min-h-[160px]">
      <div>
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-semibold text-sm text-gray-950 dark:text-gray-100">{documentName}</h4>
          {isUploaded ? (
            <Badge
              variant={
                docRecord.status === 'Verified'
                  ? 'success'
                  : docRecord.status === 'Rejected'
                  ? 'destructive'
                  : 'warning'
              }
            >
              {docRecord.status}
            </Badge>
          ) : (
            <Badge variant="secondary">Missing</Badge>
          )}
        </div>

        {/* Remarks display */}
        {isUploaded && docRecord.remarks && (
          <p className="text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded mb-2 border border-red-100 dark:border-red-900/30">
            <strong>Remarks:</strong> {docRecord.remarks}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
        {isUploaded ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => window.open(docRecord.url, '_blank')}>
                View File
              </Button>
              <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                <RefreshCw size={14} className="mr-1" /> Re-upload
              </Button>
            </div>
            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleDeleteDoc}>
              <Trash2 size={16} />
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" className="flex flex-col h-14 text-xs gap-1" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              <Upload size={16} />
              <span>Device</span>
            </Button>

            <Button size="sm" variant="outline" className="flex flex-col h-14 text-xs gap-1" onClick={handleDriveUpload} disabled={uploading}>
              <FileText size={16} />
              <span>G-Drive</span>
            </Button>

            <Button size="sm" variant="outline" className="flex flex-col h-14 text-xs gap-1" onClick={startCamera} disabled={uploading}>
              <Camera size={16} />
              <span>Camera</span>
            </Button>
          </div>
        )}
      </div>

      {/* Hidden native input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,image/*"
        className="hidden"
      />

      {/* Camera Capture Dialog */}
      <Dialog open={cameraOpen} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Document Photo</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="relative overflow-hidden w-full aspect-video rounded-lg bg-black border border-gray-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex justify-between w-full">
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
              <Button onClick={capturePhoto} className="flex items-center gap-2">
                <Video size={16} /> Capture & Upload
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
