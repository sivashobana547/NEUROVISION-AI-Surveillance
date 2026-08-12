import React, { useState } from 'react';
import { Search, Download, Calendar, Play, Eye, FileSpreadsheet, FileText, CheckCircle, ShieldAlert } from 'lucide-react';

export default function Reports({ alerts, apiBaseUrl, onResolve }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [cameraFilter, setCameraFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedAlert, setSelectedAlert] = useState(null);

  const cameras = {
    "CAM_01": "Main Entrance Gate",
    "CAM_02": "Restricted Back Yard",
    "CAM_03": "North Parking Lot"
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(a => {
    const matchesSearch = 
      a.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesCam = cameraFilter === 'ALL' || a.camera_id === cameraFilter;
    const matchesSeverity = severityFilter === 'ALL' || a.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    
    return matchesSearch && matchesCam && matchesSeverity && matchesStatus;
  });

  const handleCsvExport = () => {
    // Navigate to Flask download URL
    window.open(`${apiBaseUrl}/api/reports/export?download=true`, '_blank');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="hud-grid" style={{ display: 'grid', gridTemplateColumns: selectedAlert ? '1fr 380px' : '1fr', gap: '24px', transition: 'all 0.3s' }}>
      
      {/* Left side: Search, Filters & Alert List */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Historical Logs & Audit Reports</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Query and compile security evidence files</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleCsvExport}>
              <FileSpreadsheet size={16} /> Export CSV
            </button>
            <button className="btn" onClick={handlePrintReport}>
              <FileText size={16} /> Print Report
            </button>
          </div>
        </header>

        {/* Filters bar */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr auto auto auto', 
          gap: '12px', 
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(255,255,255,0.01)',
          borderRadius: '8px',
          border: '1px solid var(--border-light)'
        }}>
          {/* Search box */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search alert descriptions, IDs..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 36px',
                borderRadius: '6px',
                border: '1px solid var(--border-light)',
                background: 'rgba(0,0,0,0.2)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {/* Camera Filter */}
          <select 
            value={cameraFilter} 
            onChange={(e) => setCameraFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              background: 'rgba(0,0,0,0.2)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Cameras</option>
            {Object.keys(cameras).map(k => (
              <option key={k} value={k}>{k} ({cameras[k]})</option>
            ))}
          </select>

          {/* Severity Filter */}
          <select 
            value={severityFilter} 
            onChange={(e) => setSeverityFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              background: 'rgba(0,0,0,0.2)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Severities</option>
            <option value="Critical">Critical Only</option>
            <option value="Warning">Warning Only</option>
          </select>

          {/* Status Filter */}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-light)',
              background: 'rgba(0,0,0,0.2)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">All Status</option>
            <option value="Active">Active</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {/* Table list */}
        {filteredAlerts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '240px', color: 'var(--text-secondary)' }}>
            <Search size={40} style={{ opacity: 0.5, marginBottom: '12px' }} />
            <p>No historical records match the selected query criteria.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Timestamp</th>
                  <th>Camera Sensor</th>
                  <th>Incident Type</th>
                  <th>Severity</th>
                  <th>Dur</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map(a => (
                  <tr 
                    key={a.id} 
                    style={{ 
                      cursor: 'pointer', 
                      background: selectedAlert?.id === a.id ? 'rgba(0,210,255,0.03)' : 'transparent' 
                    }}
                    onClick={() => setSelectedAlert(a)}
                  >
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                      {a.id}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: '500' }}>
                      {cameras[a.camera_id] || a.camera_id}
                    </td>
                    <td>{a.event_type}</td>
                    <td>
                      <span className={`badge ${a.severity === 'Critical' ? 'badge-critical' : 'badge-warning'}`}>
                        {a.severity}
                      </span>
                    </td>
                    <td>{a.duration}s</td>
                    <td>
                      <span style={{ 
                        color: a.status === 'Active' ? 'var(--color-critical)' : 'var(--color-success)', 
                        fontWeight: '600',
                        fontSize: '0.85rem' 
                      }}>
                        {a.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="btn" 
                          style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                          onClick={() => setSelectedAlert(a)}
                        >
                          <Eye size={12} /> View
                        </button>
                        {a.status === 'Active' && (
                          <button 
                            className="btn btn-primary" 
                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                            onClick={() => onResolve(a.id)}
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Right side: Alert Details Panel & Video Playback */}
      {selectedAlert && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', alignSelf: 'start', position: 'sticky', top: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--color-primary)' }}>Incident Evidence</h3>
            <button 
              className="btn" 
              style={{ padding: '4px 8px', border: 'none', background: 'transparent' }}
              onClick={() => setSelectedAlert(null)}
            >
              Close [x]
            </button>
          </div>

          {/* Evidence Video Player */}
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              Recorded Feed Clip (YOLOv8 + DeepSORT visual overlay)
            </span>
            {selectedAlert.video_url ? (
              <video 
                key={selectedAlert.id} // Forces reload when alert changes
                src={`${apiBaseUrl}${selectedAlert.video_url}`} 
                controls 
                style={{ 
                  width: '100%', 
                  height: 'auto', 
                  borderRadius: '8px', 
                  border: '1px solid var(--border-light)',
                  backgroundColor: '#000'
                }}
                poster={`${apiBaseUrl}${selectedAlert.thumbnail_url}`}
              >
                Your browser does not support HTML5 video playback.
              </video>
            ) : (
              <div style={{ width: '100%', height: '180px', background: '#020408', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', border: '1px dashed var(--border-light)' }}>
                <ShieldAlert size={32} style={{ color: 'var(--color-warning)', marginBottom: '8px' }} />
                <span style={{ fontSize: '0.8rem' }}>No Video Attached</span>
              </div>
            )}
          </div>

          {/* Incident Metadata */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Event Type</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{selectedAlert.event_type}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tracking ID</span>
              <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                ID:{selectedAlert.object_id}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sensor Location</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{cameras[selectedAlert.camera_id] || selectedAlert.camera_id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Breach Duration</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{selectedAlert.duration}s</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status Badge</span>
              <span className={`badge ${selectedAlert.status === 'Active' ? 'badge-critical' : 'badge-info'}`} style={{ textTransform: 'uppercase' }}>
                {selectedAlert.status}
              </span>
            </div>

            {/* Description Text */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255,255,255,0.01)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-light)', marginTop: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>INCIDENT ANALYSIS</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                {selectedAlert.description}
              </span>
            </div>

            {selectedAlert.status === 'Active' && (
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                onClick={() => {
                  onResolve(selectedAlert.id);
                  setSelectedAlert(prev => ({ ...prev, status: 'Resolved' }));
                }}
              >
                <CheckCircle size={16} /> Mark Incident Resolved
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
