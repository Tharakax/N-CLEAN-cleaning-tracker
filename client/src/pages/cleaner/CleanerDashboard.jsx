import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const CleanerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#070d18',
      color: '#e2e8f0',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 16,
      padding: '24px 16px',
      boxSizing: 'border-box',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 'clamp(36px, 10vw, 56px)' }}>🧹</div>
      <h1 style={{ fontSize: 'clamp(20px, 6vw, 28px)', fontWeight: 800, margin: 0 }}>
        Cleaner Dashboard
      </h1>
      <p style={{ color: '#64748b', margin: 0, fontSize: 'clamp(13px, 3.5vw, 15px)', maxWidth: 320 }}>
        Welcome, {user?.name}! Your task list is coming soon.
      </p>
      <button
        onClick={() => { logout(); navigate('/login'); }}
        style={{
          marginTop: 20,
          padding: '10px 24px',
          background: 'rgba(239,68,68,0.12)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 10,
          color: '#ef4444',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Sign Out
      </button>
    </div>
  );
};

export default CleanerDashboard;
