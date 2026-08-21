import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from "react-router";
import Home from '../Home/Home.tsx'
import Game from '../Game/Game.tsx'
import Race from '../Race/Race.tsx'
import Login from '../Auth/Login.tsx'
import Register from '../Auth/Register.tsx'
import { SignalRProvider } from '../../models/SignalRContext.tsx'
import './Main.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <SignalRProvider>
    <StrictMode>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game/:gameId" element={<Game />} />
          <Route path="/race/:gameId" element={<Race />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </BrowserRouter>
    </StrictMode>
  </SignalRProvider>
)
