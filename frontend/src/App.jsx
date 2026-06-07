import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './context/AuthContext';
import { AuthGuard } from './components/AuthGuard';
import { AppLayout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Students } from './pages/Students';
import { AuditLogs } from './pages/AuditLogs';
import { getThemeConfig } from './theme/themeConfig';

// Initialize React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Sync theme to document body class
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={getThemeConfig(isDarkMode)}>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Login Route */}
              <Route path="/login" element={<Login />} />

              {/* Protected Workspace Layout */}
              <Route
                path="/"
                element={
                  <AuthGuard>
                    <AppLayout isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
                  </AuthGuard>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="students" element={<Students />} />
                
                <Route path="audit-logs" element={<AuditLogs />} />
              </Route>

              {/* Fallback routing */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </AuthProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );
}

export default App;
