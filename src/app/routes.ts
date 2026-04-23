import { createBrowserRouter } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { RequireAdminRole, RequireUserRole } from './auth/RequireRole';
import { AdminLayout } from './components/layout/AdminLayout';
import { AppLayout } from './components/layout/AppLayout';
import { 
  AdminUsers,
  Dashboard, 
  Upload, 
  Analysis, 
  Analyses, 
  History, 
  Login,
  Settings, 
  ReviewNotes, 
  NotFound 
} from './pages';

export const router = createBrowserRouter([
  {
    path: '/login',
    Component: Login,
  },
  {
    Component: RequireAuth,
    children: [
      {
        Component: RequireUserRole,
        children: [
          {
            Component: AppLayout,
            children: [
              { path: '/', Component: Dashboard },
              { path: '/upload', Component: Upload },
              { path: '/analyses', Component: Analyses },
              { path: '/analyses/:documentId', Component: Analysis },
              { path: '/review-notes/:documentId', Component: ReviewNotes },
              { path: '/history', Component: History },
              { path: '/settings', Component: Settings },
            ],
          },
        ],
      },
      {
        Component: RequireAdminRole,
        children: [
          {
            path: '/admin',
            Component: AdminLayout,
            children: [
              { path: 'users', Component: AdminUsers },
            ],
          },
        ],
      },
      { path: '*', Component: NotFound },
    ],
  },
]);