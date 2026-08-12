import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Play, ShieldAlert, Layers } from 'lucide-react';

export default function Heatmap({ apiBaseUrl }) {
  const [selectedCam, setSelectedCam] = useState('CAM_01');
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const canvasRef = useRef(null);
  
  const cameras = [
    { id: "CAM_01", name: "Main Entrance Gate" },
    { id: "CAM_02", name: "Restricted Back Yard" },
    { id: "CAM_03", name: "North Parking Lot" }
  ];

  const fetchHeatmapData = async (camId) => {
    setLoading(true);
    setHasError(false);
    try {
      const response = await fetch(`${apiBaseUrl}/api/heatmap/${camId}?limit=1000`);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setPoints(data.points || []);
    } catch (err) {
      console.error("Error loading heatmap coordinates: ", err);
      setHasError(true);
      // Fallback dummy points for standalone demonstration
      setPoints(generateMockPoints(camId));
    } finally {
      setLoading(false);
    }
  };

  const generateMockPoints = (camId) => {
    const mock = [];
    // Generate clusters of points based on camera characteristics
    const clusters = [];
    if (camId === 'CAM_02') {
      // Intruders in center restricted zone
      clusters.push({ cx: 400, cy: 280, r: 120, count: 250 });
      clusters.push({ cx: 220, cy: 180, r: 40, count: 50 });
    } else if (camId === 'CAM_01') {
      // Loitering near gate doors (e.g. left side)
      clusters.push({ cx: 200, cy: 250, r: 80, count: 180 });
      clusters.push({ cx: 600, cy: 300, r: 100, count: 120 });
    } else {
      // Traffic lines
      clusters.push({ cx: 300, cy: 150, r: 70, count: 90 });
      clusters.push({ cx: 500, cy: 380, r: 90, count: 140 });
    }

    clusters.forEach(c => {
      for (let i = 0; i < c.count; i++) {
        // Gaussian approximation
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * c.r;
        mock.push({
          x: Math.floor(c.cx + Math.cos(angle) * radius),
          y: Math.floor(c.cy + Math.sin(angle) * radius),
          weight: Math.random() * 1.5
        });
      }
    });
    return mock;
  };

  useEffect(() => {
    fetchHeatmapData(selectedCam);
  }, [selectedCam]);

  // Render Heatmap on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#050811';
    ctx.fillRect(0, 0, w, h);
    
    // Grid lines for background
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 0; i < w; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
    }
    for (let i = 0; i < h; i += 40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
    }

    // Camera perspective guidelines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(30, 30, w - 60, h - 60);

    if (points.length === 0) return;

    // Draw Heatmap algorithm
    // 1. Create a shadow canvas for drawing accumulated alpha mask
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = w;
    shadowCanvas.height = h;
    const shadowCtx = shadowCanvas.getContext('2d');

    const radius = 25; // Heatpoint spread radius
    points.forEach(p => {
      // Draw radial alpha circle
      const grad = shadowCtx.createRadialGradient(p.x, p.y, 2, p.x, p.y, radius);
      // Soft alpha profile
      grad.addColorStop(0, `rgba(0, 0, 0, ${p.weight ? p.weight * 0.15 : 0.15})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      shadowCtx.fillStyle = grad;
      shadowCtx.beginPath();
      shadowCtx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      shadowCtx.fill();
    });

    // 2. Read alpha pixel values and color map them
    try {
      const imgData = shadowCtx.getImageData(0, 0, w, h);
      const pix = imgData.data;
      
      // Color map gradient lookup
      const getColor = (v) => {
        // v ranges from 0 to 255
        // Blue (low) -> Cyan -> Green -> Yellow -> Red (high)
        if (v < 64) {
          // Blue to Cyan
          return { r: 0, g: Math.floor(v * 4), b: 255 };
        } else if (v < 128) {
          // Cyan to Green
          return { r: 0, g: 255, b: Math.floor(255 - (v - 64) * 4) };
        } else if (v < 192) {
          // Green to Yellow
          return { r: Math.floor((v - 128) * 4), g: 255, b: 0 };
        } else {
          // Yellow to Red
          return { r: 255, g: Math.floor(255 - (v - 192) * 4), b: 0 };
        }
      };

      for (let i = 0; i < pix.length; i += 4) {
        // Read alpha channel from shadow canvas (we drew solid black color, so rgb is 0, alpha is what accumulated)
        const alpha = pix[i + 3];
        if (alpha > 5) {
          const color = getColor(alpha);
          pix[i] = color.r;
          pix[i + 1] = color.g;
          pix[i + 2] = color.b;
          // Apply opacity curve
          pix[i + 3] = Math.min(alpha * 1.8, 200); 
        }
      }
      
      // Paint colorful pixels to display canvas
      // Draw grid camera context lines underneath
      ctx.drawImage(shadowCanvas, 0, 0);
      
      // Put colored image data
      const displayImgData = ctx.getImageData(0, 0, w, h);
      for(let i=0; i<pix.length; i+=4){
        if(pix[i+3] > 5){
          displayImgData.data[i] = pix[i];
          displayImgData.data[i+1] = pix[i+1];
          displayImgData.data[i+2] = pix[i+2];
          displayImgData.data[i+3] = pix[i+3];
        }
      }
      ctx.putImageData(displayImgData, 0, 0);

    } catch (e) {
      console.error("Canvas manipulation error:", e);
    }
  }, [points]);

  return (
    <div className="hud-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '24px' }}>
      
      {/* Left side: Canvas Visualizer */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Spatial Traffic Density</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loitering zones and path accumulation mapping</p>
          </div>
          <button className="btn" onClick={() => fetchHeatmapData(selectedCam)} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'pulse-critical' : ''} /> Refresh
          </button>
        </div>

        {/* Heatmap canvas */}
        <div style={{ position: 'relative', width: '800px', height: '500px', margin: '0 auto', border: '1px solid var(--border-light)', borderRadius: '8px', overflow: 'hidden' }}>
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={500} 
            style={{ display: 'block', width: '800px', height: '500px' }}
          />
          
          {/* Overlay radar sweeping lines */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: '1px solid rgba(0, 210, 255, 0.1)', pointerEvents: 'none' }} className="scanline-container"></div>
          
          {loading && (
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(5, 8, 17, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontSize: '0.9rem' }}>
              <RefreshCw size={24} style={{ animation: 'radar-sweep 2s linear infinite', marginRight: '10px' }} />
              Reconstructing Density Coordinates...
            </div>
          )}
        </div>

        {/* Heatmap Legend Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '800px', margin: '16px auto 0 auto', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Density Scale:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Low Traffic</span>
            <div style={{ 
              width: '180px', 
              height: '8px', 
              borderRadius: '4px', 
              background: 'linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)' 
            }}></div>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-critical)', fontWeight: '600' }}>Critical (Loitering)</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
            Points Sampled: {points.length}
          </span>
        </div>
      </div>

      {/* Right side: Camera selectors & controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Camera Selector Panel */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} style={{ color: 'var(--color-primary)' }} /> Select Camera
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cameras.map(cam => (
              <button
                key={cam.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: selectedCam === cam.id ? 'var(--color-primary)' : 'var(--border-light)',
                  background: selectedCam === cam.id ? 'rgba(0, 210, 255, 0.05)' : 'rgba(255,255,255,0.01)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  width: '100%',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setSelectedCam(cam.id)}
              >
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: selectedCam === cam.id ? 'var(--color-primary)' : 'var(--text-secondary)' }}>
                  {cam.id}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', marginTop: '2px', color: 'var(--text-primary)' }}>
                  {cam.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Analytic details summary */}
        <div className="glass-panel" style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.01)' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px' }}>Temporal Pacing Analysis</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: '1.4' }}>
            The LSTM network correlates sequential coordinate displacement over time. Zones with high spatial density (red) represent tracking segments where targets spend more than 15 consecutive seconds with displacement velocities lower than 0.2 meters/second, triggering loitering protocols.
          </p>
          
          {hasError && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px', padding: '8px 12px', background: 'rgba(255, 170, 0, 0.08)', borderRadius: '6px', border: '1px solid rgba(255,170,0,0.2)' }}>
              <ShieldAlert size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Offline Fallback: Displaying simulated coordinate clusters for validation.
              </span>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
