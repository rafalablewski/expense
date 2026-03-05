import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>
      {(user) => <App key={user.uid} uid={user.uid} />}
    </AuthGate>
  </React.StrictMode>
)
