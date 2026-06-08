import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import { WebcamCapture } from '../components/WebcamCapture';
import {
  Card,
  Descriptions,
  Badge,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Upload,
  Modal,
  Input,
  Form,
  message,
  Spin,
  Typography,
  Divider,
  Popconfirm,
  Select,
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  DownloadOutlined,
  DeleteOutlined,
  UploadOutlined,
  GoogleOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;
const { Option } = Select; // wait, let's make sure Select is imported from antd! Let's import it in antd list.

export const StudentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDarkMode = document.body.classList.contains('dark-theme');

  // Webcam modal state
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [activeDocKey, setActiveDocKey] = useState('');
  const [activeDocName, setActiveDocName] = useState('');

  // Google Drive link modal state
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveLink, setDriveLink] = useState('');
  const [driveFileName, setDriveFileName] = useState('');

  const [uploadingDoc, setUploadingDoc] = useState({});

  // Fetch student details
  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student-details', id],
    queryFn: () => client.get(`/students/${id}`),
    enabled: !!id,
  });

  // Delete Document Mutation
  const deleteDocMutation = useMutation({
    mutationFn: ({ studentId, docType }) =>
      client.delete(`/students/${studentId}/document/${docType}`),
    onSuccess: () => {
      message.success('Document deleted successfully.');
      queryClient.invalidateQueries(['student-details', id]);
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['stats']);
    },
  });

  const student = studentData?.data;

  // File Upload Handlers
  const handleDocumentUpload = async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);

    setUploadingDoc((prev) => ({ ...prev, [docType]: true }));

    try {
      const response = await client.post(`/students/${id}/document/${docType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.success) {
        message.success(`${docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} uploaded successfully.`);
        queryClient.invalidateQueries(['student-details', id]);
        queryClient.invalidateQueries(['students']);
        queryClient.invalidateQueries(['stats']);
      }
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Upload failed.');
    } finally {
      setUploadingDoc((prev) => ({ ...prev, [docType]: false }));
    }
    return false;
  };

  // Google Drive integrations (Picker API fallback and direct share links)
  const loadGoogleSDKs = () => {
    return new Promise((resolve, reject) => {
      const loadGapi = new Promise((res, rej) => {
        if (window.gapi) {
          res();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = res;
        script.onerror = rej;
        document.head.appendChild(script);
      });

      const loadGis = new Promise((res, rej) => {
        if (window.google?.accounts?.oauth2) {
          res();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = res;
        script.onerror = rej;
        document.head.appendChild(script);
      });

      Promise.all([loadGapi, loadGis]).then(() => resolve()).catch(reject);
    });
  };

  const handleDriveFileFetchAndUpload = async (fileId, fileName, mimeType, token, docType) => {
    setUploadingDoc((prev) => ({ ...prev, [docType]: true }));
    const hideMessage = message.loading(`Downloading "${fileName}" from Google Drive...`, 0);

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const file = new File([blob], fileName, { type: mimeType });

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await client.post(`/students/${id}/document/${docType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (uploadResponse.success) {
        message.success(`${fileName} imported successfully.`);
        queryClient.invalidateQueries(['student-details', id]);
        queryClient.invalidateQueries(['students']);
        queryClient.invalidateQueries(['stats']);
      }
    } catch (error) {
      console.error(error);
      message.error(`Google Drive Fetch Failed: ${error.message}`);
    } finally {
      hideMessage();
      setUploadingDoc((prev) => ({ ...prev, [docType]: false }));
    }
  };

  const openPicker = (accessToken, clientId, apiKey, docType) => {
    gapi.load('picker', () => {
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS);
      view.setMimeTypes('image/jpeg,image/jpg,image/png,application/pdf');

      const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .setDeveloperKey(apiKey)
        .setAppId(clientId)
        .setOAuthToken(accessToken)
        .addView(view)
        .setCallback(async (data) => {
          if (data[google.picker.Response.ACTION] === google.picker.Action.PICKED) {
            const document = data[google.picker.Response.DOCUMENTS][0];
            const fileId = document[google.picker.Document.ID];
            const fileName = document[google.picker.Document.NAME];
            const mimeType = document[google.picker.Document.MIME_TYPE];

            await handleDriveFileFetchAndUpload(fileId, fileName, mimeType, accessToken, docType);
          }
        })
        .build();
      picker.setVisible(true);
    });
  };

  const launchGooglePicker = async (docType, clientId, apiKey) => {
    try {
      await loadGoogleSDKs();

      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (tokenResponse) => {
          if (tokenResponse.error !== undefined) {
            throw tokenResponse;
          }
          openPicker(tokenResponse.access_token, clientId, apiKey, docType);
        },
      });

      tokenClient.requestAccessToken({ prompt: 'select_account' });
    } catch (error) {
      console.error('Picker launch error:', error);
      message.error(`Google Picker initialization failed: ${error.message || 'Check configuration'}`);
    }
  };

  const handleOpenDrivePicker = async (docType) => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

    if (!clientId || clientId.includes('your-google-client-id') || !apiKey || apiKey.includes('your-google-api-key')) {
      // Fallback popup description
      Modal.info({
        title: 'Google Drive Integration Required',
        width: 500,
        content: (
          <div style={{ marginTop: '10px' }}>
            <p>Please configure your Google API keys in the <code>frontend/.env</code> file:</p>
            <pre style={{ background: 'var(--border-color)', padding: '8px', borderRadius: '4px', fontSize: '11px', fontFamily: 'monospace' }}>
              {`VITE_GOOGLE_CLIENT_ID=your_client_id_here\nVITE_GOOGLE_API_KEY=your_api_key_here`}
            </pre>
            <p style={{ marginTop: '10px' }}>You can also use the <strong>Upload via Link</strong> option below for copy-pasting Drive share URLs.</p>
          </div>
        ),
      });
      return;
    }

    await launchGooglePicker(docType, clientId, apiKey);
  };

  const handleOpenDriveModal = (docType, docName) => {
    setActiveDocKey(docType);
    setDriveLink('');
    setDriveFileName(`${docName.replace(/\s+/g, '_')}_Link.pdf`);
    setDriveModalOpen(true);
  };

  const submitDriveLink = async () => {
    if (!driveLink) {
      message.error('Please enter a Google Drive link.');
      return;
    }

    setUploadingDoc((prev) => ({ ...prev, [activeDocKey]: true }));
    setDriveModalOpen(false);

    try {
      const response = await client.post(`/students/${id}/document/${activeDocKey}`, {
        driveUrl: driveLink,
        fileName: driveFileName || `${activeDocKey}_Link.pdf`,
      });
      if (response.success) {
        message.success('Google Drive link saved successfully.');
        queryClient.invalidateQueries(['student-details', id]);
        queryClient.invalidateQueries(['students']);
        queryClient.invalidateQueries(['stats']);
      }
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Failed to save link.');
    } finally {
      setUploadingDoc((prev) => ({ ...prev, [activeDocKey]: false }));
    }
  };

  const getUploadedCount = () => {
    if (!student?.documents) return 0;
    return Object.values(student.documents).filter((doc) => doc && doc.url).length;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Verified':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'processing';
    }
  };

  const documentTypesList = [
    { key: 'birthCertificate', name: 'Birth Certificate' },
    { key: 'studentAadhaar', name: 'Student Aadhaar' },
    { key: 'fatherAadhaar', name: 'Father Aadhaar' },
    { key: 'motherAadhaar', name: 'Mother Aadhaar' },
    { key: 'rationCard', name: 'Ration Card' },
    { key: 'incomeCertificate', name: 'Income Certificate' },
    { key: 'studentCasteCertificate', name: 'Student Caste Certificate' },
    { key: 'fatherCasteCertificate', name: 'Father Caste Certificate' },
    { key: 'studentBankPassbook', name: 'Student Bank Passbook' },
    { key: 'fatherBankPassbook', name: 'Father Bank Passbook' },
    { key: 'motherBankPassbook', name: 'Mother Bank Passbook' },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Retrieving Student Portfolio folder..." />
      </div>
    );
  }

  if (!student) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Title level={3}>Student profile not found</Title>
        <Button onClick={() => navigate('/students')}>Go back to Directory</Button>
      </div>
    );
  }

  const handleDownloadZip = async () => {
    const hide = message.loading('Preparing zip download...', 0);
    try {
      const blob = await client.get(`/students/${student._id}/download-documents`, {
        responseType: 'blob',
      });

      // Try to parse the blob as text to check if it's JSON error
      const text = await blob.text();
      try {
        const json = JSON.parse(text);
        if (json && json.success === false) {
          message.error(json.message || 'Failed to download documents');
          hide();
          return;
        }
      } catch (e) {
        // Not a JSON string, proceed with binary download
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const rawName = student.firstName || student.name?.trim().split(/\s+/)[0] || 'student';
      const safeName = rawName.replace(/[^\w\s]/gi, '').replace(/\s+/g, '_').toLowerCase();
      a.download = `${safeName}-docs.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      if (err.response?.data instanceof Blob) {
        const text = await err.response.data.text();
        try {
          const json = JSON.parse(text);
          message.error(json.message || 'Failed to download zip');
          hide();
          return;
        } catch (e) {}
      }
      message.error(err.message || 'Failed to download zip');
    } finally {
      hide();
    }
  };

  const uploadedCount = getUploadedCount();

  return (
    <div className="animate-slide-up" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div
        style={{
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <Space size="middle">
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/students')} style={{ borderRadius: 6 }} />
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
              {student.surname} {student.firstName} {student.fatherName}
            </Title>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Folder: {student.grNumber} | Registered: {dayjs(student.createdAt).format('DD/MM/YYYY')}
            </Paragraph>
          </div>
        </Space>

        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/students/${student._id}/edit`)}
            style={{ borderRadius: 6 }}
          >
            Edit Profile
          </Button>
          <Button
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={() => navigate(`/students/${student._id}/verify`)}
            style={{ borderRadius: 6 }}
          >
            Verifier Panel
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={handleDownloadZip}
            style={{ borderRadius: 6 }}
          >
            Download Zip
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* Profile Details (Left Column) */}
        <Col xs={24} lg={10}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            
            {/* Overall Verification Status */}
            <Card
              bordered={false}
              style={{
                boxShadow: 'var(--shadow-premium)',
                borderRadius: 12,
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontWeight: 600, fontSize: 16 }}>Overall Verification</Text>
                <Tag color={getStatusColor(student.verificationStatus)} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {student.verificationStatus || 'Pending'}
                </Tag>
              </div>
            </Card>

            {/* BIO DESCRIPTION CARD */}
            <Card
              title="Student Master Profile"
              bordered={false}
              style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 12 }}
            >
              <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 140 }}>
                <Descriptions.Item label="Surname">{student.surname}</Descriptions.Item>
                <Descriptions.Item label="First Name">{student.firstName}</Descriptions.Item>
                <Descriptions.Item label="Father Name">{student.fatherName}</Descriptions.Item>
                <Descriptions.Item label="Grandfather Name">{student.grandFatherName}</Descriptions.Item>
                <Descriptions.Item label="Mother Name">{student.motherName}</Descriptions.Item>
                <Descriptions.Item label="GR Number">{student.grNumber}</Descriptions.Item>
                <Descriptions.Item label="SR Number">{student.srNumber}</Descriptions.Item>
                <Descriptions.Item label="Class & Div">{student.class} - {student.division}</Descriptions.Item>
                <Descriptions.Item label="Gender">{student.gender}</Descriptions.Item>
                <Descriptions.Item label="DOB">{dayjs(student.dob).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Admission Date">{dayjs(student.admissionDate).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Caste">{student.caste}</Descriptions.Item>
                <Descriptions.Item label="Category">{student.casteCategory}</Descriptions.Item>
                <Descriptions.Item label="PEN Number">{student.penNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="APAAR ID">{student.apaarId || '-'}</Descriptions.Item>
                <Descriptions.Item label="UDISE Number">{student.udiseNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Child Tracking Name">{student.nameAsPerChildTracking || '-'}</Descriptions.Item>
                <Descriptions.Item label="UDISE+ Name">{student.nameAsPerUdisePlus || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>

            {/* AADHAAR & BANK DETAILS CARD */}
            <Card
              title="Aadhaar & Bank Profiles"
              bordered={false}
              style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 12 }}
            >
              <Descriptions column={1} bordered size="small" labelStyle={{ fontWeight: 600, width: 140 }}>
                <Descriptions.Item label="Aadhaar No.">{student.aadhaarNumber}</Descriptions.Item>
                <Descriptions.Item label="Aadhaar Name">{student.nameAsPerAadhaar}</Descriptions.Item>
                <Descriptions.Item label="Aadhaar DOB">{dayjs(student.dobAsPerAadhaar).format('DD/MM/YYYY')}</Descriptions.Item>
                <Descriptions.Item label="Bank Account No.">{student.bankAccountNumber}</Descriptions.Item>
                <Descriptions.Item label="IFSC Code">{student.ifscCode}</Descriptions.Item>
                <Descriptions.Item label="Bank Holder">{student.accountHolderName}</Descriptions.Item>
                <Descriptions.Item label="Mother Aadhaar">{student.motherAadhaarNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Father Aadhaar">{student.fatherAadhaarNumber || '-'}</Descriptions.Item>
                <Descriptions.Item label="Primary Mobile">{student.mobileNumber1}</Descriptions.Item>
                <Descriptions.Item label="Alternative Mobile">{student.mobileNumber2 || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Space>
        </Col>

        {/* Document Folders (Right Column) */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <span>Verification File Vault</span>
                <Badge
                  status={uploadedCount === 11 ? 'success' : 'processing'}
                  text={`${uploadedCount} / 11 Completed`}
                />
              </div>
            }
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 12 }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {documentTypesList.map((doc) => {
                const docRecord = student.documents?.[doc.key];
                const isUploaded = !!(docRecord && docRecord.url);

                return (
                  <Card
                    key={doc.key}
                    size="small"
                    style={{
                      border: isUploaded ? '1px solid #a7f3d0' : '1px dashed #cbd5e1',
                      background: isUploaded
                        ? isDarkMode ? '#064e3b15' : '#f0fdf4'
                        : 'transparent',
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                      }}
                    >
                      {/* Left: Document Name and Status */}
                      <Space align="start">
                        <Badge status={isUploaded ? 'success' : 'default'} style={{ marginTop: 6 }} />
                        <div>
                          <Text style={{ fontWeight: 600, fontSize: 14 }}>{doc.name}</Text>
                          {isUploaded ? (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              File: {docRecord.fileName} | Date: {dayjs(docRecord.uploadDate).format('DD/MM/YYYY HH:mm')}
                            </div>
                          ) : (
                            <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                              Required Document. Please upload.
                            </div>
                          )}
                        </div>
                      </Space>

                      {/* Middle: Document Status Badge */}
                      {isUploaded && (
                        <Tag color={getStatusColor(docRecord.status)} style={{ margin: 0 }}>
                          {docRecord.status || 'Pending'}
                        </Tag>
                      )}

                      {/* Right: Actions */}
                      <div>
                        {isUploaded ? (
                          <Space>
                            <Button
                              type="link"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => window.open(docRecord.url, '_blank')}
                            >
                              View
                            </Button>
                            <Button
                              type="link"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => {
                                const downloadUrl = docRecord.url.replace('/upload/', '/upload/fl_attachment/');
                                window.open(downloadUrl, '_blank');
                              }}
                            >
                              Download
                            </Button>
                            <Popconfirm
                              title="Delete this document?"
                              description="This will physically delete the file."
                              onConfirm={() =>
                                deleteDocMutation.mutate({ studentId: student._id, docType: doc.key })
                              }
                              okText="Yes"
                              cancelText="No"
                            >
                              <Button type="text" size="small" icon={<DeleteOutlined style={{ color: '#ef4444' }} />} />
                            </Popconfirm>
                          </Space>
                        ) : (
                          <Space size={4}>
                            {/* Device Upload */}
                            <Upload
                              beforeUpload={(file) => handleDocumentUpload(file, doc.key)}
                              showUploadList={false}
                              maxCount={1}
                              accept=".pdf,image/*"
                            >
                              <Button
                                type="dashed"
                                size="small"
                                icon={<UploadOutlined />}
                                loading={uploadingDoc[doc.key]}
                              >
                                Device
                              </Button>
                            </Upload>

                            {/* Camera Scan */}
                            <Button
                              type="dashed"
                              size="small"
                              icon={<CameraOutlined />}
                              onClick={() => {
                                setActiveDocKey(doc.key);
                                setActiveDocName(doc.name);
                                setWebcamOpen(true);
                              }}
                            >
                              Camera
                            </Button>

                            {/* Drive Picker */}
                            <Button
                              type="dashed"
                              size="small"
                              icon={<GoogleOutlined style={{ color: '#4285F4' }} />}
                              onClick={() => handleOpenDrivePicker(doc.key)}
                            >
                              Drive
                            </Button>

                            {/* Drive Link Link */}
                            <Button
                              type="link"
                              size="small"
                              style={{ fontSize: 11, padding: 0 }}
                              onClick={() => handleOpenDriveModal(doc.key, doc.name)}
                            >
                              Link
                            </Button>
                          </Space>
                        )}
                      </div>
                    </div>

                    {/* Remarks warning if Rejected */}
                    {isUploaded && docRecord.status === 'Rejected' && docRecord.remarks && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '6px 10px',
                          background: '#fef2f2',
                          border: '1px solid #fca5a5',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#b91c1c',
                        }}
                      >
                        <strong>Rejection Remarks:</strong> {docRecord.remarks}
                      </div>
                    )}
                    {isUploaded && docRecord.status === 'Verified' && docRecord.remarks && (
                      <div
                        style={{
                          marginTop: 8,
                          padding: '6px 10px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: 4,
                          fontSize: 12,
                          color: '#166534',
                        }}
                      >
                        <strong>Remarks:</strong> {docRecord.remarks}
                      </div>
                    )}
                  </Card>
                );
              })}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Webcam Scan Modal */}
      <WebcamCapture
        open={webcamOpen}
        onCancel={() => setWebcamOpen(false)}
        onCapture={(file) => handleDocumentUpload(file, activeDocKey)}
        documentName={activeDocName}
      />

      {/* Google Drive Link Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GoogleOutlined style={{ color: '#4285F4', fontSize: 20 }} />
            <span>Link Google Drive File</span>
          </div>
        }
        open={driveModalOpen}
        onCancel={() => setDriveModalOpen(false)}
        onOk={submitDriveLink}
        okText="Submit"
        cancelText="Cancel"
        destroyOnClose
        width={480}
      >
        <div style={{ marginTop: 16 }}>
          <Form layout="vertical">
            <Form.Item
              label="Google Drive Shareable Link"
              required
              help="Please ensure link access is set to 'Anyone with the link can view'."
            >
              <Input
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                prefix={<GoogleOutlined style={{ color: 'var(--text-secondary)' }} />}
              />
            </Form.Item>

            <Form.Item label="Document File Name">
              <Input
                placeholder="e.g. Birth_Certificate.pdf"
                value={driveFileName}
                onChange={(e) => setDriveFileName(e.target.value)}
              />
            </Form.Item>
          </Form>
        </div>
      </Modal>
    </div>
  );
};
