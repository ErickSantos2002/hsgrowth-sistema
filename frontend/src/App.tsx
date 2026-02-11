import React from 'react';
import { Toaster } from 'react-hot-toast';
import './styles/index.css';
import AppRoutes from './router';
import { DashboardProvider } from './context/DashboardContext';
import { COLORS } from './constants/colors';

const App: React.FC = () => {
  return (
    <DashboardProvider>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: COLORS.surface.elevated,
            color: COLORS.content.primary,
            border: `1px solid ${COLORS.border.default}`,
          },
          success: {
            iconTheme: {
              primary: COLORS.primary,
              secondary: COLORS.content.primary,
            },
          },
          error: {
            iconTheme: {
              primary: COLORS.status.error,
              secondary: COLORS.content.primary,
            },
          },
        }}
      />
    </DashboardProvider>
  );
};

export default App;
