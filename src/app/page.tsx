'use client';

import React from 'react';
import { DashboardLayout } from '@/components/Dashboard';
import { AuthProvider, InstanceProvider } from '@/components/providers';
import { LoginForm } from '@/components/LoginForm';
import { useAuth } from '@/components/providers/AuthProvider';

function Dashboard() {
  return (
    <AuthProvider>
      <AuthenticatedContent />
    </AuthProvider>
  );
}

function AuthenticatedContent() {
  const { authenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginForm />;
  }

  return (
    <InstanceProvider>
      <DashboardLayout />
    </InstanceProvider>
  );
}

export default Dashboard;
