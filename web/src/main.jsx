import { safeArray, logIfNotArray } from './util'
import { BUILD_ID } from './build-id.js';
logIfNotArray("items", items);
logIfNotArray("users", users);
logIfNotArray("roles", roles);
logIfNotArray("invoices", invoices);
logIfNotArray("customers", customers);
logIfNotArray("products", products);
console.log('HF Build ID:', BUILD_ID);
import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
createRoot(document.getElementById('root')).render(<App />)
import './ui.css'
