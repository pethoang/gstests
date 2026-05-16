import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route } from 'react-router-dom';
import App from './App.tsx';
import ExamPlayer from './components/ExamPlayer.tsx';
import ReviewPlayer from './components/ReviewPlayer.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/exam/:examId" element={<ExamPlayer />} />
        <Route path="/review/:submissionId" element={<ReviewPlayer />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
