import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'
import { ConfigProvider } from './contexts/ConfigContext'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>
      {(user) => (
        <ConfigProvider>
          <App key={user.uid} uid={user.uid} />
        </ConfigProvider>
      )}
    </AuthGate>
  </React.StrictMode>
)
