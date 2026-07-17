import { HashRouter, Routes, Route } from 'react-router-dom'
import { LangProvider } from './i18n'
import { RoleProvider } from './roles'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import KnowledgeBase from './pages/KnowledgeBase'
import DocAssistant from './pages/DocAssistant'
import EnvStudies from './pages/EnvStudies'
import RegulatoryAI from './pages/RegulatoryAI'
import LegalAssistant from './pages/LegalAssistant'
import DocGeneration from './pages/DocGeneration'
import DocReview from './pages/DocReview'
import Recommendations from './pages/Recommendations'
import DataAnalysis from './pages/DataAnalysis'
import SearchPage from './pages/SearchPage'
import OCRPage from './pages/OCRPage'
import Workflows from './pages/Workflows'
import Admin from './pages/Admin'
import MapPage from './pages/MapPage'

export default function App() {
  return (
    <LangProvider>
      <RoleProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<MapPage />} />
            <Route path="/knowledge-base" element={<KnowledgeBase />} />
            <Route path="/assistant" element={<DocAssistant />} />
            <Route path="/environmental-studies" element={<EnvStudies />} />
            <Route path="/regulatory" element={<RegulatoryAI />} />
            <Route path="/legal-assistant" element={<LegalAssistant />} />
            <Route path="/generation" element={<DocGeneration />} />
            <Route path="/review" element={<DocReview />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/data-analysis" element={<DataAnalysis />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/ocr" element={<OCRPage />} />
            <Route path="/workflows" element={<Workflows />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </HashRouter>
      </RoleProvider>
    </LangProvider>
  )
}
