import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'
import { ConfigProvider } from './contexts/ConfigContext'
import { AppDataProvider } from './contexts/AppDataContext'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>
      {(user) => (
        <ConfigProvider>
          <AppDataProvider key={user.uid} uid={user.uid}>
            <App />
          </AppDataProvider>
        </ConfigProvider>
      )}
    </AuthGate>
  </React.StrictMode>
)
