import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { Toaster } from '@/components/ui/sonner';

export default function B2BLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
