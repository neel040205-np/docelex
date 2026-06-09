import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  message,
  Card,
  Popconfirm,
  Tooltip,
  Typography,
  Badge,
  Progress,
  Grid,
  Modal,
  Upload,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SafetyCertificateOutlined,
  UploadOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { useBreakpoint } = Grid;
const { Option } = Select;
const { Title, Paragraph } = Typography;

export const StudentList = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isDarkMode = document.body.classList.contains('dark-theme');

  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Search & Filters State
  const [search, setSearch] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDiv, setSelectedDiv] = useState('');
  const [casteCategory, setCasteCategory] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [admissionYear, setAdmissionYear] = useState('');
  const [missingDocFilter, setMissingDocFilter] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  // Excel/CSV Import State
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [defaultClass, setDefaultClass] = useState('');
  const [defaultDivision, setDefaultDivision] = useState('');
  const [defaultMobile, setDefaultMobile] = useState('');

  const handleImportSubmit = async () => {
    if (fileList.length === 0) {
      message.error(t('students.selectImportFile', 'Please select a file to import first.'));
      return;
    }
    const file = fileList[0];
    const formData = new FormData();
    formData.append('file', file);
    if (defaultClass) formData.append('defaultClass', defaultClass);
    if (defaultDivision) formData.append('defaultDivision', defaultDivision);
    if (defaultMobile) formData.append('defaultMobile', defaultMobile);

    setImporting(true);
    setImportResult(null);

    try {
      const response = await client.post('/students/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success) {
        message.success(t('students.importSuccess', 'Spreadsheet import processed successfully.'));
        setImportResult(response);
        queryClient.invalidateQueries(['students']);
        queryClient.invalidateQueries(['stats']);
      } else {
        message.error(response.message || t('students.importFailed', 'Import failed.'));
      }
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || err.message || t('students.importFailed', 'Import failed.'));
    } finally {
      setImporting(false);
    }
  };

  const handleCloseImportModal = () => {
    setImportModalOpen(false);
    setFileList([]);
    setImportResult(null);
    setImporting(false);
    setDefaultClass('');
    setDefaultDivision('');
    setDefaultMobile('');
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setPage(pagination.current);
    setPageSize(pagination.pageSize);
    
    if (sorter && sorter.field) {
      setSortBy(sorter.field);
      setSortOrder(sorter.order === 'descend' ? 'desc' : 'asc');
    } else {
      setSortBy('');
      setSortOrder('');
    }
  };

  const uploadProps = {
    onRemove: (file) => {
      setFileList([]);
    },
    beforeUpload: (file) => {
      const isExcelOrCsv = ['.csv', '.xlsx', '.xls'].some(ext => file.name.toLowerCase().endsWith(ext));
      if (!isExcelOrCsv) {
        message.error(t('students.invalidImportFormat', 'You can only upload Excel (.xlsx, .xls) or CSV (.csv) files.'));
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      return false; // prevent auto-upload
    },
    fileList,
    maxCount: 1,
  };

  // 1. Fetch Students List
  const { data: studentsData, isLoading } = useQuery({
    queryKey: [
      'students',
      page,
      pageSize,
      search,
      selectedClass,
      selectedDiv,
      casteCategory,
      verificationStatus,
      admissionYear,
      missingDocFilter,
      sortBy,
      sortOrder,
    ],
    queryFn: () =>
      client.get('/students', {
        params: {
          page,
          limit: pageSize,
          search,
          class: selectedClass,
          division: selectedDiv,
          casteCategory,
          verificationStatus,
          admissionYear,
          missingDocument: missingDocFilter,
          sortBy,
          sortOrder,
        },
      }),
  });

  // 2. Delete Student Mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => client.delete(`/students/${id}`),
    onSuccess: () => {
      message.success(t('students.deletedSuccess', 'Student records deleted successfully.'));
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['stats']);
    },
  });

  const getUploadedCount = (student) => {
    if (!student?.documents) return 0;
    return Object.values(student.documents).filter((doc) => doc && doc.url).length;
  };

  const getStatusTagColor = (status) => {
    switch (status) {
      case 'Verified':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'processing';
    }
  };

  // Lists for dropdowns
  const classesList = ['Balvatika', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  const divisionList = ['A', 'B', 'C', 'D'];
  const categoriesList = ['General', 'OBC', 'SC', 'ST', 'EWS'];
  const statusList = ['Pending', 'Verified', 'Rejected'];
  const yearsList = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i));

  const documentTypes = [
    { key: 'birthCertificate', name: t('documents.birthCertificate', 'Birth Certificate') },
    { key: 'studentAadhaar', name: t('documents.studentAadhaar', 'Student Aadhaar') },
    { key: 'fatherAadhaar', name: t('documents.fatherAadhaar', 'Father Aadhaar') },
    { key: 'motherAadhaar', name: t('documents.motherAadhaar', 'Mother Aadhaar') },
    { key: 'rationCard', name: t('documents.rationCard', 'Ration Card') },
    { key: 'incomeCertificate', name: t('documents.incomeCertificate', 'Income Certificate') },
    { key: 'studentCasteCertificate', name: t('documents.studentCasteCertificate', 'Student Caste Certificate') },
    { key: 'fatherCasteCertificate', name: t('documents.fatherCasteCertificate', 'Father Caste Certificate') },
    { key: 'studentBankPassbook', name: t('documents.studentBankPassbook', 'Student Bank Passbook') },
    { key: 'fatherBankPassbook', name: t('documents.fatherBankPassbook', 'Father Bank Passbook') },
    { key: 'motherBankPassbook', name: t('documents.motherBankPassbook', 'Mother Bank Passbook') },
  ];

  // Table Columns Setup
  const columns = [
    {
      title: t('students.grNumber', 'GR Number'),
      dataIndex: 'grNumber',
      key: 'grNumber',
      width: '110px',
      sorter: true,
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'SR Number',
      dataIndex: 'srNumber',
      key: 'srNumber',
      width: '110px',
      sorter: true,
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>,
    },
    {
      title: t('students.studentName', 'Student Name'),
      dataIndex: 'name',
      key: 'name',
      sorter: true,
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 500, color: 'var(--primary-color)' }}>
            {record.surname} {record.firstName} {record.fatherName}
          </span>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            Gender: {record.gender} | Category: {record.casteCategory}
          </div>
        </div>
      ),
    },
    {
      title: t('students.classDiv', 'Class / Div'),
      key: 'classDiv',
      dataIndex: 'class',
      sorter: true,
      render: (_, record) => `${record.class} - ${record.division}`,
    },
    {
      title: 'Mobile Number',
      dataIndex: 'mobileNumber1',
      key: 'mobile',
      width: '130px',
    },
    {
      title: 'Aadhaar Number',
      dataIndex: 'aadhaarNumber',
      key: 'aadhaar',
      width: '140px',
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>,
    },
    {
      title: 'Verification Status',
      dataIndex: 'verificationStatus',
      key: 'verificationStatus',
      render: (status) => (
        <Tag color={getStatusTagColor(status)}>
          {status === 'Verified' ? (
            <CheckCircleOutlined style={{ marginRight: 4 }} />
          ) : status === 'Rejected' ? (
            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
          ) : (
            <Badge status="processing" style={{ marginRight: 4 }} />
          )}
          {status || 'Pending'}
        </Tag>
      ),
    },
    {
      title: t('students.documents', 'Documents'),
      key: 'documents',
      render: (_, record) => {
        const count = getUploadedCount(record);
        const complete = count === 11;
        return (
          <Tag color={complete ? 'success' : count > 5 ? 'warning' : 'error'}>
            {t('students.uploadedCount', { count, total: 11 })}
          </Tag>
        );
      },
    },
    {
      title: t('common.actions', 'Actions'),
      key: 'actions',
      width: '210px',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Profile Folder">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#6366f1' }} />}
              onClick={() => navigate(`/students/${record._id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit Profile Details">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#f59e0b' }} />}
              onClick={() => navigate(`/students/${record._id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="Verifier Panel">
            <Button
              type="text"
              icon={<SafetyCertificateOutlined style={{ color: '#10b981' }} />}
              onClick={() => navigate(`/students/${record._id}/verify`)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete student records?"
            description="This will permanently delete the student and all uploaded documents."
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Student Record">
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
            {t('students.studentDirectory', 'Student Master Directory')}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {t('students.subtitle', 'Register students, filter profiles, and manage documentation files')}
          </Paragraph>
        </div>
        <div style={{ marginLeft: isMobile ? '0' : 'auto', width: isMobile ? '100%' : 'auto' }}>
          <Space style={{ width: '100%', justifyContent: isMobile ? 'space-between' : 'flex-end' }}>
            {/* Export Dropdown */}
            <Select
              placeholder={t('students.exportRecords', 'Export Records')}
              dropdownMatchSelectWidth={false}
              suffixIcon={<DownloadOutlined />}
              style={{ width: isMobile ? 140 : 160 }}
              onChange={(val) => {
                if (!val) return;
                window.open(`${client.defaults.baseURL}/students/export/${val}?token=${localStorage.getItem('token')}`, '_blank');
              }}
            >
              <Option value="excel">
                <Space>
                  <FileExcelOutlined style={{ color: '#10b981' }} /> Excel (.xlsx)
                </Space>
              </Option>
              <Option value="csv">
                <Space>
                  <FileTextOutlined style={{ color: '#6366f1' }} /> CSV (.csv)
                </Space>
              </Option>
              <Option value="pdf">
                <Space>
                  <FilePdfOutlined style={{ color: '#ef4444' }} /> PDF Report
                </Space>
              </Option>
            </Select>

            <Button
              type="default"
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
              style={{ borderRadius: '8px' }}
            >
              {t('students.importSpreadsheet', 'Import Excel/CSV')}
            </Button>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/students/new')}
              style={{ borderRadius: '8px' }}
            >
              {t('students.addStudent', 'Add Student')}
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
                placeholder="Search Name, GR, SR, Aadhaar, Mobile"
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
                Filters
              </Button>
            </div>

            {showMobileFilters && (
              <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                <Select placeholder="Filter by Class" value={selectedClass || undefined} onChange={(val) => setSelectedClass(val || '')} style={{ width: '100%' }} allowClear>
                  {classesList.map((c) => (
                    <Option key={c} value={c}>{c}</Option>
                  ))}
                </Select>

                <Select placeholder="Filter by Division" value={selectedDiv || undefined} onChange={(val) => setSelectedDiv(val || '')} style={{ width: '100%' }} allowClear>
                  {divisionList.map((d) => (
                    <Option key={d} value={d}>Division {d}</Option>
                  ))}
                </Select>

                <Select placeholder="Caste Category" value={casteCategory || undefined} onChange={(val) => setCasteCategory(val || '')} style={{ width: '100%' }} allowClear>
                  {categoriesList.map((cat) => (
                    <Option key={cat} value={cat}>{cat}</Option>
                  ))}
                </Select>

                <Select placeholder="Verification Status" value={verificationStatus || undefined} onChange={(val) => setVerificationStatus(val || '')} style={{ width: '100%' }} allowClear>
                  {statusList.map((status) => (
                    <Option key={status} value={status}>{status}</Option>
                  ))}
                </Select>

                <Select placeholder="Admission Year" value={admissionYear || undefined} onChange={(val) => setAdmissionYear(val || '')} style={{ width: '100%' }} allowClear>
                  {yearsList.map((y) => (
                    <Option key={y} value={y}>{y}</Option>
                  ))}
                </Select>

                <Select placeholder="Missing Document" value={missingDocFilter || undefined} onChange={(val) => setMissingDocFilter(val || '')} style={{ width: '100%' }} allowClear>
                  <Option value="any">Missing ANY Document</Option>
                  {documentTypes.map((doc) => (
                    <Option key={doc.key} value={doc.key}>Missing: {doc.name}</Option>
                  ))}
                </Select>

                {(search || selectedClass || selectedDiv || casteCategory || verificationStatus || admissionYear || missingDocFilter) && (
                  <Button
                    danger
                    onClick={() => {
                      setSearch('');
                      setSelectedClass('');
                      setSelectedDiv('');
                      setCasteCategory('');
                      setVerificationStatus('');
                      setAdmissionYear('');
                      setMissingDocFilter('');
                    }}
                    style={{ width: '100%' }}
                  >
                    Clear All Filters
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <Space size="middle" wrap style={{ width: '100%' }}>
            <Input
              placeholder="Search Name, GR, SR, Aadhaar, Mobile..."
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 240 }}
              allowClear
            />

            <Select placeholder="Class" value={selectedClass || undefined} onChange={(val) => setSelectedClass(val || '')} style={{ width: 110 }} allowClear>
              {classesList.map((c) => (
                <Option key={c} value={c}>{c}</Option>
              ))}
            </Select>

            <Select placeholder="Div" value={selectedDiv || undefined} onChange={(val) => setSelectedDiv(val || '')} style={{ width: 90 }} allowClear>
              {divisionList.map((d) => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Select>

            <Select placeholder="Category" value={casteCategory || undefined} onChange={(val) => setCasteCategory(val || '')} style={{ width: 120 }} allowClear>
              {categoriesList.map((cat) => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>

            <Select placeholder="Verification" value={verificationStatus || undefined} onChange={(val) => setVerificationStatus(val || '')} style={{ width: 130 }} allowClear>
              {statusList.map((status) => (
                <Option key={status} value={status}>{status}</Option>
              ))}
            </Select>

            <Select placeholder="Adm Year" value={admissionYear || undefined} onChange={(val) => setAdmissionYear(val || '')} style={{ width: 110 }} allowClear>
              {yearsList.map((y) => (
                <Option key={y} value={y}>{y}</Option>
              ))}
            </Select>

            <Select placeholder="Missing Document" value={missingDocFilter || undefined} onChange={(val) => setMissingDocFilter(val || '')} style={{ width: 180 }} allowClear>
              <Option value="any">Missing ANY Document</Option>
              {documentTypes.map((doc) => (
                <Option key={doc.key} value={doc.key}>{doc.name}</Option>
              ))}
            </Select>

            {(search || selectedClass || selectedDiv || casteCategory || verificationStatus || admissionYear || missingDocFilter) && (
              <Button
                onClick={() => {
                  setSearch('');
                  setSelectedClass('');
                  setSelectedDiv('');
                  setCasteCategory('');
                  setVerificationStatus('');
                  setAdmissionYear('');
                  setMissingDocFilter('');
                }}
              >
                Clear Filters
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
              const completionRate = Math.round((uploadedCount / 11) * 100);

              const nameParts = `${student.surname} ${student.firstName}`.split(' ').filter(Boolean);
              const initials = nameParts.length > 1
                ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
                : (nameParts[0] ? nameParts[0].substring(0, 2).toUpperCase() : 'ST');

              return (
                <Card
                  key={student._id}
                  bordered={false}
                  className="mobile-student-card"
                  styles={{ body: { padding: '16px' } }}
                  style={{ marginBottom: '12px', background: isDarkMode ? '#1e293b' : '#ffffff', border: '1px solid var(--border-color)', borderRadius: '12px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
                    <div className={`student-avatar ${student.gender?.toLowerCase() === 'female' ? 'female' : 'male'}`}>
                      {initials}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, marginLeft: '12px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {student.surname} {student.firstName} {student.fatherName}
                      </h4>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          GR: <strong>{student.grNumber}</strong> | SR: <strong>{student.srNumber || '-'}</strong>
                        </span>
                        <Tag color="purple" style={{ margin: 0, fontSize: '10px', paddingInline: '4px', lineHeight: '1.4' }}>
                          {student.class} - {student.division}
                        </Tag>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: isDarkMode ? '#33415540' : '#f8fafc', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Status:</span>
                      <Tag color={getStatusTagColor(student.verificationStatus)} style={{ marginRight: 0 }}>
                        {student.verificationStatus || 'Pending'}
                      </Tag>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Mobile:</span>
                      <span style={{ fontWeight: 500 }}>{student.mobileNumber1}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Aadhaar:</span>
                      <span style={{ fontWeight: 500, fontFamily: 'monospace' }}>{student.aadhaarNumber || '-'}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)' }}>Documents</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: uploadedCount === 11 ? '#10b981' : '#f59e0b' }}>
                        {uploadedCount}/11 Uploaded
                      </span>
                    </div>
                    <Progress
                      percent={completionRate}
                      size="small"
                      status={uploadedCount === 11 ? "success" : "normal"}
                      strokeColor={uploadedCount === 11 ? '#10b981' : '#6366f1'}
                      showInfo={false}
                    />
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                    <Button
                      type="primary"
                      ghost
                      size="middle"
                      icon={<EyeOutlined />}
                      onClick={() => navigate(`/students/${student._id}`)}
                      style={{ borderRadius: '6px', fontSize: '12px' }}
                    >
                      View Folder
                    </Button>
                    <Space>
                      <Button
                        size="middle"
                        icon={<EditOutlined style={{ color: '#f59e0b' }} />}
                        onClick={() => navigate(`/students/${student._id}/edit`)}
                        style={{ borderRadius: '6px' }}
                      />
                      <Button
                        size="middle"
                        icon={<SafetyCertificateOutlined style={{ color: '#10b981' }} />}
                        onClick={() => navigate(`/students/${student._id}/verify`)}
                        style={{ borderRadius: '6px' }}
                      />
                      <Popconfirm
                        title="Delete student?"
                        onConfirm={() => deleteMutation.mutate(student._id)}
                        okText="Yes"
                        cancelText="No"
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
            onChange={handleTableChange}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: studentsData?.pagination?.total || 0,
              showSizeChanger: true,
            }}
          />
        )}
      </Card>

      {/* ---------------------------------------------------- */}
      {/* Excel / CSV Directory Importer Modal                 */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={t('students.importModalTitle', 'Import Student Directory')}
        open={importModalOpen}
        onCancel={handleCloseImportModal}
        width={650}
        destroyOnClose
        footer={[
          <Button key="close" onClick={handleCloseImportModal}>
            {t('common.close', 'Close')}
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={importing}
            onClick={handleImportSubmit}
            disabled={fileList.length === 0}
          >
            {t('students.importNow', 'Import Now')}
          </Button>,
        ]}
      >
        <div style={{ padding: '12px 0' }}>
          <Paragraph>
            Upload a spreadsheet (<strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong>) to automatically register new students or bulk-update existing details using matching <strong>SR</strong> or <strong>GR</strong>.
          </Paragraph>

          {/* Fallback settings for missing columns */}
          <div style={{ marginBottom: '16px', padding: '16px', background: isDarkMode ? '#1f1f1f' : '#fafafa', borderRadius: '8px', border: '1px solid var(--border-color, #d9d9d9)' }}>
            <Title level={5} style={{ marginTop: 0, marginBottom: '12px', fontSize: '13px' }}>Fallback Import Fields (Defaults)</Title>
            <Paragraph style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              If your spreadsheet is missing columns for <strong>Class</strong> or <strong>Division</strong>, select fallbacks here. You can also specify a default <strong>Class Teacher's Mobile Number</strong> to be added to imported student profiles.
            </Paragraph>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1.5fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Class</label>
                <Select
                  placeholder="Select Class"
                  value={defaultClass || undefined}
                  onChange={(val) => setDefaultClass(val || '')}
                  style={{ width: '100%' }}
                  allowClear
                >
                  {classesList.map(c => <Option key={c} value={c}>{c}</Option>)}
                </Select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Division</label>
                <Select
                  placeholder="Select Div"
                  value={defaultDivision || undefined}
                  onChange={(val) => setDefaultDivision(val || '')}
                  style={{ width: '100%' }}
                  allowClear
                >
                  {divisionList.map(d => <Option key={d} value={d}>{d}</Option>)}
                </Select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>Class Teacher's Mobile Number</label>
                <Input
                  placeholder="Teacher's Mobile Number"
                  value={defaultMobile}
                  onChange={(e) => setDefaultMobile(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <Upload.Dragger {...uploadProps} style={{ padding: '20px', background: 'var(--bg-card)', border: '2px dashed var(--border-color)' }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: '#1890ff', fontSize: '48px' }} />
            </p>
            <p className="ant-upload-text">Click or drag Excel/CSV file to this area to upload</p>
            <p className="ant-upload-hint">Support for single file upload only. Max size 10MB.</p>
          </Upload.Dragger>

          {/* Import Result Status */}
          {importResult && (
            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-body, #fafafa)', borderRadius: '8px', border: '1px solid var(--border-color, #d9d9d9)' }}>
              <Title level={5} style={{ marginTop: 0 }}>Import Summary</Title>
              <Space size="large" style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '16px' }}>
                <div style={{ textAlign: 'center' }}>
                  <Badge count={importResult.summary.created} showZero color="#52c41a" />
                  <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>Registered</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Badge count={importResult.summary.updated} showZero color="#1890ff" />
                  <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>Updated</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <Badge count={importResult.summary.failed} showZero color="#ff4d4f" />
                  <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>Failed</div>
                </div>
              </Space>

              {importResult.errors && importResult.errors.length > 0 && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#ff4d4f', marginBottom: '6px' }}>Validation Errors:</div>
                  <div style={{
                    maxHeight: '180px',
                    overflowY: 'auto',
                    padding: '10px',
                    background: isDarkMode ? '#2d1c20' : '#fff1f0',
                    border: '1px solid #ffccc7',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontFamily: 'monospace',
                    color: isDarkMode ? '#ff7875' : '#a8071a'
                  }}>
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} style={{ marginBottom: '4px' }}>• {err}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guide section */}
          <div style={{ marginTop: '16px', background: 'var(--bg-body, #f5f5f5)', padding: '16px', borderRadius: '8px' }}>
            <Title level={5} style={{ marginTop: 0, fontSize: '14px' }}>Column Mapping Guide</Title>
            <Paragraph style={{ fontSize: '13px', marginBottom: '8px' }}>
              The importer automatically maps headers based on spelling. Ensure either <strong>SR</strong> or <strong>GR</strong> is present in each row.
            </Paragraph>
            <div style={{ maxHeight: '150px', overflowY: 'auto', fontSize: '12px' }}>
              <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: '1.6' }}>
                <li><strong>SR:</strong> "SR", "SR Number", "srno", "sr_no"</li>
                <li><strong>GR:</strong> "GR", "GR Number", "grno", "gr_no"</li>
                <li><strong>Basic Info:</strong> "First Name", "Surname", "Father Name", "Mother Name", "Gender", "DOB" / "Date of Birth"</li>
                <li><strong>School Info:</strong> "Class", "Division", "Admission Date"</li>
                <li><strong>Aadhaar:</strong> "Aadhaar Number", "Name as per Aadhaar", "DOB as per Aadhaar"</li>
                <li><strong>Bank Details:</strong> "Bank Account Number", "IFSC Code", "Account Holder Name"</li>
                <li><strong>Family:</strong> "Mobile Number 1", "Mobile Number 2", "Mother Aadhaar Number", "Father Aadhaar Number"</li>
                <li><strong>Identifiers:</strong> "PEN Number", "APAAR ID", "UDISE Number"</li>
              </ul>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
