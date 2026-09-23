import React from 'react'
import { createRoot } from 'react-dom/client'
import { RosterPanel } from './RosterPanel.jsx'
import './roster.css'

createRoot(document.getElementById('root')).render(<React.StrictMode><RosterPanel /></React.StrictMode>)
