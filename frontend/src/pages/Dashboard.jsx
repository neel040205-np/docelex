import React from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { Card, Row, Col, Statistic, Spin, Typography, Space, Button, Alert } from 'antd';
import {
  UserOutlined,
  FileExclamationOutlined,
  FileDoneOutlined,
  ReloadOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

export const Dashboard = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // React Query fetch
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['stats'],
    queryFn: () => client.get('/stats'),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" tip={t('dashboard.loadingStats')} />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert
        message={t('dashboard.dataError')}
        description={t('dashboard.dataErrorDescription')}
        type="error"
        showIcon
        action={
          <Button size="small" type="primary" onClick={() => refetch()} icon={<ReloadOutlined />}>
            {t('common.retry')}
          </Button>
        }
      />
    );
  }

  const { metrics, classStats, documentStats } = data.data;

  // Pie chart calculation
  const pieData = [
    { name: t('dashboard.completeRecords'), value: metrics.completeDocsStudents, color: '#10b981' },
    { name: t('dashboard.incompleteRecords'), value: metrics.missingDocsStudents, color: '#ef4444' },
  ];

  return (
    <div className="animate-slide-up">
      {/* Title Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
            {t('dashboard.title')}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0 }}>
            {t('dashboard.subtitle')}
          </Paragraph>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type="primary"
            icon={<UserOutlined />}
            onClick={() => navigate('/students')}
            style={{ borderRadius: '8px' }}
          >
            {t('dashboard.manageDirectory')} <ArrowRightOutlined />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        {/* Total Students */}
        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            style={{
              background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
              color: '#1e1b4b',
              boxShadow: 'var(--shadow-premium)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#4f46e5', fontWeight: 600 }}>{t('dashboard.totalStudents')}</span>}
              value={metrics.totalStudents}
              valueStyle={{ fontSize: '36px', fontWeight: 800, color: '#312e81' }}
              prefix={<UserOutlined style={{ marginRight: '8px', color: '#6366f1' }} />}
            />
          </Card>
        </Col>

        {/* Complete */}
        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            style={{
              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
              color: '#064e3b',
              boxShadow: 'var(--shadow-premium)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#059669', fontWeight: 600 }}>{t('dashboard.completeRecords')}</span>}
              value={metrics.completeDocsStudents}
              valueStyle={{ fontSize: '36px', fontWeight: 800, color: '#064e3b' }}
              prefix={<FileDoneOutlined style={{ marginRight: '8px', color: '#10b981' }} />}
            />
          </Card>
        </Col>

        {/* Missing */}
        <Col xs={24} sm={8}>
          <Card
            bordered={false}
            style={{
              background: 'linear-gradient(135deg, #fee2e2 0%, #fca5a5 100%)',
              color: '#7f1d1d',
              boxShadow: 'var(--shadow-premium)',
            }}
          >
            <Statistic
              title={<span style={{ color: '#dc2626', fontWeight: 600 }}>{t('dashboard.missingDocuments')}</span>}
              value={metrics.missingDocsStudents}
              valueStyle={{ fontSize: '36px', fontWeight: 800, color: '#7f1d1d' }}
              prefix={<FileExclamationOutlined style={{ marginRight: '8px', color: '#ef4444' }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Visual Analytics */}
      <Row gutter={[24, 24]}>
        {/* Class distribution chart */}
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ fontWeight: 600 }}>{t('dashboard.classWiseStatus')}</span>}
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}
          >
            <div style={{ height: '350px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={classStats}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="class" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="complete" name={t('dashboard.completeDocuments')} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="missing" name={t('dashboard.missingDocuments')} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* Completion Breakdown Pie */}
        <Col xs={24} lg={8}>
          <Card
            title={<span style={{ fontWeight: 600 }}>{t('dashboard.recordVerificationRate')}</span>}
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}
          >
            <div style={{ height: '350px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              {metrics.totalStudents === 0 ? (
                <div style={{ color: 'var(--text-secondary)' }}>{t('dashboard.noStudentsFound')}</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                    {pieData.map((item) => (
                      <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: item.color }} />
                        <span style={{ fontSize: '12px', fontWeight: 500 }}>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        {/* Document upload counts horizontal chart */}
        <Col xs={24}>
          <Card
            title={<span style={{ fontWeight: 600 }}>{t('dashboard.verificationProgress')}</span>}
            bordered={false}
            style={{ boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}
          >
            <div style={{ height: '380px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={documentStats}
                  layout="vertical"
                  margin={{ top: 10, right: 30, left: 60, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={150} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="uploaded" name={t('dashboard.uploaded')} fill="#6366f1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="missing" name={t('dashboard.missing')} fill="#e2e8f0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};
