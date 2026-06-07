import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import client from '../api/client';
import { Card, Table, Typography, Tag, Space, Input, Select, Button, Spin, Alert } from 'antd';
import { SearchOutlined, ReloadOutlined, HistoryOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { Option } = Select;

export const AuditLogs = () => {
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
        return <Tag color="green">CREATE STUDENT</Tag>;
      case 'UPDATE_STUDENT':
        return <Tag color="blue">UPDATE STUDENT</Tag>;
      case 'DELETE_STUDENT':
        return <Tag color="red">DELETE STUDENT</Tag>;
      case 'UPLOAD_DOCUMENT':
        return <Tag color="cyan">UPLOAD DOCUMENT</Tag>;
      case 'DELETE_DOCUMENT':
        return <Tag color="magenta">DELETE DOCUMENT</Tag>;
      case 'USER_LOGIN':
        return <Tag color="purple">LOGIN SUCCESS</Tag>;
      default:
        return <Tag>{action}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: '180px',
      render: (text) => new Date(text).toLocaleString('en-GB'),
    },
    {
      title: 'Action Trigger',
      dataIndex: 'action',
      key: 'action',
      width: '150px',
      render: (text) => getActionTag(text),
    },
    {
      title: 'Operator Account',
      dataIndex: ['performedBy', 'email'],
      key: 'performedBy',
      render: (text, record) => (
        <div>
          <span style={{ fontWeight: 500 }}>{record.performedBy?.name || 'System'}</span>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {text} ({record.performedBy?.role})
          </div>
        </div>
      ),
    },
    {
      title: 'Audit Detail Log',
      dataIndex: 'details',
      key: 'details',
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: '120px',
      render: (text) => <span style={{ fontSize: '12px', fontFamily: 'monospace' }}>{text || '127.0.0.1'}</span>,
    },
  ];

  if (isError) {
    return (
      <Alert
        message="System Logs Loading Error"
        description="Could not pull verification and upload logs from server database. Verify DB services."
        type="error"
        showIcon
        action={
          <Button size="small" type="primary" onClick={() => refetch()} icon={<ReloadOutlined />}>
            Retry
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
          System Audit Logs
        </Title>
        <Paragraph type="secondary" style={{ margin: 0 }}>
          Read-only history logging of administrative actions, file modifications, and access history
        </Paragraph>
      </div>

      {/* Filter Card */}
      <Card bordered={false} style={{ marginBottom: '24px', boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}>
        <Space size="middle" wrap style={{ width: '100%' }}>
          {/* Search bar */}
          <Input
            placeholder="Search details or student name..."
            prefix={<SearchOutlined style={{ color: 'var(--text-secondary)' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />

          {/* Action Filter */}
          <Select
            placeholder="Filter by Action"
            value={actionFilter || undefined}
            onChange={(val) => setActionFilter(val || '')}
            style={{ width: 200 }}
            allowClear
          >
            <Option value="USER_LOGIN">USER LOGIN</Option>
            <Option value="CREATE_STUDENT">CREATE STUDENT</Option>
            <Option value="UPDATE_STUDENT">UPDATE STUDENT</Option>
            <Option value="DELETE_STUDENT">DELETE STUDENT</Option>
            <Option value="UPLOAD_DOCUMENT">UPLOAD DOCUMENT</Option>
            <Option value="DELETE_DOCUMENT">DELETE DOCUMENT</Option>
          </Select>

          {/* Refresh Button */}
          <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
            Sync Logs
          </Button>
        </Space>
      </Card>

      {/* Main Table */}
      <Card bordered={false} style={{ boxShadow: 'var(--shadow-premium)', background: 'var(--bg-card)' }}>
        <Table
          columns={columns}
          dataSource={logData?.data || []}
          rowKey="_id"
          loading={isLoading}
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
      </Card>
    </div>
  );
};
