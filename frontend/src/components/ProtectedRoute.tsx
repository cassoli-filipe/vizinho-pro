import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import type { UserType } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** When set, only users with this user_type can access the route.
   *  Other authenticated users are redirected to their default page. */
  requiredUserType?: UserType;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredUserType,
}) => {
  const { isAuthenticated, isLoading, profile } = useAuth();

  if (isLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!profile || profile.isProfileMissing) {
    return <Navigate to="/complete-profile" replace />;
  }

  // Role guard: redirect authenticated users who don't match the required type
  if (requiredUserType && profile?.user_type !== requiredUserType) {
    const fallback = profile?.user_type === 'prestador' ? '/dashboard' : '/search';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

const styles: Record<string, React.CSSProperties> = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100%',
    backgroundColor: '#F8FAFC',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid #E2E8F0',
    borderTopColor: '#0046C0',
    animation: 'spin 1s linear infinite',
  },
};
