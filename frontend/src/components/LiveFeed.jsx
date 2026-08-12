import React, { useState, useEffect } from 'react';
import { LayoutGrid, Maximize2, ShieldAlert, Cpu, Terminal, Eye } from 'lucide-react';

export default function LiveFeed({ apiBaseUrl }) {
  const [selectedCam, setSelectedCam] = useState('ALL');
  const [consoleLogs, setConsoleLogs] = useState([]);
  
  const cameras = [
    { id: "CAM_01", name: "Main Entrance Gate", location: "Sector 1" },
    { id: "CAM_02", name: "Restricted Back Yard", location: "Sector 2 (Zone B)" },
    { id: "CAM_03", name: "North Parking Lot", location: "Sector 3" }
  ];

  // Simulating terminal log outputs
  useEffect(() => {
    const messages = [
      "Initializing YOLOv8 object detection layer...",
      "DeepSORT tracking matrix instantiated.",
      "LSTM sequence neural net listening on trajectory coordinates...",
      "Camera CAM_01: RTSP link stable, FPS: 15.0",
      "Camera CAM_02: RTSP link stable, FPS: 15.0",
      "Camera CAM_03: RTSP link stable, FPS: 15.0",
      "YOLOv8: Processing frame bounding boxes...",
      "DeepSORT: Consistent tracking IDs assigned.",
      "LSTM: Pacing activity check OK."
    ];
    
    // Seed initial logs
    setConsoleLogs(messages.map(m => `[${new Date().toLocaleTimeString()}] ${m}`));

    const interval = setInterval(() => {
      const randomCam = cameras[Math.floor(Math.random() * cameras.length)];
      const events = [
        `Processed YOLOv8 frame - 0.04s latency`,
        `DeepSORT updated active tracks list`,
        `LSTM forward pass output: 0.12 normal`,
        `Sensor data synced with local SQLite/MongoDB instance`,
        `No threat patterns identified on ${randomCam.id}`
      ];
      
      const newLog = `[${new Date().toLocaleTimeString()}] ${events[Math.floor(Math.random() * events.length)]}`;
      setConsoleLogs(prev => [newLog, ...prev.slice(0, 18)]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hud-grid" style={{ display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '20px', height: 'calc(100vh - 100px)' }}>
      {/* Header controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '-0.02em' }}>Live Monitoring</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Real-time DeepSORT target tracking feeds</p>
        </div>
        
        {/* Toggle matrix selection */}
        <div className="glass-panel" style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '8px' }}>
          <button 
            className="btn" 
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.8rem', 
              border: 'none', 
              background: selectedCam === 'ALL' ? 'var(--color-primary)' : 'transparent',
              color: selectedCam === 'ALL' ? '#000' : 'var(--text-primary)'
            }}
            onClick={() => setSelectedCam('ALL')}
          >
            <LayoutGrid size={14} style={{ marginRight: '6px' }} /> Grid View
          </button>
          
          {cameras.map(cam => (
            <button
              key={cam.id}
              className="btn"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                border: 'none',
                background: selectedCam === cam.id ? 'var(--color-primary)' : 'transparent',
                color: selectedCam === cam.id ? '#000' : 'var(--text-primary)'
              }}
              onClick={() => setSelectedCam(cam.id)}
            >
              {cam.id}
            </button>
          ))}
        </div>
      </div>

      {/* Cameras Viewport Matrix */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: selectedCam === 'ALL' ? 'repeat(auto-fit, minmax(360px, 1fr))' : '1fr', 
        gap: '20px',
        alignContent: 'start'
      }}>
        {cameras.filter(c => selectedCam === 'ALL' || c.id === selectedCam).map(cam => (
          <div key={cam.id} className="glass-panel scanline-container" style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
            
            {/* Live Video Feed Image stream */}
            <img 
              src={`${apiBaseUrl}/api/video_feed/${cam.id}`} 
              alt={cam.name}
              style={{ width: '100%', height: 'auto', display: 'block', minHeight: '240px', backgroundColor: '#020409' }}
              onError={(e) => {
                // Fallback rendering if backend not running
                e.target.onerror = null;
                e.target.style.display = 'none';
                e.target.nextSibling.style.display = 'flex'; // show fallback message
              }}
            />
            
            {/* Fallback Display if API is down */}
            <div style={{ 
              display: 'none', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              minHeight: '240px',
              color: 'var(--text-secondary)',
              backgroundColor: '#05070e',
              padding: '24px',
              textAlign: 'center'
            }}>
              <ShieldAlert size={40} style={{ color: 'var(--color-critical)', marginBottom: '12px', opacity: 0.8 }} />
              <p style={{ fontWeight: '600' }}>Camera Stream Unavailable</p>
              <p style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '4px' }}>Verify Flask backend is running on {apiBaseUrl}</p>
            </div>

            {/* Futuristic HUD overlays */}
            <div style={{ position: 'absolute', top: '16px', left: '16px', display: 'flex', gap: '8px' }}>
              <span className="badge badge-critical" style={{ background: 'rgba(255, 51, 102, 0.2)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-critical)' }} className="pulse-critical"></span>
                LIVE
              </span>
              <span className="badge" style={{ background: 'rgba(0, 210, 255, 0.15)', color: 'var(--color-primary)', border: '1px solid rgba(0, 210, 255, 0.3)', backdropFilter: 'blur(4px)' }}>
                {cam.id}
              </span>
            </div>

            <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
              <span className="badge" style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid var(--border-light)', textTransform: 'none' }}>
                {cam.location}
              </span>
            </div>

            {/* Corner Crosshairs */}
            <div style={{ position: 'absolute', top: '8px', left: '8px', width: '12px', height: '12px', borderTop: '2px stroke var(--color-primary)', borderLeft: '2px stroke var(--color-primary)', opacity: 0.5 }}></div>
            <div style={{ position: 'absolute', top: '8px', right: '8px', width: '12px', height: '12px', borderTop: '2px stroke var(--color-primary)', borderRight: '2px stroke var(--color-primary)', opacity: 0.5 }}></div>
            <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '12px', height: '12px', borderBottom: '2px stroke var(--color-primary)', borderLeft: '2px stroke var(--color-primary)', opacity: 0.5 }}></div>
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '12px', height: '12px', borderBottom: '2px stroke var(--color-primary)', borderRight: '2px stroke var(--color-primary)', opacity: 0.5 }}></div>

            {/* Telemetry overlay bottom */}
            <div style={{ 
              position: 'absolute', 
              bottom: '0', 
              left: '0', 
              right: '0', 
              background: 'linear-gradient(to top, rgba(0,0,0,0.8), rgba(0,0,0,0))', 
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)'
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={12} style={{ color: 'var(--color-primary)' }} />
                YOLOv8 Track: ENGAGED
              </span>
              <span>LSTM: RUNNING</span>
            </div>
          </div>
        ))}
      </div>

      {/* Terminal Log Console */}
      <div className="glass-panel" style={{ padding: '16px', background: '#04070f', border: '1px solid rgba(0,210,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
          <Terminal size={14} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
            Pipeline Telemetry Log Console
          </span>
        </div>
        <div style={{ 
          height: '100px', 
          overflowY: 'auto', 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.75rem', 
          color: 'var(--color-primary)', 
          display: 'flex', 
          flexDirection: 'column-reverse',
          gap: '4px',
          opacity: 0.85
        }}>
          {consoleLogs.map((log, index) => (
            <div key={index} style={{ whiteSpace: 'pre-wrap' }}>{log}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
