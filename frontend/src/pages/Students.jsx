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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals Visibility
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudentId, setViewingStudentId] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState({});

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

  const getUploadedCount = (student) => {
    if (!student?.documents) return 0;
    return Object.values(student.documents).filter((doc) => doc && doc.url).length;
  };

  // Class & Divisions
  const classesList = ['Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'];
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
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
            {t('students.studentDirectory')}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {t('students.subtitle')}
          </Paragraph>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Space>
            {/* Export Dropdown */}
            <Select
              placeholder={t('students.exportRecords')}
              dropdownMatchSelectWidth={false}
              suffixIcon={<DownloadOutlined />}
              style={{ width: 160 }}
              onChange={(val) => {
                if (!val) return;
                window.open(`/api/students/export/${val}?token=${localStorage.getItem('token')}`, '_blank');
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
    <div>
      {(studentsData?.data || []).map((student) => (
        <Card
          key={student._id}
          size="small"
          style={{
            marginBottom: 12,
            borderRadius: 12,
          }}
        >
          <div style={{ marginBottom: 8 }}>
            <strong>{student.name}</strong>
          </div>

          <div><strong>{t('students.grShort')}</strong> {student.grNumber}</div>
          <div><strong>{t('students.classShort')}</strong> {student.class} - {student.division}</div>
          <div><strong>{t('students.fatherShort')}</strong> {student.fatherName}</div>
          <div><strong>{t('students.mobileShort')}</strong> {student.mobile}</div>

          <div style={{ marginTop: 8 }}>
            <Tag color={getUploadedCount(student) === 9 ? 'success' : 'warning'}>
              {t('students.uploadedCount', { count: getUploadedCount(student), total: 9 })}
            </Tag>
          </div>

          <Space style={{ marginTop: 10 }}>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(student._id)}
            />

            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleOpenForm(student)}
            />

            <Popconfirm
              title={t('students.deleteStudentShort')}
              onConfirm={() => deleteMutation.mutate(student._id)}
            >
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Space>
        </Card>
      ))}
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
              <Col span={12}>
                <Form.Item name="name" label={t('students.studentFullName')} rules={[{ required: true, message: t('students.nameRequired') }]}>
                  <Input placeholder={t('students.studentNamePlaceholder')} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="grNumber" label={t('students.grNumber')} rules={[{ required: true, message: t('students.grRequired') }]}>
                  <Input placeholder={t('students.grPlaceholder')} disabled={!!editingStudent} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
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
              <Col span={8}>
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
              <Col span={8}>
                <Form.Item name="gender" label={t('students.gender')} rules={[{ required: true, message: t('students.genderRequired') }]}>
                  <Radio.Group>
                    <Radio value="male">{t('students.male')}</Radio>
                    <Radio value="female">{t('students.female')}</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dob" label={t('students.dob')} rules={[{ required: true, message: t('students.dobRequired') }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="mobile" label={t('students.mobileNumber')} rules={[{ required: true, message: t('students.mobileRequired') }]}>
                  <Input placeholder={t('students.mobilePlaceholder')} maxLength={10} />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ fontWeight: 600, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '10px' }}>
              {t('students.familyDetails')}
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="fatherName" label={t('students.fatherFullName')} rules={[{ required: true, message: t('students.fatherRequired') }]}>
                  <Input placeholder={t('students.fatherName')} />
                </Form.Item>
              </Col>
              <Col span={12}>
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
              <Col span={8}>
                <Form.Item name="village" label={t('students.village')}>
                  <Input placeholder={t('students.village')} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="taluka" label={t('students.taluka')}>
                  <Input placeholder={t('students.taluka')} />
                </Form.Item>
              </Col>
              <Col span={8}>
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
        title={t('students.portfolioTitle')}
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
                <Descriptions title={t('students.studentBio')} bordered size="small" column={2}>
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
                        <Col span={8} key={doc.key}>
                          <Card
                            size="small"
                            style={{
                              border: isUploaded ? '1px solid #a7f3d0' : '1px dashed #cbd5e1',
                              background: isDarkMode ? (isUploaded ? '#064e3b20' : 'transparent') : (isUploaded ? '#f0fdf4' : 'transparent'),
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'between',
                              height: '140px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'flex-start', width: '100%', marginBottom: 8 }}>
                              <Badge status={isUploaded ? 'success' : 'default'} />
                              <span style={{ fontWeight: 500, fontSize: 13, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                                {doc.name}
                              </span>
                            </div>

                            {isUploaded ? (
                              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'end', flex: 1 }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {docRecord.fileName}
                                </div>
                                <Space style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                                <Space>
  <Button
    type="link"
    size="small"
    icon={<EyeOutlined />}
    onClick={() => window.open(docRecord.url, '_blank')}
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
                                    />
                                  </Popconfirm>
                                </Space>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', flex: 1, height: '100%' }}>
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
                                    style={{ fontSize: 12 }}
                                  >
                                    {t('students.uploadFile')}
                                  </Button>
                                </Upload>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                                  {t('students.uploadHint')}
                                </span>
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
    </div>
  );
};
