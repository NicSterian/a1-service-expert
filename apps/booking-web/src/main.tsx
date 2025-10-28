import React from 'react';
import ReactDOM from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { routes } from './routes';
import './index.css';

const router = createBrowserRouter(routes as any, undefined as any);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <RouterProvider router={router} />
    <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
  </React.StrictMode>
);

