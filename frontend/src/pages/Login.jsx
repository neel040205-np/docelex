import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Space, Alert } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export const Login = () => {
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Route redirection location
  const from = location.state?.from?.pathname || '/';

  const onFinish = async (values) => {
    setFormLoading(true);
    setErrorMsg('');
    try {
      await login(values.email, values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        width: '100vw',
        overflow: 'hidden',
      }}
    >
      {/* Left panel: Vector graphic panel (only on wider screens) */}
      <div
        className="login-bg-pattern"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '450px', zIndex: 1 }}>
          <div style={{ fontSize: '72px', marginBottom: '16px' }}>📁</div>
          <Title level={1} style={{ color: '#ffffff', fontWeight: 800, fontSize: '38px', margin: 0 }}>
            DocElex
          </Title>
          <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '18px', display: 'block', marginTop: '16px', fontWeight: 300 }}>
            Secure Student Registry & Document Verification Platform
          </Text>
          <div
            style={{
              marginTop: '40px',
              padding: '20px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
              textAlign: 'left',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>🔑 Demonstration Access:</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
              <strong>Teacher:</strong> teacher@docelex.com / Teacher@1234
            </div>
          </div>
        </div>
      </div>

      {/* Right panel: Login Card */}
      <div
        style={{
          width: '500px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'var(--bg-main)',
          padding: '24px',
          transition: 'var(--transition-smooth)',
        }}
      >
        <Card
          bordered={false}
          style={{
            width: '100%',
            maxWidth: '400px',
            background: 'var(--bg-card)',
            boxShadow: 'var(--shadow-premium)',
            borderRadius: '16px',
          }}
          className="animate-slide-up"
        >
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <Title level={2} style={{ fontWeight: 700, margin: '0 0 8px 0' }}>
              Welcome Back
            </Title>
            <Text type="secondary">Sign in to manage student document records</Text>
          </div>

          {errorMsg && (
            <Alert
              message={errorMsg}
              type="error"
              showIcon
              style={{ marginBottom: '20px', borderRadius: '8px' }}
            />
          )}

          <Form
            name="login_form"
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            requiredMark={false}
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please input your email!' },
                { type: 'email', message: 'Please enter a valid email address!' },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: 'var(--text-secondary)' }} />}
                placeholder="Email Address"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Please input your password!' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: 'var(--text-secondary)' }} />}
                placeholder="Password"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginTop: '24px', marginBottom: 0 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={formLoading}
                block
                size="large"
                style={{
                  height: '44px',
                  fontSize: '15px',
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
                }}
              >
                Sign In
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
};
