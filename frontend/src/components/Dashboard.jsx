import React from 'react';
import { AlertTriangle, CheckCircle, Video, Shield, Clock, TrendingUp, HelpCircle } from 'lucide-react';

export default function Dashboard({ stats, recentAlerts, onResolve, setActiveTab }) {
  // Safe stats defaults
  const total = stats.total_alerts || 0;
  const active = stats.active_alerts || 0;
  const resolved = stats.resolved_alerts || 0;
  const typeCounts = stats.type_counts || {};

  // Find camera names
  const cameraNames = {
    "CAM_01": "Main Entrance Gate",
    "CAM_02": "Restricted Back Yard",
    "CAM_03": "North Parking Lot"
  };

  // Helper for severity color
  const getSeverityClass = (sev) => {
    return sev === 'Critical' ? 'badge-critical' : 'badge-warning';
  };

  return (
    <div className="hud-grid" style={{ position: 'relative' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          System Overview
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          Automated Video Analytics & Threat Detection Pipeline
        </p>
      </header>

      {/* KPI Cards Grid */}
      <div className="card-grid">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Active Alarms</span>
            <div className={`badge ${active > 0 ? 'badge-critical' : 'badge-info'}`} style={{ borderRadius: '50%', padding: '6px' }}>
              <AlertTriangle size={16} className={active > 0 ? 'pulse-critical' : ''} />
            </div>
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginTop: '12px', color: active > 0 ? 'var(--color-critical)' : 'var(--text-primary)' }}>
            {active}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '8px' }}>
            Currently requiring monitoring
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Total Events</span>
            <div className="badge badge-info" style={{ borderRadius: '50%', padding: '6px' }}>
              <Shield size={16} />
            </div>
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginTop: '12px', color: 'var(--color-primary)' }}>
            {total}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '8px' }}>
            Total threats detected by pipeline
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Resolved Events</span>
            <div className="badge badge-info" style={{ borderRadius: '50%', padding: '6px', color: 'var(--color-success)', borderColor: 'rgba(0,242,254,0.3)', background: 'rgba(0,242,254,0.1)' }}>
              <CheckCircle size={16} />
            </div>
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginTop: '12px', color: 'var(--color-success)' }}>
            {resolved}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '8px' }}>
            Flagged alerts cleared by operators
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>Sensors Online</span>
            <div className="badge badge-info" style={{ borderRadius: '50%', padding: '6px' }}>
              <Video size={16} />
            </div>
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '700', marginTop: '12px', color: 'var(--color-accent)' }}>
            3 / 3
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '8px' }}>
            YOLOv8 tracking layers active
          </p>
        </div>
      </div>

      {/* Main Grid: Charts & Live Events */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Side: Recent Alerts */}
        <div className="glass-panel" style={{ padding: '24px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Recent Alert Stream</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Real-time alerts processed by deep learning layers</p>
            </div>
            <button className="btn" onClick={() => setActiveTab('live')}>
              <Video size={14} /> Monitor Live Feeds
            </button>
          </div>

          {recentAlerts.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '280px', color: 'var(--text-secondary)' }}>
              <CheckCircle size={48} style={{ color: 'var(--color-success)', marginBottom: '16px', opacity: 0.6 }} />
              <p>No active threats detected at this time.</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>Check live streams or simulation tracks.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Camera</th>
                    <th>Alert Type</th>
                    <th>Severity</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAlerts.slice(0, 5).map((alert) => (
                    <tr key={alert.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <span style={{ fontWeight: '500' }}>{cameraNames[alert.camera_id] || alert.camera_id}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: alert.severity === 'Critical' ? 'var(--color-critical)' : 'var(--color-warning)' }}></span>
                          {alert.event_type}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getSeverityClass(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td>{alert.duration}s</td>
                      <td>
                        <span style={{ color: alert.status === 'Active' ? 'var(--color-critical)' : 'var(--text-secondary)', fontWeight: '600', fontSize: '0.85rem' }}>
                          {alert.status}
                        </span>
                      </td>
                      <td>
                        {alert.status === 'Active' ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '4px' }}
                            onClick={() => onResolve(alert.id)}
                          >
                            Resolve
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-success)', fontSize: '0.8rem' }}>Cleared</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Side: Charts & Threat Statistics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Threat Distribution Donut Chart */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px' }}>Threat Breakdown</h3>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', height: '140px' }}>
              
              {/* Pure SVG Donut Chart */}
              <svg width="120" height="120" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--bg-surface-elevated)" strokeWidth="4"></circle>
                
                {/* Loitering segment */}
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--color-primary)" strokeWidth="4" 
                  strokeDasharray={`${(typeCounts['Suspicious Loitering'] || 0) / (total || 1) * 100} ${100 - ((typeCounts['Suspicious Loitering'] || 0) / (total || 1) * 100)}`}
                  strokeDashoffset="25">
                </circle>
                
                {/* Intrusion segment */}
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--color-critical)" strokeWidth="4" 
                  strokeDasharray={`${(typeCounts['Restricted Area Intrusion'] || 0) / (total || 1) * 100} ${100 - ((typeCounts['Restricted Area Intrusion'] || 0) / (total || 1) * 100)}`}
                  strokeDashoffset={100 - ((typeCounts['Suspicious Loitering'] || 0) / (total || 1) * 100) + 25}>
                </circle>
              </svg>
              
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: '700' }}>{total}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Incidents</span>
              </div>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }}></span>
                  Loitering
                </span>
                <span style={{ fontWeight: '600' }}>{typeCounts['Suspicious Loitering'] || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-critical)' }}></span>
                  Intrusion
                </span>
                <span style={{ fontWeight: '600' }}>{typeCounts['Restricted Area Intrusion'] || 0}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-warning)' }}></span>
                  Unattended Objects
                </span>
                <span style={{ fontWeight: '600' }}>{typeCounts['Unattended Object'] || 0}</span>
              </div>
            </div>
          </div>

          {/* Activity Trend (SVG Line chart representation) */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={16} style={{ color: 'var(--color-primary)' }} /> Hourly Activity Trend
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '16px' }}>Threat level peaks over past 6 hours</p>
            
            {/* SVG Line Graph */}
            <svg viewBox="0 0 100 35" width="100%" height="80" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="5" x2="100" y2="5" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              <line x1="0" y1="15" x2="100" y2="15" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.02)" strokeWidth="0.5" />
              <line x1="0" y1="35" x2="100" y2="35" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              
              {/* Chart Line path */}
              <path d="M 0 32 Q 20 12, 40 28 T 80 8 T 100 15" fill="none" stroke="var(--color-primary)" strokeWidth="1.5" />
              {/* Area fill */}
              <path d="M 0 32 Q 20 12, 40 28 T 80 8 T 100 15 L 100 35 L 0 35 Z" fill="url(#chartGrad)" />
              
              {/* Interactive Points */}
              <circle cx="40" cy="28" r="1.5" fill="var(--color-primary)" />
              <circle cx="80" cy="8" r="1.5" fill="var(--color-critical)" className="pulse-critical" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.65rem', marginTop: '8px', fontFamily: 'var(--font-mono)' }}>
              <span>08:00</span>
              <span>10:00</span>
              <span>12:00</span>
              <span>14:00</span>
              <span>16:00</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
