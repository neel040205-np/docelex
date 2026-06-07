import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Select } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export const Login = () => {
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const { t, i18n } = useTranslation();
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
      setErrorMsg(err.message || t('auth.invalidCredentials'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
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
            <Text className="login-subtitle">{t('auth.signInSubtitle')}</Text>
          </div>

          {errorMsg && (
            <Alert
              message={errorMsg}
              type="error"
              showIcon
              className="login-alert"
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
              rules={[{ required: true, message: t('auth.passwordRequired') }]}
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
                {t('auth.signIn')}
              </Button>
            </Form.Item>
          </Form>

          <div className="login-demo">
            <strong>{t('auth.teacher')}</strong> teacher@docelex.com / Teacher@1234
          </div>
        </Card>
      </main>
    </div>
  );
};
