import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "@fontsource/roboto";
import "@fontsource/montserrat";
import "@fontsource/playfair-display";
import "@fontsource/lobster";
import "@fontsource/pacifico";
import "@fontsource/oswald";
import "@fontsource/raleway";
import "@fontsource/anton";
import "@fontsource/dancing-script";
import "@fontsource/bebas-neue";
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
