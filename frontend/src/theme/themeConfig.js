import { theme } from 'antd';

export const getThemeConfig = (isDarkMode) => {
  return {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#6366f1', // Indigo-500
      colorInfo: '#6366f1',
      colorSuccess: '#10b981', // Emerald-500
      colorWarning: '#f59e0b', // Amber-500
      colorError: '#ef4444', // Red-500
      
      // Typography
      fontFamily: `'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
      fontSize: 14,
      borderRadius: 10,
      
      // Background adjustments
      colorBgBase: isDarkMode ? '#0d1117' : '#ffffff',
      colorBgContainer: isDarkMode ? '#161b22' : '#ffffff',
    },
    components: {
      Button: {
        controlHeight: 40,
        fontWeight: 500,
        borderRadius: 8,
      },
      Input: {
        controlHeight: 40,
        borderRadius: 8,
      },
      Select: {
        controlHeight: 40,
        borderRadius: 8,
      },
      Table: {
        borderRadius: 12,
        headerBg: isDarkMode ? '#21262d' : '#f8fafc',
        headerColor: isDarkMode ? '#c9d1d9' : '#1f2937',
      },
      Card: {
        borderRadius: 12,
        boxShadowCard: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
      Layout: {
        headerBg: isDarkMode ? '#161b22' : '#ffffff',
        siderBg: isDarkMode ? '#0d1117' : '#1e1b4b', // Deep indigo for light mode sidebar
      },
    },
  };
};
