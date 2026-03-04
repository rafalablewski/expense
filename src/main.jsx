import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AuthGate from './AuthGate.jsx'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthGate>
      {(user) => <App uid={user.uid} />}
    </AuthGate>
  </React.StrictMode>
)
