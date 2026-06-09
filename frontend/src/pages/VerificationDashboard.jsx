import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Input,
  Form,
  message,
  Spin,
  Typography,
  Divider,
  Alert,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

export const VerificationDashboard = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [remarksState, setRemarksState] = useState({});

  // 1. Fetch Student Details
  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student-details', id],
    queryFn: () => client.get(`/students/${id}`),
    enabled: !!id,
  });

  // 2. Verify Document Mutation
  const verifyMutation = useMutation({
    mutationFn: ({ docType, status, remarks }) =>
      client.put(`/students/${id}/document/${docType}/verify`, { status, remarks }),
    onSuccess: (_, variables) => {
      message.success(
        `Marked ${variables.docType.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} as ${variables.status}!`
      );
      queryClient.invalidateQueries(['student-details', id]);
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['stats']);
    },
    onError: (err) => {
      message.error(err.message || 'Failed to update verification status.');
    },
  });

  const student = studentData?.data;

  const handleVerify = (docType, status) => {
    const remarks = remarksState[docType] || '';
    verifyMutation.mutate({ docType, status, remarks });
  };

  const handleRemarksChange = (docType, value) => {
    setRemarksState((prev) => ({ ...prev, [docType]: value }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Verified':
        return 'success';
      case 'Rejected':
        return 'error';
      default:
        return 'warning';
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
        <Spin size="large" tip="Loading audit workspace..." />
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

  return (
    <div className="animate-slide-up" style={{ paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/students/${id}`)} style={{ borderRadius: 6 }} />
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
            Document Verification Workspace
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Auditing student registry for: <strong>{student.surname} {student.firstName} {student.fatherName}</strong> ({student.grNumber})
          </Paragraph>
        </div>
      </div>

      <Row gutter={[24, 24]}>
        {/* Student Bio Quick View */}
        <Col xs={24} lg={8}>
          <Card
            title="Verification Context"
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 12 }}
          >
            <div style={{ marginBottom: 20 }}>
              <Text type="secondary" style={{ display: 'block', fontSize: 12 }}>Overall Status</Text>
              <Tag color={getStatusColor(student.verificationStatus)} style={{ fontSize: 16, padding: '4px 16px', marginTop: 4 }}>
                {student.verificationStatus || 'Pending'}
              </Tag>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Text style={{ fontWeight: 600 }}>SR Number:</Text> <Text>{student.srNumber}</Text>
              </div>
              <div>
                <Text style={{ fontWeight: 600 }}>Class & Div:</Text> <Text>{student.class} - {student.division}</Text>
              </div>
              <div>
                <Text style={{ fontWeight: 600 }}>Caste / Category:</Text> <Text>{student.caste} ({student.casteCategory})</Text>
              </div>
              <div>
                <Text style={{ fontWeight: 600 }}>Aadhaar Name:</Text> <Text>{student.nameAsPerAadhaar}</Text>
              </div>
              <div>
                <Text style={{ fontWeight: 600 }}>Aadhaar No.:</Text> <Text>{student.aadhaarNumber}</Text>
              </div>
              <div>
                <Text style={{ fontWeight: 600 }}>Mobile Number 1:</Text> <Text>{student.mobileNumber1}</Text>
              </div>
              {student.mobileNumber2 && (
                <div>
                  <Text style={{ fontWeight: 600 }}>Mobile Number 2:</Text> <Text>{student.mobileNumber2}</Text>
                </div>
              )}
              {student.mobileNumber3 && (
                <div>
                  <Text style={{ fontWeight: 600 }}>Mobile Number 3:</Text> <Text>{student.mobileNumber3}</Text>
                </div>
              )}
            </div>

            <Alert
              message="Audit Guidelines"
              description="Please inspect every document file URL. Check that names, spelling, and dates match the database profile before marking them as Verified."
              type="info"
              showIcon
              style={{ marginTop: 24 }}
            />
          </Card>
        </Col>

        {/* Verification Audit Tasks List */}
        <Col xs={24} lg={16}>
          <Card
            title="Verification checklist (11 Required Documents)"
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 12 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {documentTypesList.map((doc) => {
                const docRecord = student.documents?.[doc.key];
                const isUploaded = !!(docRecord && docRecord.url);

                return (
                  <Card
                    key={doc.key}
                    size="small"
                    style={{
                      border: isUploaded ? '1px solid var(--border-color)' : '1px dashed #cbd5e1',
                      background: isUploaded ? 'transparent' : '#f8fafc',
                      borderRadius: 8,
                    }}
                  >
                    <Row gutter={[16, 16]} align="middle">
                      {/* Document Meta */}
                      <Col xs={24} md={10}>
                        <Space direction="vertical" size={2}>
                          <Text style={{ fontWeight: 600, fontSize: 14 }}>{doc.name}</Text>
                          {isUploaded ? (
                            <>
                              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>
                                File: {docRecord.fileName}
                              </Text>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                Uploaded: {dayjs(docRecord.uploadDate).format('DD/MM/YYYY HH:mm')}
                              </Text>
                              {docRecord.verifiedBy && (
                                <Text type="secondary" style={{ fontSize: 11, display: 'block', color: 'var(--primary-color)' }}>
                                  Audited By: {docRecord.verifiedBy.name}
                                </Text>
                              )}
                            </>
                          ) : (
                            <Tag color="default">Not Uploaded</Tag>
                          )}
                        </Space>
                      </Col>

                      {/* Status Tag */}
                      <Col xs={12} md={4}>
                        {isUploaded ? (
                          <Tag color={getStatusColor(docRecord.status)} style={{ fontSize: 12, padding: '2px 8px' }}>
                            {docRecord.status}
                          </Tag>
                        ) : (
                          <Text type="secondary">-</Text>
                        )}
                      </Col>

                      {/* Action Inputs */}
                      <Col xs={24} md={10}>
                        {isUploaded ? (
                          <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            {/* Document Viewer Button */}
                            <Button
                              type="link"
                              icon={<EyeOutlined />}
                              onClick={() => window.open(docRecord.url, '_blank')}
                              style={{ padding: 0, height: 'auto' }}
                            >
                              Open document in new tab
                            </Button>

                            {/* Remarks Input */}
                            <Input
                              placeholder="Write audit feedback / remarks..."
                              value={remarksState[doc.key] !== undefined ? remarksState[doc.key] : docRecord.remarks}
                              onChange={(e) => handleRemarksChange(doc.key, e.target.value)}
                              size="small"
                              style={{ borderRadius: 4 }}
                            />

                            {/* Verify Actions */}
                            <Space>
                              <Button
                                type="primary"
                                icon={<CheckOutlined />}
                                size="small"
                                onClick={() => handleVerify(doc.key, 'Verified')}
                                style={{ background: '#10b981', borderColor: '#10b981', borderRadius: 4 }}
                                loading={verifyMutation.isPending && verifyMutation.variables?.docType === doc.key}
                              >
                                Approve
                              </Button>
                              <Button
                                danger
                                icon={<CloseOutlined />}
                                size="small"
                                onClick={() => handleVerify(doc.key, 'Rejected')}
                                style={{ borderRadius: 4 }}
                                loading={verifyMutation.isPending && verifyMutation.variables?.docType === doc.key}
                              >
                                Reject
                              </Button>
                            </Space>
                          </Space>
                        ) : (
                          <Text type="secondary" italic>Awaiting document upload</Text>
                        )}
                      </Col>
                    </Row>
                  </Card>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
