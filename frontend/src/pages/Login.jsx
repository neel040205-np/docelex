import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Select, Segmented } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export const Login = () => {
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const { login, signup } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  // Route redirection location
  const from = location.state?.from?.pathname || '/';

  const onFinish = async (values) => {
    setFormLoading(true);
    setErrorMsg('');
    try {
      if (authMode === 'signup') {
        await signup(values.name, values.email, values.password);
      } else {
        await login(values.email, values.password);
      }
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || (authMode === 'signup' ? t('auth.signupFailed') : t('auth.invalidCredentials')));
    } finally {
      setFormLoading(false);
    }
  };

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  };

  const handleModeChange = (mode) => {
    setAuthMode(mode);
    setErrorMsg('');
    form.resetFields();
  };

  return (
    <div className="login-shell">
      <div className="login-language">
        <Select
          aria-label={t('common.language')}
          value={i18n.language}
          onChange={handleLanguageChange}
          className="login-language-select"
          options={[
            { value: 'en', label: 'English' },
            { value: 'gu', label: 'ગુજરાતી' },
          ]}
        />
      </div>

      <main className="login-main">
        <Card
          bordered={false}
          className="login-card animate-slide-up"
        >
          <div className="login-brand">
            <Title level={1} className="login-title">
              {t('app.name')}
            </Title>
            <Text className="login-subtitle">
              {authMode === 'signup' ? t('auth.signupSubtitle') : t('auth.signInSubtitle')}
            </Text>
          </div>

          <Segmented
            block
            value={authMode}
            onChange={handleModeChange}
            className="login-mode"
            options={[
              { label: t('auth.loginTab'), value: 'login' },
              { label: t('auth.signupTab'), value: 'signup' },
            ]}
          />

          {errorMsg && (
            <Alert
              message={errorMsg}
              type="error"
              showIcon
              className="login-alert"
            />
          )}

          <Form
            form={form}
            name="login_form"
            layout="vertical"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            requiredMark={false}
          >
            {authMode === 'signup' && (
              <Form.Item
                name="name"
                className="login-form-item"
                rules={[{ required: true, message: t('auth.nameRequired') }]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder={t('auth.namePlaceholder')}
                  size="large"
                  className="login-input"
                />
              </Form.Item>
            )}

            <Form.Item
              name="email"
              className="login-form-item"
              rules={[
                { required: true, message: t('auth.emailRequired') },
                { type: 'email', message: t('auth.emailInvalid') },
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder={t('auth.emailPlaceholder')}
                size="large"
                className="login-input"
              />
            </Form.Item>

            <Form.Item
              name="password"
              className="login-form-item"
              rules={[
                { required: true, message: t('auth.passwordRequired') },
                ...(authMode === 'signup' ? [{ min: 6, message: t('auth.passwordMin') }] : []),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder={t('auth.passwordPlaceholder')}
                size="large"
                className="login-input"
              />
            </Form.Item>

            <Form.Item className="login-submit-item">
              <Button
                type="primary"
                htmlType="submit"
                loading={formLoading}
                block
                size="large"
                className="login-submit"
              >
                {authMode === 'signup' ? t('auth.signUp') : t('auth.signIn')}
              </Button>
            </Form.Item>
          </Form>

          {authMode === 'signup' && (
            <div className="login-note">
              {t('auth.authorizedEmailOnly')}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};
