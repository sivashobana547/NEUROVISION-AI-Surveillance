import os
import time
from flask import Flask, Response, jsonify, request, send_from_directory
from flask_cors import CORS
import cv2

# Import project modules
from db_client import DBClient
from storage_client import StorageClient
from analytics_engine import SimulationEngine

app = Flask(__name__, static_folder="static")
CORS(app)  # Enable Cross-Origin Resource Sharing

# Initialize system layers
db = DBClient()
storage = StorageClient()
analytics = SimulationEngine(db, storage)

# Route to serve local uploads (fallback video clips and thumbnails)
@app.route('/static/uploads/<path:filename>')
def serve_uploads(filename):
    uploads_dir = os.path.join(app.root_path, "static", "uploads")
    return send_from_directory(uploads_dir, filename)

# Route to serve placeholder assets if needed
@app.route('/static/<path:filename>')
def serve_static(filename):
    static_dir = os.path.join(app.root_path, "static")
    return send_from_directory(static_dir, filename)

# Live stream frame generator
def frame_generator(camera_id):
    """Generates JPEG frame stream for multipart HTTP response."""
    while True:
        try:
            frame = analytics.generate_simulated_frame(camera_id)
            # Encode frame to JPEG
            ret, jpeg = cv2.imencode('.jpg', frame)
            if not ret:
                continue
                
            frame_bytes = jpeg.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            # Control frame rate (~15 FPS)
            time.sleep(0.066)
        except Exception as e:
            print(f"Streaming error on camera {camera_id}: {e}")
            time.sleep(1)

@app.route('/api/video_feed/<camera_id>')
def video_feed(camera_id):
    """Live MJPEG video streaming route."""
    if camera_id not in analytics.cameras:
        return jsonify({"error": "Camera not found"}), 404
        
    return Response(
        frame_generator(camera_id),
        mimetype='multipart/x-mixed-replace; boundary=frame'
    )

@app.route('/api/cameras', methods=['GET'])
def get_cameras():
    """Returns configured cameras list."""
    return jsonify({
        "cameras": [{"id": k, "name": v} for k, v in analytics.cameras.items()]
    })

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Returns dashboard analytics summary."""
    summary = db.get_analytics_summary()
    return jsonify(summary)

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    """Returns list of alerts filtered by criteria."""
    filters = {}
    
    status = request.args.get("status")
    if status:
        filters["status"] = status
        
    severity = request.args.get("severity")
    if severity:
        filters["severity"] = severity
        
    camera_id = request.args.get("camera_id")
    if camera_id:
        filters["camera_id"] = camera_id
        
    alerts = db.get_alerts(filters)
    return jsonify({"alerts": alerts})

@app.route('/api/alerts/<alert_id>/resolve', methods=['POST'])
def resolve_alert(alert_id):
    """Marks a specific alert as resolved."""
    success = db.resolve_alert(alert_id)
    if success:
        return jsonify({"success": True, "message": f"Alert {alert_id} resolved."})
    else:
        return jsonify({"success": False, "message": "Failed to resolve alert."}), 400

@app.route('/api/heatmap/<camera_id>', methods=['GET'])
def get_heatmap(camera_id):
    """Returns heatmap coordinate coordinates for canvas overlays."""
    limit = request.args.get("limit", default=800, type=int)
    points = db.get_heatmap_points(camera_id=camera_id, limit=limit)
    return jsonify({
        "camera_id": camera_id,
        "points": points
    })

@app.route('/api/reports/export', methods=['GET'])
def export_report():
    """Generates structured CSV formatted data for security auditing reports."""
    alerts = db.get_alerts()
    
    # Check if download is requested as file
    as_file = request.args.get("download", default="false").lower() == "true"
    
    # Generate CSV content
    csv_header = "AlertID,Timestamp,CameraID,CameraName,EventType,Severity,Status,ObjectID,Duration(s),Description\n"
    csv_rows = []
    
    for a in alerts:
        cam_name = analytics.cameras.get(a.get("camera_id"), "Unknown")
        # Sanitize description field for CSV
        desc = a.get("description", "").replace('"', '""')
        
        row = f'"{a.get("id")}","{a.get("timestamp")}","{a.get("camera_id")}","{cam_name}","{a.get("event_type")}","{a.get("severity")}","{a.get("status")}",{a.get("object_id")},{a.get("duration")},"{desc}"'
        csv_rows.append(row)
        
    csv_content = csv_header + "\n".join(csv_rows)
    
    if as_file:
        return Response(
            csv_content,
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=surveillance_report.csv"}
        )
    else:
        return jsonify({
            "csv": csv_content,
            "count": len(alerts)
        })

# Create basic placeholders for the front-end to utilize if there are no thumbnails yet
def create_placeholders():
    static_dir = os.path.join(app.root_path, "static")
    os.makedirs(static_dir, exist_ok=True)
    
    # Write a simple default mp4 placeholder (1 second silent) if it doesn't exist
    placeholder_video = os.path.join(static_dir, "placeholder.mp4")
    if not os.path.exists(placeholder_video):
        # We'll write an empty file or basic header to prevent 404s
        with open(placeholder_video, "wb") as f:
            f.write(b"") # Empty file is fine for mock/fallback HTML5 player error state
            
    # Write simple 1x1 black pixel JPG placeholder
    placeholder_img = os.path.join(static_dir, "placeholder_thumb.jpg")
    if not os.path.exists(placeholder_img):
        # 1x1 black image
        import numpy as np
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        cv2.imwrite(placeholder_img, img)

if __name__ == '__main__':
    create_placeholders()
    # Run Flask server on port 5000 (accessible on local network)
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
