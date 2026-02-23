import React from 'react';
import { Toaster } from 'react-hot-toast';
import './styles/index.css';
import AppRoutes from './router';
import { DashboardProvider } from './context/DashboardContext';
import { useTheme } from './context/ThemeContext';

// Estilos do Toaster separados por tema para facilitar manutenção
const toastDarkStyle = {
  background: '#1e293b',  // slate-800
  color: '#ffffff',
  border: '1px solid #334155',  // slate-700
};

const toastLightStyle = {
  background: '#ffffff',
  color: '#1e293b',  // slate-800
  border: '1px solid #e2e8f0',  // slate-200
};

const AppContent: React.FC = () => {
  const { darkMode } = useTheme();
  const toastStyle = darkMode ? toastDarkStyle : toastLightStyle;

  return (
    <>
      <AppRoutes />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: toastStyle,
          success: {
            iconTheme: {
              primary: '#10b981',  // emerald-500
              secondary: toastStyle.color,
            },
          },
          error: {
            iconTheme: {
              primary: '#f87171',  // red-400
              secondary: toastStyle.color,
            },
          },
        }}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <DashboardProvider>
      <AppContent />
    </DashboardProvider>
  );
};

export default App;
