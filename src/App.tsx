import { BrowserRouter, Route, Routes } from 'react-router-dom'

import ScrollToTop from './components/ScrollToTop'
import Completion from './pages/Completion'
import Feedback from './pages/Feedback'
import Home from './pages/Home'
import Learning from './pages/Learning'
import Login from './pages/Login'
import Reflection from './pages/Reflection'
import Tutorial from './pages/Tutorial'

export default function App() {
  return (
    <BrowserRouter
      basename={import.meta.env.BASE_URL.replace(/\/$/, '') || undefined}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/tutorial" element={<Tutorial />} />
        <Route path="/home" element={<Home />} />
        <Route path="/learning" element={<Learning />} />
        <Route path="/reflection" element={<Reflection />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/completion" element={<Completion />} />
      </Routes>
    </BrowserRouter>
  )
}
