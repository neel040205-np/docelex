import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { Card, Table, Typography, Tag, Space, Input, Select, Button, Alert, Grid, Pagination } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

export const AuditLogs = () => {
  const { t } = useTranslation();
  const screens = useBreakpoint();
  const isMobile = screens.xs || (screens.sm && !screens.md);
  
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // React Query Fetch Audit Logs
  const { data: logData, isLoading, isError, refetch } = useQuery({
    queryKey: ['audit-logs', page, pageSize, search, actionFilter],
    queryFn: () =>
      client.get('/audit-logs', {
        params: {
          page,
          limit: pageSize,
          search,
          action: actionFilter,
        },
      }),
  });

  const getActionTag = (action) => {
    switch (action) {
      case 'CREATE_STUDENT':
        return <Tag color="green">{t('audit.actions.CREATE_STUDENT')}</Tag>;
      case 'UPDATE_STUDENT':
        return <Tag color="blue">{t('audit.actions.UPDATE_STUDENT')}</Tag>;
      case 'DELETE_STUDENT':
        return <Tag color="red">{t('audit.actions.DELETE_STUDENT')}</Tag>;
      case 'UPLOAD_DOCUMENT':
        return <Tag color="cyan">{t('audit.actions.UPLOAD_DOCUMENT')}</Tag>;
      case 'DELETE_DOCUMENT':
        return <Tag color="magenta">{t('audit.actions.DELETE_DOCUMENT')}</Tag>;
      case 'USER_LOGIN':
        return <Tag color="purple">{t('audit.actions.USER_LOGIN')}</Tag>;
      default:
        return <Tag>{action}</Tag>;
    }
  };

  const columns = [
    {
      title: t('audit.dateTime'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '180px',
      render: (text) => new Date(text).toLocaleString('en-GB'),
    },
    {
      title: t('audit.actionTrigger'),
      dataIndex: 'action',
      key: 'action',
      width: '150px',
      render: (text) => getActionTag(text),
    },
    {
      title: t('audit.operatorAccount'),
      dataIndex: ['performedBy', 'email'],
      key: 'performedBy',
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 500 }}>{record.performedBy?.name || t('common.system')}</span>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {text} ({record.performedBy?.role})
          </div>
        </div>
      ),
    },
    {
      title: t('audit.detailLog'),
      dataIndex: 'details',
      key: 'details',
    },
    {
      title: t('audit.ipAddress'),
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: '120px',
      render: (text) => <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{text || '127.0.0.1'}</span>,
    },
  ];

  if (isError) {
    return (
      <Alert
        message={t('audit.loadingError')}
        description={t('audit.loadingErrorDescription')}
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

  return (
    <div className="animate-slide-up">
      {/* Title Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
          {t('audit.title')}
        </Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          {t('audit.subtitle')}
        </Paragraph>
      </div>

      {/* Filter Card */}
      <Card bordered={false} style={{ marginBottom: '24px', boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Input
              placeholder={t('audit.searchPlaceholder')}
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%' }}
              allowClear
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <Select
                placeholder={t('audit.filterByAction')}
                value={actionFilter || undefined}
                onChange={(val) => setActionFilter(val || '')}
                style={{ flex: 1 }}
                allowClear
              >
                <Option value="USER_LOGIN">{t('audit.filters.USER_LOGIN')}</Option>
                <Option value="CREATE_STUDENT">{t('audit.filters.CREATE_STUDENT')}</Option>
                <Option value="UPDATE_STUDENT">{t('audit.filters.UPDATE_STUDENT')}</Option>
                <Option value="DELETE_STUDENT">{t('audit.filters.DELETE_STUDENT')}</Option>
                <Option value="UPLOAD_DOCUMENT">{t('audit.filters.UPLOAD_DOCUMENT')}</Option>
                <Option value="DELETE_DOCUMENT">{t('audit.filters.DELETE_DOCUMENT')}</Option>
              </Select>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} />
            </div>
          </div>
        ) : (
          <Space size="middle" wrap style={{ width: '100%' }}>
            {/* Search bar */}
            <Input
              placeholder={t('audit.searchPlaceholder')}
              prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 260 }}
              allowClear
            />

            {/* Action Filter */}
            <Select
              placeholder={t('audit.filterByAction')}
              value={actionFilter || undefined}
              onChange={(val) => setActionFilter(val || '')}
              style={{ width: 200 }}
              allowClear
            >
              <Option value="USER_LOGIN">{t('audit.filters.USER_LOGIN')}</Option>
              <Option value="CREATE_STUDENT">{t('audit.filters.CREATE_STUDENT')}</Option>
              <Option value="UPDATE_STUDENT">{t('audit.filters.UPDATE_STUDENT')}</Option>
              <Option value="DELETE_STUDENT">{t('audit.filters.DELETE_STUDENT')}</Option>
              <Option value="UPLOAD_DOCUMENT">{t('audit.filters.UPLOAD_DOCUMENT')}</Option>
              <Option value="DELETE_DOCUMENT">{t('audit.filters.DELETE_DOCUMENT')}</Option>
            </Select>

            {/* Refresh Button */}
            <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
              {t('audit.syncLogs')}
            </Button>
          </Space>
        )}
      </Card>

      {/* Main Table */}
      <Card bordered={false} style={{ boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}>
        {isMobile ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {(logData?.data || []).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                {t('common.noData', 'No records found')}
              </div>
            ) : (
              (logData?.data || []).map((log) => (
                <div key={log._id} className="audit-log-mobile-card">
                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                    {getActionTag(log.action)}
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {new Date(log.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                  
                  {/* Details */}
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px', lineHeight: '1.4', fontWeight: 500 }}>
                    {log.details}
                  </div>
                  
                  {/* Footer Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <div>
                      <span>{log.performedBy?.name || t('common.system')}</span>
                      <span style={{ marginInline: '4px' }}>•</span>
                      <span>{log.performedBy?.role || 'system'}</span>
                    </div>
                    <span style={{ fontFamily: 'monospace' }}>{log.ipAddress || '127.0.0.1'}</span>
                  </div>
                </div>
              ))
            )}
            
            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={logData?.pagination?.total || 0}
                simple
                onChange={(p, ps) => {
                  setPage(p);
                  if (ps) setPageSize(ps);
                }}
              />
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={logData?.data || []}
            rowKey="_id"
            loading={isLoading}
            scroll={{ x: 'max-content' }}
            pagination={{
              current: page,
              pageSize: pageSize,
              total: logData?.pagination?.total || 0,
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
