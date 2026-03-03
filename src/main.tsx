import { BrowserRouter, Routes, Route } from "react-router-dom"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Home from './assets/pages/Home.tsx'
import MainHeader from "./assets/layouts/MainHeader.tsx"
import Dashboard from "./assets/pages/App/Dashboard.tsx"
import ExcelTest from "./assets/pages/App/ExcelTest.tsx"
import AdicionarAluno from "./assets/pages/App/AdicionarAluno.tsx"
import { ClerkProvider } from "@clerk/clerk-react"

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Pusblieshable key (Clerk) is missing or invalid.");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainHeader />}>
            <Route index element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/excel-test" element={<ExcelTest />} />
            <Route path="/adicionar-aluno" element={<AdicionarAluno />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>
)
