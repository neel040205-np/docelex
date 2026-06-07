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

const { Option } = Select;
const { Title, Paragraph } = Typography;

export const Students = () => {
  const queryClient = useQueryClient();
  const isDarkMode = document.body.classList.contains('dark-theme');
  
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
      message.success('Student registered successfully.');
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
      message.success('Student records updated.');
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
      message.success('Student records deleted.');
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['stats']);
    },
  });

  // 6. Delete Document Mutation
  const deleteDocMutation = useMutation({
    mutationFn: ({ studentId, docType }) => client.delete(`/students/${studentId}/document/${docType}`),
    onSuccess: () => {
      message.success('Document deleted successfully.');
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
        message.success(`${docType.replace(/([A-Z])/g, ' $1')} uploaded successfully.`);
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
    { key: 'birthCertificate', name: 'Birth Certificate' },
    { key: 'studentAadhaar', name: 'Student Aadhaar' },
    { key: 'fatherAadhaar', name: 'Father Aadhaar' },
    { key: 'motherAadhaar', name: 'Mother Aadhaar' },
    { key: 'rationCard', name: 'Ration Card' },
    { key: 'addressProof', name: 'Address Proof' },
    { key: 'incomeCertificate', name: 'Income Certificate' },
    { key: 'casteCertificate', name: 'Caste Certificate' },
    { key: 'passportPhoto', name: 'Passport Photo' },
  ];

  // Table Columns Setup
  const columns = [
    {
      title: 'GR Number',
      dataIndex: 'grNumber',
      key: 'grNumber',
      width: '120px',
      render: (text) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Student Name',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 500, color: 'var(--primary-color)' }}>{text}</span>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Gender: {record.gender}</div>
        </div>
      ),
    },
    {
      title: 'Class / Div',
      key: 'classDiv',
      render: (_, record) => `${record.class} - ${record.division}`,
    },
    {
      title: 'Father Name',
      dataIndex: 'fatherName',
      key: 'fatherName',
    },
    {
      title: 'Mobile',
      dataIndex: 'mobile',
      key: 'mobile',
    },
    {
      title: 'Documents',
      key: 'documents',
      render: (_, record) => {
        const count = getUploadedCount(record);
        const complete = count === 9;
        return (
          <Tag color={complete ? 'success' : count > 4 ? 'warning' : 'error'}>
            {complete ? <CheckCircleOutlined style={{ marginRight: 4 }} /> : <ExclamationCircleOutlined style={{ marginRight: 4 }} />}
            {count} / 9 Uploaded
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '200px',
      render: (_, record) => (
        <Space size="middle">
          <Tooltip title="View Profiles & Upload Files">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#6366f1' }} />}
              onClick={() => handleViewDetails(record._id)}
            />
          </Tooltip>
          <Tooltip title="Edit Student Profile">
            <Button
              type="text"
              icon={<EditOutlined style={{ color: '#f59e0b' }} />}
              onClick={() => handleOpenForm(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete student records?"
            description="This will permanently delete the student and all uploaded documents."
            onConfirm={() => deleteMutation.mutate(record._id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Student">
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
            Student Directory
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Register students, filter profiles, and manage documentation files
          </Paragraph>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Space>
            {/* Export Dropdown */}
            <Select
              placeholder="Export Records"
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
                  <FilePdfOutlined style={{ color: '#ef4444' }} /> PDF Document
                </Space>
              </Option>
            </Select>

            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenForm()}
              style={{ borderRadius: '8px' }}
            >
              Add New Student
            </Button>
          </Space>
        </div>
      </div>

      {/* Filter Card */}
      <Card bordered={false} style={{ marginBottom: '24px', boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}>
        <Space size="middle" wrap style={{ width: '100%' }}>
          {/* Search Box */}
          <Input
            placeholder="Search Name or GR No."
            prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220 }}
            allowClear
          />

          {/* Class Select */}
          <Select
            placeholder="Filter by Class"
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
            placeholder="Filter by Div"
            value={selectedDiv || undefined}
            onChange={(val) => setSelectedDiv(val || '')}
            style={{ width: 140 }}
            allowClear
          >
            {divisionList.map((d) => (
              <Option key={d} value={d}>
                Division {d}
              </Option>
            ))}
          </Select>

          {/* Missing Document Filter */}
          <Select
            placeholder="Document Completeness"
            value={missingDocFilter || undefined}
            onChange={(val) => setMissingDocFilter(val || '')}
            style={{ width: 220 }}
            allowClear
          >
            <Option value="any">Missing ANY Document</Option>
            {documentTypes.map((doc) => (
              <Option key={doc.key} value={doc.key}>
                Missing: {doc.name}
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
              Clear Filters
            </Button>
          )}
        </Space>
      </Card>

      {/* Main Student Directory Table */}
      <Card bordered={false} style={{ boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}>
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
      </Card>

      {/* ---------------------------------------------------- */}
      {/* 1. Add / Edit Student Profile Modal */}
      {/* ---------------------------------------------------- */}
      <Modal
        title={editingStudent ? 'Edit Student Details' : 'Register New Student'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        footer={null}
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit} style={{ marginTop: '20px' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ fontWeight: 600, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
              Academic & Personal Profiles
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="name" label="Student Full Name" rules={[{ required: true, message: 'Name is required' }]}>
                  <Input placeholder="E.g. Rajesh Kumar" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="grNumber" label="GR Number" rules={[{ required: true, message: 'GR Number is required' }]}>
                  <Input placeholder="E.g. GR10294" disabled={!!editingStudent} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="class" label="Class" rules={[{ required: true, message: 'Class is required' }]}>
                  <Select placeholder="Select Class">
                    {classesList.map((c) => (
                      <Option key={c} value={c}>
                        {c}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="division" label="Division" rules={[{ required: true, message: 'Division is required' }]}>
                  <Select placeholder="Select Division">
                    {divisionList.map((d) => (
                      <Option key={d} value={d}>
                        {d}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="gender" label="Gender" rules={[{ required: true, message: 'Gender is required' }]}>
                  <Radio.Group>
                    <Radio value="male">Male</Radio>
                    <Radio value="female">Female</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="dob" label="Date of Birth" rules={[{ required: true, message: 'DOB is required' }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="mobile" label="Mobile Number" rules={[{ required: true, message: 'Mobile is required' }]}>
                  <Input placeholder="10 Digit Number" maxLength={10} />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ fontWeight: 600, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '10px' }}>
              Family Details
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="fatherName" label="Father Full Name" rules={[{ required: true, message: 'Father Name is required' }]}>
                  <Input placeholder="Father Name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="motherName" label="Mother Full Name" rules={[{ required: true, message: 'Mother Name is required' }]}>
                  <Input placeholder="Mother Name" />
                </Form.Item>
              </Col>
            </Row>

            <div style={{ fontWeight: 600, color: 'var(--primary-color)', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', marginTop: '10px' }}>
              Residential Address
            </div>
            <Form.Item name="address" label="Detailed Address" rules={[{ required: true, message: 'Address is required' }]}>
              <Input.TextArea rows={2} placeholder="House no, Society Name, Street address" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="village" label="Village">
                  <Input placeholder="Village" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="taluka" label="Taluka/Subdistrict">
                  <Input placeholder="Taluka" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="district" label="District">
                  <Input placeholder="District" />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', marginBottom: 0 }}>
              <Space>
                <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="primary" htmlType="submit">
                  {editingStudent ? 'Save Records' : 'Register Student'}
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
        title="Student Portfolio & File Vault"
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setViewingStudentId(null);
        }}
        footer={[
          <Button key="close" onClick={() => { setDetailOpen(false); setViewingStudentId(null); }}>
            Close Vault
          </Button>,
        ]}
        width={850}
        destroyOnClose
      >
        {detailsLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Spin size="large" tip="Retrieving profile folder..." />
          </div>
        ) : (
          (() => {
            const student = studentDetailData?.data;
            if (!student) return <div>Failed to load profile.</div>;
            return (
              <div style={{ marginTop: '16px' }}>
                {/* Profile Meta Cards */}
                <Descriptions title="Student Bio" bordered size="small" column={2}>
                  <Descriptions.Item label="Name" span={2}>
                    <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{student.name}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="GR Number">{student.grNumber}</Descriptions.Item>
                  <Descriptions.Item label="Class & Div">{student.class} - {student.division}</Descriptions.Item>
                  <Descriptions.Item label="DOB">
                    {student.dob ? new Date(student.dob).toLocaleDateString('en-GB') : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Gender" style={{ textTransform: 'capitalize' }}>
                    {student.gender}
                  </Descriptions.Item>
                  <Descriptions.Item label="Father Name">{student.fatherName}</Descriptions.Item>
                  <Descriptions.Item label="Mother Name">{student.motherName}</Descriptions.Item>
                  <Descriptions.Item label="Contact Mobile">{student.mobile}</Descriptions.Item>
                  <Descriptions.Item label="Registered Address" span={2}>
                    {student.address}
                    {student.village && `, Village: ${student.village}`}
                    {student.taluka && `, Taluka: ${student.taluka}`}
                    {student.district && `, Dist: ${student.district}`}
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
                    <span>Verification Folders ({getUploadedCount(student)} / 9 Completed)</span>
                    <Badge
                      status={getUploadedCount(student) === 9 ? 'success' : 'processing'}
                      text={getUploadedCount(student) === 9 ? 'Verifications Complete' : 'Pending Uploads'}
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
                                  <Button
                                    type="link"
                                    size="small"
                                    onClick={() => window.open(docRecord.url, '_blank')}
                                    style={{ padding: 0, fontSize: '12px' }}
                                  >
                                    View File
                                  </Button>
                                  <Popconfirm
                                    title="Remove this file?"
                                    onConfirm={() => deleteDocMutation.mutate({ studentId: student._id, docType: doc.key })}
                                    okText="Yes"
                                    cancelText="No"
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
                                    Upload File
                                  </Button>
                                </Upload>
                                <span style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4 }}>
                                  PDF or Images (Max 5MB)
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
