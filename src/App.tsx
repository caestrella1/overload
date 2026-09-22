import { lazy } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';

// Pages load on demand so the chart library isn't in the initial bundle.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ExercisesPage = lazy(() => import('./pages/ExercisesPage'));
const ExerciseDetailPage = lazy(() => import('./pages/ExerciseDetailPage'));
const MusclesPage = lazy(() => import('./pages/MusclesPage'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const ImportPage = lazy(() => import('./pages/ImportPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

// Hash routing keeps deep links working on static hosts like GitHub Pages.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="exercises" element={<ExercisesPage />} />
          <Route path="exercises/:name" element={<ExerciseDetailPage />} />
          <Route path="muscles" element={<MusclesPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
