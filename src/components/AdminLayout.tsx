import React from 'react';
import { AdminNavbar } from './AdminNavbar';

export function AdminLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNavbar />
      <div className="pt-24">
        {children}
      </div>
    </div>
  );
}