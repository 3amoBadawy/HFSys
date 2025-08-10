import { BUILD_ID } from './build-id.js';
console.log('HF Build ID:', BUILD_ID);
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
createRoot(document.getElementById('root')).render(<App />)
import './ui.css'
