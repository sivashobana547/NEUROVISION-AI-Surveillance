import React, { useState, useEffect } from 'react';
import { Shield, LayoutDashboard, Video, Map, FileBarChart2, Radio, Server, Database, Brain } from 'lucide-react';

// Import subcomponents
import Dashboard from './components/Dashboard';
import LiveFeed from './components/LiveFeed';
import Heatmap from './components/Heatmap';
import Reports from './components/Reports';

const API_BASE_URL = 'http://localhost:5000';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    total_alerts: 0,
    active_alerts: 0,
    resolved_alerts: 0,
    type_counts: {}
  });
  const [alerts, setAlerts] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    db: 'CONNECTING',
    ai: 'ACTIVE',
    server: 'ONLINE'
  });

  // Fetch alerts and stats from backend
  const fetchData = async () => {
    try {
      // Fetch stats
      const statsRes = await fetch(`${API_BASE_URL}/api/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
        setSystemStatus(prev => ({ ...prev, server: 'ONLINE' }));
      }

      // Fetch alerts
      const alertsRes = await fetch(`${API_BASE_URL}/api/alerts`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
        setSystemStatus(prev => ({ ...prev, db: 'ONLINE' }));
      }
    } catch (err) {
      console.warn("Backend API offline. Running in standalone local simulation mode.");
      setSystemStatus({
        db: 'OFFLINE_LOCAL',
        ai: 'ACTIVE_SIM',
        server: 'LOCAL_MOCK'
      });
      // Load some standalone initial dummy logs if fetch fails
      if (alerts.length === 0) {
        generateStandaloneMockData();
      }
    }
  };

  const generateStandaloneMockData = () => {
    // Fallback data when API is offline
    const mockAlerts = [
      {
        id: "ALT_MOCK01",
        timestamp: new Date(Date.now() - 3600000).isoformat ? new Date(Date.now() - 3600000).toISOString() : new Date(Date.now() - 3600000).toString(),
        camera_id: "CAM_02",
        event_type: "Restricted Area Intrusion",
        severity: "Critical",
        status: "Active",
        description: "Intruder ID 104 breached restricted perimeter Zone B coordinates.",
        video_url: "",
        thumbnail_url: "",
        object_id: 104,
        duration: 15.4
      },
      {
        id: "ALT_MOCK02",
        timestamp: new Date(Date.now() - 7200000).isoformat ? new Date(Date.now() - 7200000).toISOString() : new Date(Date.now() - 7200000).toString(),
        camera_id: "CAM_01",
        event_type: "Suspicious Loitering",
        severity: "Warning",
        status: "Active",
        description: "Subject ID 108 pacing around entrance/exit door for 45+ seconds.",
        video_url: "",
        thumbnail_url: "",
        object_id: 108,
        duration: 52.1
      },
      {
        id: "ALT_MOCK03",
        timestamp: new Date(Date.now() - 14400000).isoformat ? new Date(Date.now() - 14400000).toISOString() : new Date(Date.now() - 14400000).toString(),
        camera_id: "CAM_03",
        event_type: "Unattended Object",
        severity: "Warning",
        status: "Resolved",
        description: "Suitcase left unattended near terminal pillars.",
        video_url: "",
        thumbnail_url: "",
        object_id: 112,
        duration: 120.5
      }
    ];
    setAlerts(mockAlerts);
    setStats({
      total_alerts: mockAlerts.length,
      active_alerts: 2,
      resolved_alerts: 1,
      type_counts: {
        "Restricted Area Intrusion": 1,
        "Suspicious Loitering": 1,
        "Unattended Object": 1
      }
    });
  };

  // Resolve alert call
  const handleResolveAlert = async (alertId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      if (response.ok) {
        // Refresh data immediately
        fetchData();
      } else {
        throw new Error("Failed to resolve alert on server");
      }
    } catch (err) {
      console.warn("Resolve call failed or backend offline. Updating local status.");
      setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'Resolved' } : a));
      setStats(prev => {
        const nextActive = Math.max(0, prev.active_alerts - 1);
        return {
          ...prev,
          active_alerts: nextActive,
          resolved_alerts: prev.resolved_alerts + 1
        };
      });
    }
  };

  // Poll for data every 2 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            stats={stats} 
            recentAlerts={alerts} 
            onResolve={handleResolveAlert}
            setActiveTab={setActiveTab}
          />
        );
      case 'live':
        return <LiveFeed apiBaseUrl={API_BASE_URL} />;
      case 'heatmap':
        return <Heatmap apiBaseUrl={API_BASE_URL} />;
      case 'reports':
        return (
          <Reports 
            alerts={alerts} 
            apiBaseUrl={API_BASE_URL} 
            onResolve={handleResolveAlert}
          />
        );
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div>
          {/* Logo Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px', paddingLeft: '8px' }}>
            <Shield size={24} style={{ color: 'var(--color-primary)' }} />
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: '700', tracking: '0.05em', color: '#fff' }}>A.V.S. PIPELINE</h2>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600' }}>
                NSG Surveillance
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              className="btn" 
              style={{ 
                justifyContent: 'flex-start', 
                width: '100%', 
                border: 'none',
                background: activeTab === 'dashboard' ? 'rgba(0, 210, 255, 0.08)' : 'transparent',
                color: activeTab === 'dashboard' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'dashboard' ? '600' : '400'
              }}
              onClick={() => setActiveTab('dashboard')}
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
            
            <button 
              className="btn" 
              style={{ 
                justifyContent: 'flex-start', 
                width: '100%', 
                border: 'none',
                background: activeTab === 'live' ? 'rgba(0, 210, 255, 0.08)' : 'transparent',
                color: activeTab === 'live' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'live' ? '600' : '400'
              }}
              onClick={() => setActiveTab('live')}
            >
              <Video size={18} /> Live Monitor
            </button>

            <button 
              className="btn" 
              style={{ 
                justifyContent: 'flex-start', 
                width: '100%', 
                border: 'none',
                background: activeTab === 'heatmap' ? 'rgba(0, 210, 255, 0.08)' : 'transparent',
                color: activeTab === 'heatmap' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'heatmap' ? '600' : '400'
              }}
              onClick={() => setActiveTab('heatmap')}
            >
              <Map size={18} /> Heatmaps
            </button>

            <button 
              className="btn" 
              style={{ 
                justifyContent: 'flex-start', 
                width: '100%', 
                border: 'none',
                background: activeTab === 'reports' ? 'rgba(0, 210, 255, 0.08)' : 'transparent',
                color: activeTab === 'reports' ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'reports' ? '600' : '400'
              }}
              onClick={() => setActiveTab('reports')}
            >
              <FileBarChart2 size={18} /> Audit logs
              {stats.active_alerts > 0 && (
                <span 
                  className="badge badge-critical" 
                  style={{ marginLeft: 'auto', padding: '2px 6px', fontSize: '0.65rem', borderRadius: '10px' }}
                >
                  {stats.active_alerts}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Sidebar Footer System telemetry */}
        <div className="glass-panel" style={{ padding: '16px', fontSize: '0.7rem', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={12} style={{ color: systemStatus.server === 'ONLINE' ? 'var(--color-success)' : 'var(--color-warning)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>SERVER:</span>
            <span style={{ fontWeight: '600', color: systemStatus.server === 'ONLINE' ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {systemStatus.server}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={12} style={{ color: systemStatus.db === 'ONLINE' ? 'var(--color-success)' : 'var(--color-warning)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>DATABASE:</span>
            <span style={{ fontWeight: '600', color: systemStatus.db === 'ONLINE' ? 'var(--color-success)' : 'var(--color-warning)' }}>
              {systemStatus.db}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Brain size={12} style={{ color: 'var(--color-primary)' }} />
            <span style={{ color: 'var(--text-secondary)' }}>YOLO & LSTM:</span>
            <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
              {systemStatus.ai}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Dashboard Panel */}
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}
