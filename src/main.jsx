import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/mona-sans'
import './index.css'
import App from './App.jsx'
import { useAuthStore } from './store/authStore'

// Initialize auth before rendering
useAuthStore.getState().initialize()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
