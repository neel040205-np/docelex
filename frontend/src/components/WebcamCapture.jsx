import React, { useRef, useState, useEffect } from 'react';
import { Modal, Button, Space, Alert } from 'antd';
import { CameraOutlined, CheckCircleOutlined } from '@ant-design/icons';

export const WebcamCapture = ({ open, onCancel, onCapture, documentName }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  // Start webcam stream
  const startCamera = async () => {
    setCameraError(null);
    setPhotoData(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Default to back camera on mobile
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Webcam access error:', err);
      setCameraError('Could not access camera. Please check camera permissions in your browser.');
    }
  };

  // Stop webcam stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  // Capture frame
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Sync canvas sizing with video stream aspect ratio
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get Data URL
    const dataUrl = canvas.toDataURL('image/jpeg');
    setPhotoData(dataUrl);
    stopCamera();
  };

  // Retake photo
  const retakePhoto = () => {
    setPhotoData(null);
    startCamera();
  };

  // Submit photo file
  const submitPhoto = () => {
    if (!photoData) return;

    // Convert base64 to File object
    const arr = photoData.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    const fileName = `${documentName.replace(/\s+/g, '_')}_Camera_${Date.now()}.jpg`;
    const file = new File([u8arr], fileName, { type: mime });
    onCapture(file);
    onCancel();
  };

  return (
    <Modal
      title={`Scan Document: ${documentName}`}
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={640}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '16px 0', gap: 16 }}>
        {cameraError && (
          <Alert
            message="Camera Access Error"
            description={cameraError}
            type="error"
            showIcon
            style={{ width: '100%' }}
          />
        )}

        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 480,
            aspectRatio: '4/3',
            background: '#000000',
            borderRadius: 8,
            overflow: 'hidden',
            boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
          }}
        >
          {/* Live Video Feeds */}
          {!photoData && !cameraError && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Captured Preview */}
          {photoData && (
            <img
              src={photoData}
              alt="Snapshot"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Canvas for rendering frame */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div style={{ marginTop: 8 }}>
          <Space size="middle">
            {!photoData && !cameraError && (
              <Button
                type="primary"
                icon={<CameraOutlined />}
                size="large"
                onClick={capturePhoto}
                style={{ borderRadius: 8 }}
              >
                Capture Document
              </Button>
            )}

            {photoData && (
              <>
                <Button
                  icon={<CameraOutlined />}
                  size="large"
                  onClick={retakePhoto}
                  style={{ borderRadius: 8 }}
                >
                  Retake
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  size="large"
                  onClick={submitPhoto}
                  style={{ borderRadius: 8 }}
                >
                  Confirm & Upload
                </Button>
              </>
            )}

            <Button
              danger
              size="large"
              onClick={onCancel}
              style={{ borderRadius: 8 }}
            >
              Cancel
            </Button>
          </Space>
        </div>
      </div>
    </Modal>
  );
};
