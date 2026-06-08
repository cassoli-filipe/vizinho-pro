import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { Home } from './pages/Home';
import { RegisterChoice } from './pages/RegisterChoice';
import { RegisterForm } from './pages/RegisterForm';
import { Login } from './pages/Login';
import { ProviderDetail } from './pages/ProviderDetail';
import { DashboardPrestador } from './pages/DashboardPrestador';
import { CompleteProfile } from './pages/CompleteProfile';
import { MinhasContratacoes } from './pages/MinhasContratacoes';
import { NotFound } from './pages/NotFound';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <div style={styles.appContainer}>
            <Header />
            <main style={styles.mainContent}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/search" element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                } />
                <Route path="/register" element={<RegisterChoice />} />
                <Route path="/register/:type" element={<RegisterForm />} />
                <Route path="/login" element={<Login />} />
                <Route path="/complete-profile" element={<CompleteProfile />} />
                <Route path="/providers/:id" element={
                  <ProtectedRoute>
                    <ProviderDetail />
                  </ProtectedRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute requiredUserType="prestador">
                    <DashboardPrestador />
                  </ProtectedRoute>
                } />
                <Route path="/minhas-contratacoes" element={
                  <ProtectedRoute requiredUserType="morador">
                    <MinhasContratacoes />
                  </ProtectedRoute>
                } />
                {/* Rota 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    width: '100%',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
};

export default App;
