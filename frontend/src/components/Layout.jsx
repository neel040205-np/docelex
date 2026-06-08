import React, { useState } from 'react';
import { Layout, Menu, Button, Dropdown, Space, Avatar, Typography, Select, Drawer, Grid } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  HistoryOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  MenuOutlined,
  LogoutOutlined,
  BulbOutlined,
  BulbFilled,
  UserOutlined as ProfileIcon,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const { Header, Sider, Content, Footer } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

export const AppLayout = ({ isDarkMode, toggleDarkMode }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();

  // Screen breakpoints
  const isMobile = screens.xs || (screens.sm && !screens.md);

  const handleLanguageChange = (language) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
  };

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: t('nav.dashboard'),
    },
    {
      key: '/students',
      icon: <UserOutlined />,
      label: t('nav.studentDirectory'),
    },
    {
      key: '/audit-logs',
      icon: <HistoryOutlined />,
      label: t('nav.auditLogs'),
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
    if (isMobile) {
      setDrawerVisible(false);
    }
  };

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: (
          <div style={{ padding: '8px 12px' }}>
            <div style={{ fontWeight: 600 }}>{user?.name}</div>
            <Text type="secondary" size="small">
              {t('nav.teacher')}
            </Text>
          </div>
        ),
      },
      {
        type: 'divider',
      },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: t('nav.logout'),
        danger: true,
        onClick: () => {
          logout();
          navigate('/login');
        },
      },
    ],
  };

  const menuElement = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[location.pathname]}
      items={menuItems}
      onClick={handleMenuClick}
      style={{
        padding: '16px 0',
        borderRight: 0,
        background: isDarkMode ? '#0d1117' : '#1e1b4b',
      }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Sider for Desktop */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          breakpoint="lg"
          onBreakpoint={(broken) => setCollapsed(broken)}
          style={{
            boxShadow: '4px 0 24px 0 rgba(0,0,0,0.05)',
            zIndex: 10,
            background: isDarkMode ? '#0d1117' : '#1e1b4b',
          }}
        >
          <div
            style={{
              height: 64,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: '0 24px',
              background: isDarkMode ? '#0d1117' : '#1e1b4b',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ fontSize: 22, marginRight: 8 }}>📁</span>
            {!collapsed && (
              <span
                style={{
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: '0.5px',
                  fontFamily: 'Outfit',
                }}
              >
                DocElex
              </span>
            )}
          </div>
          {menuElement}
        </Sider>
      )}

      {/* Drawer for Mobile */}
      {isMobile && (
        <Drawer
          title={
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 22, marginRight: 8 }}>📁</span>
              <span style={{ color: '#ffffff', fontWeight: 800, fontSize: 18, fontFamily: 'Outfit' }}>
                DocElex
              </span>
            </div>
          }
          placement="left"
          onClose={() => setDrawerVisible(false)}
          open={drawerVisible}
          width={260}
          styles={{
            header: {
              background: isDarkMode ? '#0d1117' : '#1e1b4b',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
            },
            body: {
              padding: 0,
              background: isDarkMode ? '#0d1117' : '#1e1b4b',
            },
          }}
        >
          {menuElement}
        </Drawer>
      )}

      <Layout>
        <Header
          className="glass-panel"
          style={{
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0, 21, 41, 0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 9,
            height: 64,
          }}
        >
          <Button
            type="text"
            icon={isMobile ? <MenuOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            onClick={() => isMobile ? setDrawerVisible(true) : setCollapsed(!collapsed)}
            style={{ fontSize: '18px', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          />

          <Space size={isMobile ? "small" : "large"}>
            <Select
              aria-label={t('common.language')}
              value={i18n.language}
              onChange={handleLanguageChange}
              style={{ width: isMobile ? 110 : 120 }}
              options={[
                { value: 'en', label: 'English' },
                { value: 'gu', label: 'Gujarati' },
              ]}
            />

            {/* Dark Mode Toggle */}
            <Button
              type="text"
              shape="circle"
              icon={isDarkMode ? <BulbFilled style={{ color: '#f59e0b' }} /> : <BulbOutlined />}
              onClick={toggleDarkMode}
              style={{ fontSize: 18 }}
            />

            {/* Profile Dropdown */}
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  style={{
                    backgroundColor: isDarkMode ? '#1e1b4b' : '#f5f3ff',
                    color: '#6366f1',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                  icon={<ProfileIcon />}
                />
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }} className="hidden-mobile">
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user?.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    {user?.role}
                  </span>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: isMobile ? '12px' : '24px',
            padding: '0',
            minHeight: 280,
            animation: 'fadeIn 0.5s ease',
          }}
        >
          <Outlet />
        </Content>

        <Footer style={{ textAlign: 'center', color: 'var(--text-secondary)', background: 'transparent', padding: '16px' }}>
          {t('app.footer', { year: new Date().getFullYear() })}
        </Footer>
      </Layout>
    </Layout>
  );
};

