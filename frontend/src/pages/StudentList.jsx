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
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'SR Number',
      dataIndex: 'srNumber',
      key: 'srNumber',
      width: '110px',
      render: (text) => <span style={{ fontFamily: 'monospace' }}>{text || '-'}</span>,
    },
    {
      title: t('students.studentName', 'Student Name'),
      dataIndex: 'name',
      key: 'name',
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
      render: (_, record) => `${record.class} - ${record.division}`,
    },
    {
      title: 'Mobile',
      dataIndex: 'mobileNumber1',
      key: 'mobile',
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
                const baseUrl = import.meta.env.VITE_API_URL || 'https://docelex.onrender.com/api';
                window.open(`${baseUrl}/students/export/${val}?token=${localStorage.getItem('token')}`, '_blank');
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
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Mobile:</span>
                      <span style={{ fontWeight: 500 }}>{student.mobileNumber1}</span>
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
    </div>
  );
};
