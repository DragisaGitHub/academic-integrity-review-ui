import { createBrowserRouter } from 'react-router';
import { AppLayout } from './components/layout/AppLayout';
import { 
  Dashboard, 
  Upload, 
  Analysis, 
  Analyses, 
  History, 
  Settings, 
  ReviewNotes, 
  NotFound 
} from './pages';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AppLayout,
    children: [
      { index: true, Component: Dashboard },
      { path: 'upload', Component: Upload },
      { path: 'analysis/:id', Component: Analysis },
      { path: 'analyses', Component: Analyses },
      { path: 'review-notes/:id', Component: ReviewNotes },
      { path: 'history', Component: History },
      { path: 'settings', Component: Settings },
      { path: '*', Component: NotFound },
    ],
  },
]);