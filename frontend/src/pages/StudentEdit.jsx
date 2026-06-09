import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import {
  Form,
  Input,
  Select,
  Button,
  DatePicker,
  Radio,
  Card,
  Row,
  Col,
  Space,
  message,
  Typography,
  Divider,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
  IdcardOutlined,
  BankOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Option } = Select;
const { Title, Paragraph } = Typography;

export const StudentEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // 1. Fetch Student Details
  const { data: studentData, isLoading } = useQuery({
    queryKey: ['student-details', id],
    queryFn: () => client.get(`/students/${id}`),
    enabled: !!id,
  });

  const student = studentData?.data;

  // Sync details to form inputs
  useEffect(() => {
    if (student) {
      form.setFieldsValue({
        ...student,
        dob: dayjs(student.dob),
        admissionDate: dayjs(student.admissionDate),
        dobAsPerAadhaar: dayjs(student.dobAsPerAadhaar),
      });
    }
  }, [student, form]);

  // 2. Update Student Mutation
  const updateMutation = useMutation({
    mutationFn: (updatedStudent) => client.put(`/students/${id}`, updatedStudent),
    onSuccess: () => {
      message.success('Student profile updated successfully.');
      queryClient.invalidateQueries(['student-details', id]);
      queryClient.invalidateQueries(['students']);
      queryClient.invalidateQueries(['stats']);
      navigate(`/students/${id}`);
    },
    onError: (error) => {
      message.error(error.message || 'Failed to update student profile.');
      setLoading(false);
    },
  });

  const handleFormSubmit = (values) => {
    setLoading(true);
    const formattedValues = {
      ...values,
      dob: values.dob.format('YYYY-MM-DD'),
      admissionDate: values.admissionDate.format('YYYY-MM-DD'),
      dobAsPerAadhaar: values.dobAsPerAadhaar.format('YYYY-MM-DD'),
    };

    updateMutation.mutate(formattedValues);
  };

  // Inline DB duplicate checkers (passes excludeId to ignore self)
  const checkDuplicateGR = async (rule, value) => {
    if (!value || value === student?.grNumber) return Promise.resolve();
    try {
      const res = await client.get(`/students/check-duplicate?field=grNumber&value=${value}&excludeId=${id}`);
      if (res.exists) {
        return Promise.reject(new Error('This GR Number is already registered!'));
      }
      return Promise.resolve();
    } catch (err) {
      return Promise.resolve();
    }
  };

  const selectedClass = Form.useWatch('class', form);
  const selectedDivision = Form.useWatch('division', form);

  // Revalidate srNumber when class or division changes so duplicate check updates
  useEffect(() => {
    if (form.getFieldValue('srNumber')) {
      form.validateFields(['srNumber']).catch(() => {});
    }
  }, [selectedClass, selectedDivision, form]);

  const checkDuplicateSR = async (rule, value) => {
    if (!value) return Promise.resolve();
    const className = form.getFieldValue('class');
    const division = form.getFieldValue('division');
    
    // If the SR number, Class, and Division are all unchanged, it is not a duplicate.
    if (
      value === student?.srNumber &&
      className === student?.class &&
      division === student?.division
    ) {
      return Promise.resolve();
    }
    
    if (!className || !division) {
      return Promise.resolve();
    }
    
    try {
      const res = await client.get(`/students/check-duplicate?field=srNumber&value=${value}&class=${encodeURIComponent(className)}&division=${encodeURIComponent(division)}&excludeId=${id}`);
      if (res.exists) {
        return Promise.reject(new Error('This SR Number is already registered for this Class and Division!'));
      }
      return Promise.resolve();
    } catch (err) {
      return Promise.resolve();
    }
  };

  const classesList = ['Balvatika', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
  const divisionList = ['A', 'B', 'C', 'D'];
  const categoriesList = ['General', 'OBC', 'SC', 'ST', 'EWS'];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip="Loading student profile..." />
      </div>
    );
  }

  return (
    <div className="animate-slide-up" style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/students/${id}`)}
          style={{ borderRadius: 6 }}
        />
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
            Edit Student Profile
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            Modify student details for: <strong>{student?.surname} {student?.firstName}</strong> ({student?.grNumber})
          </Paragraph>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFormSubmit}
        scrollToFirstError
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          
          {/* SECTION 1: BASIC DETAILS */}
          <Card
            title={
              <Space>
                <UserOutlined style={{ color: 'var(--primary-color)' }} />
                <span>SECTION 1: STUDENT BASIC DETAILS</span>
              </Space>
            }
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 12 }}
          >
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="srNumber"
                  label="SR Number (Auto-assigned if left blank)"
                  rules={[
                    { validator: checkDuplicateSR }
                  ]}
                  validateTrigger="onBlur"
                >
                  <Input placeholder="E.g. SR-5021" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="grNumber"
                  label="GR Number (Unique)"
                  rules={[
                    { required: true, message: 'GR Number is required' },
                    { validator: checkDuplicateGR }
                  ]}
                  validateTrigger="onBlur"
                >
                  <Input placeholder="E.g. GR-9874" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="surname"
                  label="Surname"
                  rules={[{ required: true, message: 'Surname is required' }]}
                >
                  <Input placeholder="E.g. Patel" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="firstName"
                  label="First Name"
                  rules={[{ required: true, message: 'First name is required' }]}
                >
                  <Input placeholder="Student's first name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="fatherName"
                  label="Father's Name"
                  rules={[{ required: true, message: 'Father name is required' }]}
                >
                  <Input placeholder="Father's first name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="grandFatherName"
                  label="Grand Father's Name"
                  rules={[{ required: true, message: 'Grandfather name is required' }]}
                >
                  <Input placeholder="Grandfather's name" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="motherName"
                  label="Mother's Name"
                  rules={[{ required: true, message: 'Mother name is required' }]}
                >
                  <Input placeholder="Mother's first name" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="gender"
                  label="Gender"
                  rules={[{ required: true, message: 'Gender is required' }]}
                >
                  <Radio.Group>
                    <Radio value="Male">Male</Radio>
                    <Radio value="Female">Female</Radio>
                    <Radio value="Other">Other</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="dob"
                  label="Date of Birth"
                  rules={[{ required: true, message: 'Date of Birth is required' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Select DOB" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="admissionDate"
                  label="Admission Date"
                  rules={[{ required: true, message: 'Admission Date is required' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="Select Admission Date" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="class"
                  label="Class"
                  rules={[{ required: true, message: 'Class is required' }]}
                >
                  <Select placeholder="Select Class">
                    {classesList.map((c) => (
                      <Option key={c} value={c}>{c}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="division"
                  label="Division"
                  rules={[{ required: true, message: 'Division is required' }]}
                >
                  <Select placeholder="Select Division">
                    {divisionList.map((d) => (
                      <Option key={d} value={d}>{d}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="caste"
                  label="Caste"
                  rules={[{ required: true, message: 'Caste is required' }]}
                >
                  <Input placeholder="E.g. Hindu - Leuva Patel" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="casteCategory"
                  label="Caste Category"
                  rules={[{ required: true, message: 'Caste Category is required' }]}
                >
                  <Select placeholder="Select Caste Category">
                    {categoriesList.map((cat) => (
                      <Option key={cat} value={cat}>{cat}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Divider>Official Identifications</Divider>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item name="penNumber" label="PEN Number">
                  <Input placeholder="Permanent Education Number" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="apaarId" label="APAAR ID">
                  <Input placeholder="APAAR Education ID Card" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="udiseNumber" label="UDISE Number">
                  <Input placeholder="UDISE School Code / Student Code" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item name="nameAsPerChildTracking" label="Student Name as per Child Tracking">
                  <Input placeholder="Exact name spelling in Child Tracking portal" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="nameAsPerUdisePlus" label="Student Name as per UDISE+">
                  <Input placeholder="Exact name spelling in UDISE+ registry" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* SECTION 2: AADHAAR DETAILS */}
          <Card
            title={
              <Space>
                <IdcardOutlined style={{ color: 'var(--primary-color)' }} />
                <span>SECTION 2: AADHAAR DETAILS</span>
              </Space>
            }
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 12 }}
          >
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="aadhaarNumber"
                  label="Aadhaar Number (12 Digits)"
                  rules={[
                    { required: true, message: 'Aadhaar Number is required' },
                    { pattern: /^\d{12}$/, message: 'Aadhaar must be exactly 12 numeric digits.' }
                  ]}
                >
                  <Input placeholder="E.g. 504289745612" maxLength={12} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="nameAsPerAadhaar"
                  label="Name as per Aadhaar"
                  rules={[{ required: true, message: 'Name as per Aadhaar is required' }]}
                >
                  <Input placeholder="Exact spelling as on Aadhaar card" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="dobAsPerAadhaar"
                  label="Date of Birth as per Aadhaar"
                  rules={[{ required: true, message: 'DOB as per Aadhaar is required' }]}
                >
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" placeholder="DOB on Aadhaar" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* SECTION 3: BANK DETAILS */}
          <Card
            title={
              <Space>
                <BankOutlined style={{ color: 'var(--primary-color)' }} />
                <span>SECTION 3: BANK DETAILS</span>
              </Space>
            }
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 12 }}
          >
            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="bankAccountNumber"
                  label="Student Bank Account Number"
                  rules={[{ required: true, message: 'Bank account number is required' }]}
                >
                  <Input placeholder="Enter account number" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="ifscCode"
                  label="IFSC Code"
                  rules={[
                    { required: true, message: 'IFSC Code is required' },
                    { pattern: /^[A-Z]{4}0[A-Z0-9]{6}$/, message: 'Invalid IFSC Code format. E.g. SBIN0001234' }
                  ]}
                >
                  <Input placeholder="E.g. SBIN0001234" maxLength={11} style={{ textTransform: 'uppercase' }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="accountHolderName"
                  label="Account Holder Name"
                  rules={[{ required: true, message: 'Account holder name is required' }]}
                >
                  <Input placeholder="Exact name in bank passbook" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* SECTION 4: FAMILY DETAILS */}
          <Card
            title={
              <Space>
                <TeamOutlined style={{ color: 'var(--primary-color)' }} />
                <span>SECTION 4: FAMILY DETAILS</span>
              </Space>
            }
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', borderRadius: 12 }}
          >
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="motherAadhaarNumber"
                  label="Mother's Aadhaar Number (12 Digits)"
                  rules={[
                    { pattern: /^\d{12}$/, message: 'Must be exactly 12 numeric digits.' }
                  ]}
                >
                  <Input placeholder="Mother's Aadhaar" maxLength={12} />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="fatherAadhaarNumber"
                  label="Father's Aadhaar Number (12 Digits)"
                  rules={[
                    { pattern: /^\d{12}$/, message: 'Must be exactly 12 numeric digits.' }
                  ]}
                >
                  <Input placeholder="Father's Aadhaar" maxLength={12} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col xs={24} md={8}>
                <Form.Item
                  name="mobileNumber1"
                  label="Mobile Number 1"
                  rules={[
                    { required: true, message: 'Primary mobile number is required' },
                    { pattern: /^\d{10}$/, message: 'Must be exactly 10 digits.' }
                  ]}
                >
                  <Input placeholder="Primary Mobile Contact" maxLength={10} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="mobileNumber2"
                  label="Mobile Number 2"
                  rules={[
                    { pattern: /^\d{10}$/, message: 'Must be exactly 10 digits.' }
                  ]}
                >
                  <Input placeholder="Alternative Contact" maxLength={10} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="mobileNumber3"
                  label="Class Teacher's Mobile Number"
                  rules={[
                    { pattern: /^\d{10}$/, message: 'Must be exactly 10 digits.' }
                  ]}
                >
                  <Input placeholder="Class Teacher's Mobile" maxLength={10} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* SUBMIT BUTTON */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button size="large" onClick={() => navigate(`/students/${id}`)}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              size="large"
              loading={loading}
              style={{ borderRadius: 8 }}
            >
              Save Profile Changes
            </Button>
          </div>

        </Space>
      </Form>
    </div>
  );
};
