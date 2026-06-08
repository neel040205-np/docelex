import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  DatePicker,
  Radio,
  Tag,
  Descriptions,
  Upload,
  message,
  Card,
  Popconfirm,
  Badge,
  Tooltip,
  Typography,
  Row,
  Col,
  Spin,
  Progress,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  UploadOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  GoogleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Grid } from 'antd';
import { useTranslation } from 'react-i18next';


const { useBreakpoint } = Grid;

const { Option } = Select;
const { Title, Paragraph } = Typography;

export const Students = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isDarkMode = document.body.classList.contains('dark-theme');

  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  // Search & Filters State
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [missingDocFilter, setMissingDocFilter] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals Visibility
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudentId, setViewingStudentId] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState({});
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [currentDocKey, setCurrentDocKey] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [driveFileName, setDriveFileName] = useState('');

  const [form] = Form.useForm();

  // 1. Fetch Students List
  const { data: studentsData, isLoading, refetch } = useQuery({
    queryKey: ['students', page, pageSize, search, selectedClass, selectedDiv, missingDocFilter],
    queryFn: () =>
      client.get('/students', {
        params: {
          page,
          limit: pageSize,
          search,
          class: selectedClass,
          division: selectedDiv,
          missingDocument: missingDocFilter,
        },
      }),
  });

  // 2. Fetch Single Student Details for Modal
  const { data: studentDetailData, isLoading: detailsLoading } = useQuery({
    queryKey: ['student-detail', viewingStudentId],
    queryFn: () => client.get(`/students/${viewingStudentId}`),
    enabled: !!viewingStudentId,
  });

  // 3. Create Student Mutation
  const createMutation = useMutation({
    mutationFn: (newStudent) => client.post('/students', newStudent),
    onSuccess: () => {
      message.success(t('students.registeredSuccess'));
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['stats']);
      setFormOpen(false);
      form.resetFields();
    },
  });

  // 4. Update Student Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => client.put(`/students/${id}`, data),
    onSuccess: () => {
      message.success(t('students.updatedSuccess'));
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['student-detail', viewingStudentId]);
      queryClient.invalidateQueries(['stats']);
      setFormOpen(false);
      setEditingStudent(null);
      form.resetFields();
    },
  });

  // 5. Delete Student Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/students/${id}`),
    onSuccess: () => {
      message.success(t('students.deletedSuccess'));
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['stats']);
    },
  });

  // 6. Delete Document Mutation
  const deleteDocMutation = useMutation({
    mutationFn: ({ studentId, docType }) => client.delete(`/students/${studentId}/document/${docType}`),
    onSuccess: () => {
      message.success(t('students.documentDeletedSuccess'));
      queryClient.invalidateQueries(['student-detail', viewingStudentId]);
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['stats']);
    },
  });

  // Handlers
  const handleOpenForm = (student = null) => {
    if (student) {
      setEditingStudent(student);
      form.setFieldsValue({
        ...student,
        dob: dayjs(student.dob),
      });
    } else {
      setEditingStudent(null);
      form.resetFields();
    }
    setFormOpen(true);
  };

  const handleFormSubmit = (values) => {
    const formattedValues = {
      ...values,
      dob: values.dob.format('YYYY-MM-DD'),
    };

    if (editingStudent) {
      updateMutation.mutate({ id: editingStudent._id, data: formattedValues });
    } else {
      createMutation.mutate(formattedValues);
    }
  };

  const handleViewDetails = (id) => {
    setViewingStudentId(id);
    setDetailOpen(true);
  };

  const handleDocumentUpload = async (file, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    
    setUploadingDoc((prev) => ({ ...prev, [docType]: true }));

    try {
      const response = await client.post(`/students/${viewingStudentId}/document/${docType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.success) {
        message.success(t('students.documentUploadedSuccess', { document: t(`documents.${docType}`) }));
        queryClient.invalidateQueries(['student-detail', viewingStudentId]);
        queryClient.invalidateQueries(['students']);
        queryClient.invalidateQueries(['stats']);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingDoc((prev) => ({ ...prev, [docType]: false }));
    }
    return false; // Prevent auto Upload of AntD
  };

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
      
      const uploadResponse = await client.post(`/students/${viewingStudentId}/document/${docType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      if (uploadResponse.success) {
        message.success(t('students.documentUploadedSuccess', { document: t(`documents.${docType}`) }));
        queryClient.invalidateQueries(['student-detail', viewingStudentId]);
        queryClient.invalidateQueries(['students']);
        queryClient.invalidateQueries(['stats']);
      }
    } catch (error) {
      console.error(error);
      message.error(`Failed to fetch file from Google Drive: ${error.message}`);
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
    setCurrentDocKey(docType);
    
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    
    if (!clientId || clientId.includes('your-google-client-id') || !apiKey || apiKey.includes('your-google-api-key')) {
      Modal.info({
        title: 'Google Drive Integration Setup Required',
        width: 500,
        content: (
          <div style={{ marginTop: '10px' }}>
            <p>To browse and pick files directly from Google Drive, please configure your Google API credentials.</p>
            <p><strong>Setup Steps:</strong></p>
            <ol style={{ paddingLeft: '20px' }}>
              <li style={{ marginBottom: '6px' }}>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.</li>
              <li style={{ marginBottom: '6px' }}>Enable the <strong>Google Drive API</strong> and <strong>Google Picker API</strong> for your project.</li>
              <li style={{ marginBottom: '6px' }}>Create an <strong>OAuth 2.0 Client ID</strong> (Web Application) and add your app's origin URL (e.g. <code>http://localhost:5173</code>) to authorized origins.</li>
              <li style={{ marginBottom: '6px' }}>Create an <strong>API Key</strong>.</li>
              <li style={{ marginBottom: '6px' }}>Add these to the <code>frontend/.env</code> file in your workspace:
                <pre style={{ background: 'var(--border-color)', padding: '8px', borderRadius: '4px', marginTop: '6px', fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                  {`VITE_GOOGLE_CLIENT_ID=your_client_id_here\nVITE_GOOGLE_API_KEY=your_api_key_here`}
                </pre>
              </li>
            </ol>
            <p style={{ marginTop: '10px' }}><em>After updating the environment file, please restart your Vite development server.</em></p>
          </div>
        ),
        okText: 'Understood',
      });
      return;
    }
    
    await launchGooglePicker(docType, clientId, apiKey);
  };

  const handleOpenDriveModal = (docType) => {
    setCurrentDocKey(docType);
    setDriveLink('');
    // Pre-populate fileName with a nice descriptive name
    const docNameTranslated = t(`documents.${docType}`).replace(/\s+/g, '_');
    setDriveFileName(`${docNameTranslated}_Link.pdf`);
    setDriveModalOpen(true);
  };

  const submitDriveLink = async () => {
    if (!driveLink) {
      message.error(t('students.driveLinkRequired', 'Please enter a Google Drive link'));
      return;
    }
    
    if (!driveLink.startsWith('http://') && !driveLink.startsWith('https://')) {
      message.error(t('students.invalidUrl', 'Please enter a valid URL'));
      return;
    }

    setUploadingDoc((prev) => ({ ...prev, [currentDocKey]: true }));
    setDriveModalOpen(false);

    try {
      const response = await client.post(`/students/${viewingStudentId}/document/${currentDocKey}`, {
        driveUrl: driveLink,
        fileName: driveFileName || `${currentDocKey}_Link.pdf`
      });
      if (response.success) {
        message.success(t('students.documentUploadedSuccess', { document: t(`documents.${currentDocKey}`) }));
        queryClient.invalidateQueries(['student-detail', viewingStudentId]);
        queryClient.invalidateQueries(['students']);
        queryClient.invalidateQueries(['stats']);
      }
    } catch (err) {
      console.error(err);
      message.error(err.message || 'Failed to upload link');
    } finally {
      setUploadingDoc((prev) => ({ ...prev, [currentDocKey]: false }));
    }
  };

  const getUploadedCount = (student) => {
    if (!student?.documents) return 0;
    return Object.values(student.documents).filter((doc) => doc && doc.url).length;
  };

  // Class & Divisions
  const classesList = ['Balvatika', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  const divisionList = ['A', 'B', 'C', 'D'];

  const documentTypes = [
    { key: 'birthCertificate', name: t('documents.birthCertificate') },
    { key: 'studentAadhaar', name: t('documents.studentAadhaar') },
    { key: 'fatherAadhaar', name: t('documents.fatherAadhaar') },
    { key: 'motherAadhaar', name: t('documents.motherAadhaar') },
    { key: 'rationCard', name: t('documents.rationCard') },
    { key: 'addressProof', name: t('documents.addressProof') },
    { key: 'incomeCertificate', name: t('documents.incomeCertificate') },
    { key: 'casteCertificate', name: t('documents.casteCertificate') },
    { key: 'passportPhoto', name: t('documents.passportPhoto') },
  ];

  // Table Columns Setup
  const columns = [
    {
      title: t('students.grNumber'),
      dataIndex: 'grNumber',
      key: 'grNumber',
      width: '120px',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: t('students.studentName'),
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 500, color: 'var(--primary-color)' }}>{text}</span>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            {t('students.genderLabel', { gender: record.gender })}
          </div>
        </div>
      ),
    },
    {
      title: t('students.classDiv'),
      key: 'classDiv',
      render: (_, record) => `${record.class} - ${record.division}`,
    },
    {
      title: t('students.fatherName'),
      dataIndex: 'fatherName',
      key: 'fatherName',
    },
    {
      title: t('students.mobile'),
      dataIndex: 'mobile',
      key: 'mobile',
    },
    {
      title: t('students.documents'),
      key: 'documents',
      render: (_, record) => {
        const count = getUploadedCount(record);
        const complete = count === 9;
        return (
          <Tag color={complete ? 'success' : count > 4 ? 'warning' : 'error'}>
            {complete ? <CheckCircleOutlined style={{ marginRight: 4 }} /> : <ExclamationCircleOutlined style={{ marginRight: 4 }} />}
            {t('students.uploadedCount', { count, total: 9 })}
          </Tag>
        );
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: '200px',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title={t('students.viewProfileUpload')}>
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#6366f1' }} />}
              onClick={() => handleViewDetails(record._id)}
            />
          </Tooltip>
          <Tooltip title={t('students.editProfile')}>
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#f59e0b' }} />}
              onClick={() => handleOpenForm(record)}
            />
          </Tooltip>
          <Popconfirm
            title={t('students.deleteStudentTitle')}
            description={t('students.deleteStudentDescription')}
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText={t('common.yes')}
            cancelText={t('common.no')}
          >
            <Tooltip title={t('students.deleteStudent')}>
              <Button type="text" icon={<DeleteOutlined style={{ color: '#ef4444' }} />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="animate-slide-up">
      {/* Directory Title */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
            {t('students.studentDirectory')}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {t('students.subtitle')}
          </Paragraph>
        </div>
        <div style={{ marginLeft: isMobile ? '0' : 'auto', width: isMobile ? '100%' : 'auto' }}>
          <Space style={{ width: '100%', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
            {/* Export Dropdown */}
            <Select
              placeholder={t('students.exportRecords')}
              dropdownMatchSelectWidth={false}
              suffixIcon={<DownloadOutlined />}
              style={{ width: isMobile ? 140 : 160 }}
              onChange={(val) => {
                if (!val) return;
                const baseUrl = import.meta.env.VITE_API_URL || 'https://docelex.onrender.com/api';
                window.open(`${baseUrl}/students/export/${val}?token=${localStorage.getItem('token')}`, '_blank');
              }}
            >
              <Option value="excel">
                <Space>
                  <FileExcelOutlined style={{ color: '#10b981' }} /> {t('students.excel')}
                </Space>
              </Option>
              <Option value="csv">
                <Space>
                  <FileTextOutlined style={{ color: '#6366f1' }} /> {t('students.csv')}
                </Space>
              </Option>
              <Option value="pdf">
                <Space>
                  <FilePdfOutlined style={{ color: '#ef4444' }} /> {t('students.pdfDocument')}
                </Space>
              </Option>
            </Select>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenForm()}
              style={{ borderRadius: '8px' }}
            >
              {t('students.addStudent')}
            </Button>
          </Space>
        </div>
      </div>

      {/* Filter Card */}
      <Card bordered={false} style={{ marginBottom: '24px', boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Input
                placeholder={t('students.searchPlaceholder')}
                prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1 }}
                allowClear
              />
              <Button 
                type={showMobileFilters ? "primary" : "default"}
                icon={<SearchOutlined />} 
                onClick={() => setShowMobileFilters(!showMobileFilters)}
              >
                {t('common.filters', 'Filters')}
              </Button>
            </div>
            
            {showMobileFilters && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                {/* Class Select */}
                <Select
                  placeholder={t('students.filterByClass')}
                  value={selectedClass || undefined}
                  onChange={(val) => setSelectedClass(val || '')}
                  style={{ width: '100%' }}
                  allowClear
                >
                  {classesList.map((c) => (
                    <Option key={c} value={c}>
                      {c}
                    </Option>
                  ))}
                </Select>

                {/* Division Select */}
                <Select
                  placeholder={t('students.filterByDivision')}
                  value={selectedDiv || undefined}
                  onChange={(val) => setSelectedDiv(val || '')}
                  style={{ width: '100%' }}
                  allowClear
                >
                  {divisionList.map((d) => (
                    <Option key={d} value={d}>
                      {t('students.division')} {d}
                    </Option>
                  ))}
                </Select>

                {/* Missing Document Filter */}
                <Select
                  placeholder={t('students.documentCompleteness')}
                  value={missingDocFilter || undefined}
                  onChange={(val) => setMissingDocFilter(val || '')}
                  style={{ width: '100%' }}
                  allowClear
                >
                  <Option value="any">{t('students.missingAnyDocument')}</Option>
                  {documentTypes.map((doc) => (
                    <Option key={doc.key} value={doc.key}>
                      {t('students.missingDocument', { document: doc.name })}
                    </Option>
                  ))}
                </Select>

                {/* Reset Filters */}
                {(search || selectedClass || selectedDiv || missingDocFilter) && (
                  <Button
                    danger
                    onClick={() => {
                      setSearch('');
                      setSelectedClass('');
                      setSelectedDiv('');
                      setMissingDocFilter('');
                    }}
                    style={{ width: '100%' }}
                  >
                    {t('common.clearFilters')}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <Space size="middle" wrap style={{ width: '100%' }}>
            {/* Search Box */}
            <Input
              placeholder={t('students.searchPlaceholder')}
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 220 }}
              allowClear
            />

            {/* Class Select */}
            <Select
              placeholder={t('students.filterByClass')}
              value={selectedClass || undefined}
              onChange={(val) => setSelectedClass(val || '')}
              style={{ width: 160 }}
              allowClear
            >
              {classesList.map((c) => (
                <Option key={c} value={c}>
                  {c}
                </Option>
              ))}
            </Select>

            {/* Division Select */}
            <Select
              placeholder={t('students.filterByDivision')}
              value={selectedDiv || undefined}
              onChange={(val) => setSelectedDiv(val || '')}
              style={{ width: 140 }}
              allowClear
            >
              {divisionList.map((d) => (
                <Option key={d} value={d}>
                  {t('students.division')} {d}
                </Option>
              ))}
            </Select>

            {/* Missing Document Filter */}
            <Select
              placeholder={t('students.documentCompleteness')}
              value={missingDocFilter || undefined}
              onChange={(val) => setMissingDocFilter(val || '')}
              style={{ width: 220 }}
              allowClear
            >
              <Option value="any">{t('students.missingAnyDocument')}</Option>
              {documentTypes.map((doc) => (
                <Option key={doc.key} value={doc.key}>
                  {t('students.missingDocument', { document: doc.name })}
                </Option>
              ))}
            </Select>

            {/* Reset Filters */}
            {(search || selectedClass || selectedDiv || missingDocFilter) && (
              <Button
                onClick={() => {
                  setSearch('');
                  setSelectedClass('');
                  setSelectedDiv('');
                  setMissingDocFilter('');
                }}
              >
                {t('common.clearFilters')}
              </Button>
            )}
          </Space>
        )}
      </Card>

      {/* Main Student Directory Table */}
      <Card
  bordered={false}
  style={{
    boxShadow: 'var(--shadow-premium)',
    background: 'var(--bg-card)',
  }}
>
  {isMobile ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {(studentsData?.data || []).map((student) => {
        const uploadedCount = getUploadedCount(student);
        const completionRate = Math.round((uploadedCount / 9) * 100);
        
        // Initials helper
        const nameParts = student.name ? student.name.split(' ').filter(Boolean) : [];
        const initials = nameParts.length > 1 
          ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
          : (nameParts[0] ? nameParts[0].substring(0, 2).toUpperCase() : 'ST');
          
        return (
          <Card
            key={student._id}
            bordered={false}
            className="mobile-student-card"
            styles={{ body: { padding: '16px' } }}
          >
            {/* Header: Avatar, Name, GR Number */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
              <div className={`student-avatar ${student.gender === 'female' ? 'female' : 'male'}`}>
                {initials}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {student.name}
                </h4>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    GR: <strong>{student.grNumber}</strong>
                  </span>
                  <Tag color="purple" style={{ margin: 0, fontSize: '10px', paddingInline: '4px', lineHeight: '1.4' }}>
                    {student.class} - {student.division}
                  </Tag>
                </div>
              </div>
            </div>

            {/* Details Rows */}
            <div style={{ background: isDarkMode ? '#1f293d40' : '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px' }}>
              <div className="mobile-card-row">
                <span className="mobile-card-label">{t('students.fatherName')}</span>
                <span className="mobile-card-value">{student.fatherName}</span>
              </div>
              <div className="mobile-card-row" style={{ marginBottom: 0 }}>
                <span className="mobile-card-label">{t('students.mobileNumber')}</span>
                <span className="mobile-card-value" style={{ fontFamily: 'monospace' }}>{student.mobile}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {t('students.documents')}
                </span>
                <span style={{ fontSize: '11px', fontWeight: 600, color: uploadedCount === 9 ? '#10b981' : '#f59e0b' }}>
                  {uploadedCount}/9 {t('students.uploaded')}
                </span>
              </div>
              <Progress 
                percent={completionRate} 
                size="small" 
                status={uploadedCount === 9 ? "success" : "normal"}
                strokeColor={uploadedCount === 9 ? '#10b981' : '#6366f1'}
                showInfo={false}
              />
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
              <Button
                type="primary"
                ghost
                size="middle"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetails(student._id)}
                style={{ borderRadius: '6px', fontSize: '12px' }}
              >
                {t('students.viewProfileUpload')}
              </Button>
              
              <Space>
                <Button
                  size="middle"
                  icon={<EditOutlined style={{ color: '#f59e0b' }} />}
                  onClick={() => handleOpenForm(student)}
                  style={{ borderRadius: '6px' }}
                />
                
                <Popconfirm
                  title={t('students.deleteStudentShort')}
                  onConfirm={() => deleteMutation.mutate(student._id)}
                  okText={t('common.yes')}
                  cancelText={t('common.no')}
                >
                  <Button
                    danger
                    size="middle"
                    icon={<DeleteOutlined />}
                    style={{ borderRadius: '6px' }}
                  />
                </Popconfirm>
              </Space>
            </div>
          </Card>
        );
      })}
    </div>
  ) : (
    <Table
      columns={columns}
      dataSource={studentsData?.data || []}
      rowKey="_id"
      loading={isLoading}
      pagination={{
        current: page,
        pageSize: pageSize,
        total: studentsData?.pagination?.total || 0,
        showSizeChanger: true,
        onChange: (p, ps) => {
          setPage(p);
          setPageSize(ps);
        },
      }}
    />
  )}
</Card>

      {/* ---------------------------------------------------- */}
      {/* 1. Add / Edit Student Profile Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={editingStudent ? t('students.editStudentDetails') : t('students.registerNewStudent')}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: '20px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ fontWeight: 600, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
              {t('students.academicPersonalProfiles')}
            </div>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="name" label={t('students.studentFullName')} rules={[{ required: true, message: t('students.nameRequired') }]}>
                  <Input placeholder={t('students.studentNamePlaceholder')} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="grNumber" label={t('students.grNumber')} rules={[{ required: true, message: t('students.grRequired') }]}>
                  <Input placeholder={t('students.grPlaceholder')} disabled={!!editingStudent} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="class" label={t('students.class')} rules={[{ required: true, message: t('students.classRequired') }]}>
                  <Select placeholder={t('students.selectClass')}>
                    {classesList.map((c) => (
                      <Option key={c} value={c}>
                        {c}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Form.Item name="division" label={t('students.division')} rules={[{ required: true, message: t('students.divisionRequired') }]}>
                  <Select placeholder={t('students.selectDivision')}>
                    {divisionList.map((d) => (
                      <Option key={d} value={d}>
                        {d}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="gender" label={t('students.gender')} rules={[{ required: true, message: t('students.genderRequired') }]}>
                  <Radio.Group>
                    <Radio value="male">{t('students.male')}</Radio>
                    <Radio value="female">{t('students.female')}</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="dob" label={t('students.dob')} rules={[{ required: true, message: t('students.dobRequired') }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="mobile" label={t('students.mobileNumber')} rules={[{ required: true, message: t('students.mobileRequired') }]}>
                  <Input placeholder={t('students.mobilePlaceholder')} maxLength={10} />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ fontWeight: 600, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '10px' }}>
              {t('students.familyDetails')}
            </div>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="fatherName" label={t('students.fatherFullName')} rules={[{ required: true, message: t('students.fatherRequired') }]}>
                  <Input placeholder={t('students.fatherName')} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="motherName" label={t('students.motherFullName')} rules={[{ required: true, message: t('students.motherRequired') }]}>
                  <Input placeholder={t('students.motherName')} />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ fontWeight: 600, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '10px' }}>
              {t('students.residentialAddress')}
            </div>
            <Form.Item name="address" label={t('students.detailedAddress')} rules={[{ required: true, message: t('students.addressRequired') }]}>
              <Input.TextArea rows={2} placeholder={t('students.addressPlaceholder')} />
            </Form.Item>

            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Form.Item name="village" label={t('students.village')}>
                  <Input placeholder={t('students.village')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="taluka" label={t('students.taluka')}>
                  <Input placeholder={t('students.taluka')} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item name="district" label={t('students.district')}>
                  <Input placeholder={t('students.district')} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', marginBottom: 0 }}>
              <Space>
                <Button onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
                <Button type="primary" htmlType="submit">
                  {editingStudent ? t('students.saveRecords') : t('students.registerStudent')}
                </Button>
              </Space>
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      {/* ---------------------------------------------------- */}
      {/* 2. Detailed Profile & Document Management Pane Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: '24px' }}>
            <span>{t('students.portfolioTitle')}</span>
            {studentDetailData?.data && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="small"
                onClick={() => {
                  const baseUrl = import.meta.env.VITE_API_URL || 'https://docelex.onrender.com/api';
                  window.open(`${baseUrl}/students/${viewingStudentId}/download-documents?token=${localStorage.getItem('token')}`, '_blank');
                }}
                style={{ borderRadius: '6px' }}
              >
                {t('students.downloadAll', 'Download All')}
              </Button>
            )}
          </div>
        }
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setViewingStudentId(null);
        }}
        footer={[
          <Button key="close" onClick={() => { setDetailOpen(false); setViewingStudentId(null); }}>
            {t('students.closeVault')}
          </Button>,
        ]}
        width={850}
        destroyOnClose
      >
        {detailsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" tip={t('students.retrievingProfile')} />
          </div>
        ) : (
          (() => {
            const student = studentDetailData?.data;
            if (!student) return <div>{t('students.failedProfile')}</div>;
            return (
              <div style={{ marginTop: '16px' }}>
                {/* Profile Meta Cards */}
                <Descriptions title={t('students.studentBio')} bordered size="small" column={{ xs: 1, sm: 1, md: 2 }}>
                  <Descriptions.Item label={t('students.name')} span={2}>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{student.name}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label={t('students.grNumber')}>{student.grNumber}</Descriptions.Item>
                  <Descriptions.Item label={t('students.classAndDiv')}>{student.class} - {student.division}</Descriptions.Item>
                  <Descriptions.Item label={t('students.dob')}>
                    {student.dob ? new Date(student.dob).toLocaleDateString('en-GB') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('students.gender')} style={{ textTransform: 'capitalize' }}>
                    {student.gender}
                  </Descriptions.Item>
                  <Descriptions.Item label={t('students.fatherName')}>{student.fatherName}</Descriptions.Item>
                  <Descriptions.Item label={t('students.motherName')}>{student.motherName}</Descriptions.Item>
                  <Descriptions.Item label={t('students.contactMobile')}>{student.mobile}</Descriptions.Item>
                  <Descriptions.Item label={t('students.registeredAddress')} span={2}>
                    {student.address}
                    {student.village && `, ${t('students.villageInline', { value: student.village })}`}
                    {student.taluka && `, ${t('students.talukaInline', { value: student.taluka })}`}
                    {student.district && `, ${t('students.districtInline', { value: student.district })}`}
                  </Descriptions.Item>
                </Descriptions>

                {/* Documents Management Panel */}
                <div style={{ marginTop: '24px' }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '15px',
                      color: 'var(--text-primary)',
                      marginBottom: '12px',
                      borderBottom: '2px solid var(--primary-color)',
                      paddingBottom: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <span>{t('students.verificationFolders', { count: getUploadedCount(student), total: 9 })}</span>
                    <Badge
                      status={getUploadedCount(student) === 9 ? 'success' : 'processing'}
                      text={getUploadedCount(student) === 9 ? t('students.verificationsComplete') : t('students.pendingUploads')}
                    />
                  </div>

                  <Row gutter={[16, 16]}>
                    {documentTypes.map((doc) => {
                      const docRecord = student.documents?.[doc.key];
                      const isUploaded = !!(docRecord && docRecord.url);

                      return (
                        <Col xs={24} sm={12} md={8} key={doc.key}>
                          <Card
                            size="small"
                            style={{
                              border: isUploaded ? '1px solid #a7f3d0' : '1px dashed #cbd5e1',
                              background: isDarkMode ? (isUploaded ? '#064e3b20' : 'transparent') : (isUploaded ? '#f0fdf4' : 'transparent'),
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              minHeight: '140px',
                              height: '100%',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: 8 }}>
                              <Badge status={isUploaded ? 'success' : 'default'} style={{ marginTop: 4, marginRight: 8 }} />
                              <span style={{ fontWeight: 600, fontSize: 13, flex: 1, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {doc.name}
                              </span>
                            </div>

                            {isUploaded ? (
                              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'end', flex: 1 }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {docRecord.fileName}
                                </div>
                                <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '4px' }}>
                                  <Space size={4}>
                                    <Button
                                      type="link"
                                      size="small"
                                      icon={<EyeOutlined />}
                                      onClick={() => window.open(docRecord.url, '_blank')}
                                      style={{ padding: '0 4px', height: 'auto' }}
                                    >
                                      {t('common.view')}
                                    </Button>

                                    <Button
                                      type="link"
                                      size="small"
                                      icon={<DownloadOutlined />}
                                      onClick={() => {
                                        const downloadUrl = docRecord.url.replace(
                                          '/upload/',
                                          '/upload/fl_attachment/'
                                        );
                                        window.open(downloadUrl, '_blank');
                                      }}
                                      style={{ padding: '0 4px', height: 'auto' }}
                                    >
                                      {t('common.download')}
                                    </Button>
                                  </Space>

                                  <Popconfirm
                                    title={t('students.removeFileTitle')}
                                    onConfirm={() => deleteDocMutation.mutate({ studentId: student._id, docType: doc.key })}
                                    okText={t('common.yes')}
                                    cancelText={t('common.no')}
                                  >
                                    <Button
                                      type="text"
                                      size="small"
                                      icon={<DeleteOutlined style={{ color: '#ef4444' }} />}
                                      style={{ height: 'auto', padding: '0 4px' }}
                                    />
                                  </Popconfirm>
                                </Space>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, height: '100%', gap: '6px', width: '100%' }}>
                                <Upload
                                  beforeUpload={(file) => handleDocumentUpload(file, doc.key)}
                                  showUploadList={false}
                                  maxCount={1}
                                  accept=".pdf,image/*"
                                  style={{ width: '100%', display: 'block' }}
                                >
                                  <Button
                                    type="dashed"
                                    size="small"
                                    icon={<UploadOutlined />}
                                    loading={uploadingDoc[doc.key]}
                                    style={{ fontSize: 11, width: '100%' }}
                                  >
                                    {t('students.uploadFromComputer', 'Upload from Device')}
                                  </Button>
                                </Upload>

                                <Button
                                  type="dashed"
                                  size="small"
                                  icon={<GoogleOutlined style={{ color: '#4285F4' }} />}
                                  onClick={() => handleOpenDrivePicker(doc.key)}
                                  loading={uploadingDoc[doc.key]}
                                  style={{ fontSize: 11, width: '100%' }}
                                >
                                  {t('students.googleDriveDirect', 'Google Drive')}
                                </Button>

                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => handleOpenDriveModal(doc.key)}
                                  style={{ fontSize: 10, padding: 0, height: 'auto' }}
                                >
                                  {t('students.uploadViaLink', 'Upload via Link')}
                                </Button>
                              </div>
                            )}
                          </Card>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              </div>
            );
          })()
        )}
      </Modal>
      {/* 3. Google Drive Link Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GoogleOutlined style={{ color: '#4285F4', fontSize: '20px' }} />
            <span>{t('students.uploadFromDrive', 'Upload from Google Drive')}</span>
          </div>
        }
        open={driveModalOpen}
        onCancel={() => setDriveModalOpen(false)}
        onOk={submitDriveLink}
        okText={t('common.submit', 'Submit')}
        cancelText={t('common.cancel', 'Cancel')}
        destroyOnClose
        width={480}
      >
        <div style={{ marginTop: '16px' }}>
          <Form layout="vertical">
            <Form.Item
              label={t('students.googleDriveLink', 'Google Drive Shareable Link')}
              required
              help={t('students.driveLinkHint', 'Make sure the file sharing permission is set to "Anyone with the link can view".')}
            >
              <Input
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                prefix={<GoogleOutlined style={{ color: 'var(--text-secondary)' }} />}
              />
            </Form.Item>
            
            <Form.Item
              label={t('students.fileName', 'Document File Name')}
            >
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
