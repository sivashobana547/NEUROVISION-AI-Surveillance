import os
import cv2
import numpy as np
import time
import random
from datetime import datetime
import logging

logger = logging.getLogger("SurveillanceAnalytics")

# Try to import real packages (for production integration)
try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

try:
    from deep_sort_realtime.deepsort_tracker import DeepSort
    HAS_DEEPSORT = True
except ImportError:
    HAS_DEEPSORT = False


def sigmoid(x):
    return 1 / (1 + np.exp(-np.clip(x, -500, 500)))


class NumPyLSTM:
    """
    A pure NumPy implementation of an LSTM classifier.
    Analyzes sequences of tracking features [x, y, dx, dy, speed, duration]
    to output a "suspicious probability score".
    """
    def __init__(self, input_dim=6, hidden_dim=16):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        
        # Initialize deterministic weights to mimic a trained network
        # that flags loitering (low movement, high duration) and pacing (oscillating coordinates).
        np.random.seed(42)
        
        # Gates weights: concat(W, U) -> shape is (hidden_dim, hidden_dim + input_dim)
        concat_dim = hidden_dim + input_dim
        self.Wf = np.random.randn(hidden_dim, concat_dim) * 0.1
        self.Wi = np.random.randn(hidden_dim, concat_dim) * 0.1
        self.Wc = np.random.randn(hidden_dim, concat_dim) * 0.1
        self.Wo = np.random.randn(hidden_dim, concat_dim) * 0.1
        
        # Biases
        self.bf = np.zeros((hidden_dim, 1))
        self.bi = np.zeros((hidden_dim, 1))
        self.bc = np.zeros((hidden_dim, 1))
        self.bo = np.zeros((hidden_dim, 1))
        
        # Dense layer output
        self.Wy = np.random.randn(1, hidden_dim) * 0.1
        self.by = np.zeros((1, 1))
        
        # Bias the Forget Gate to 1.0 (standard LSTM practice)
        self.bf.fill(1.0)
        
        # Set specific weight connections to trigger higher scores
        # for sequences with high duration (feature index 5) and low velocity (index 4)
        self.Wc[:, hidden_dim + 4] = -1.5  # Negative correlation with speed (high speed = lower suspect score)
        self.Wc[:, hidden_dim + 5] = 2.0   # Positive correlation with duration

    def forward(self, sequence):
        """
        Args:
            sequence: Numpy array of shape (seq_len, input_dim)
        Returns:
            suspicious_score: float (0.0 to 1.0)
        """
        h = np.zeros((self.hidden_dim, 1))
        c = np.zeros((self.hidden_dim, 1))
        
        for t in range(len(sequence)):
            xt = sequence[t].reshape(-1, 1)  # (input_dim, 1)
            concat = np.vstack((h, xt))      # (hidden_dim + input_dim, 1)
            
            # Compute gates
            ft = sigmoid(np.dot(self.Wf, concat) + self.bf)
            it = sigmoid(np.dot(self.Wi, concat) + self.bi)
            c_tilde = np.tanh(np.dot(self.Wc, concat) + self.bc)
            
            c = ft * c + it * c_tilde
            ot = sigmoid(np.dot(self.Wo, concat) + self.bo)
            h = ot * np.tanh(c)
            
        # Compute final classification probability
        y = sigmoid(np.dot(self.Wy, h) + self.by)
        return float(y[0, 0])


class RealPipelineWrapper:
    """
    Template showing how YOLOv8 and DeepSORT are loaded and run in production.
    """
    def __init__(self, model_path="yolov8n.pt"):
        self.has_models = HAS_YOLO and HAS_DEEPSORT
        if self.has_models:
            self.model = YOLO(model_path)
            self.tracker = DeepSort(max_age=30, n_init=3)
            logger.info("YOLOv8 & DeepSORT initialized.")
        else:
            logger.warning("Production packages (ultralytics/deep-sort-realtime) not active. Running simulation fallback.")

    def process_frame(self, frame):
        """
        Accepts a standard OpenCV frame, runs YOLOv8 and DeepSORT tracking.
        Returns:
            tracks: list of dicts: [{'id': tracker_id, 'bbox': [x, y, w, h], 'class': 'person'}]
        """
        if not self.has_models:
            return []
            
        results = self.model(frame, verbose=False)[0]
        detections = []
        
        # Parse YOLOv8 predictions
        for box in results.boxes:
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            conf = float(box.conf[0])
            cls_id = int(box.cls[0])
            
            # Track people and specific suspicious vehicles/backpacks
            if results.names[cls_id] in ['person', 'car', 'motorcycle', 'backpack', 'suitcase']:
                detections.append([
                    [x1, y1, x2 - x1, y2 - y1],  # xywh
                    conf,
                    results.names[cls_id]        # class name
                ])
                
        # Track objects
        tracks = self.tracker.update_tracks(detections, frame=frame)
        active_tracks = []
        for track in tracks:
            if not track.is_confirmed():
                continue
            track_id = track.track_id
            ltrb = track.to_ltrb() # Left, Top, Right, Bottom
            class_name = track.get_det_class()
            
            active_tracks.append({
                'id': track_id,
                'bbox': [int(ltrb[0]), int(ltrb[1]), int(ltrb[2] - ltrb[0]), int(ltrb[3] - ltrb[1])],
                'class': class_name
            })
            
        return active_tracks


class SimulationEngine:
    """
    Simulates a live multi-camera environment, generating video frames,
    bounding boxes, object ID tracking, coordinates for heatmaps,
    and runs LSTM analysis on object paths to trigger realistic alerts.
    """
    def __init__(self, db_client, storage_client):
        self.db = db_client
        self.storage = storage_client
        self.lstm = NumPyLSTM()
        
        # Cameras config
        self.cameras = {
            "CAM_01": "Main Entrance Gate",
            "CAM_02": "Restricted Back Yard",
            "CAM_03": "North Parking Lot"
        }
        
        # Track simulated entities
        # Schema: {track_id: {"class": c, "history": [[x,y]], "start_time": t, "alert_triggered": bool}}
        self.entity_tracks = {}
        self.track_counter = 101
        
        # Virtual coordinates
        self.frame_width = 800
        self.frame_height = 500
        
        # Directory for temporary clip files
        self.temp_dir = os.path.join(os.path.dirname(__file__), "temp_videos")
        os.makedirs(self.temp_dir, exist_ok=True)
        
        # Initialize some initial background alerts in DB so the user sees history
        self._seed_initial_alerts()

    def _seed_initial_alerts(self):
        """Pre-populates the database with historical alerts for dashboards."""
        existing = self.db.get_alerts()
        if len(existing) > 0:
            return  # Already has data
            
        logger.info("Seeding historical alerts for demo dashboard...")
        events = [
            ("CAM_02", "Restricted Area Intrusion", "Critical", "Unauthorized personnel entered restricted perimeter Zone B.", 104, 15.4),
            ("CAM_01", "Suspicious Loitering", "Warning", "Individual pacing around exit door for 45+ seconds.", 108, 52.1),
            ("CAM_03", "Unattended Object", "Warning", "Suitcase left unattended near terminal pillars.", 112, 120.5),
            ("CAM_02", "Suspicious Loitering", "Warning", "Person standing near server room air intake for prolonged duration.", 115, 68.3)
        ]
        
        for cam, evt, sev, desc, obj_id, dur in events:
            # Seed alerts with dates from the last 24 hours
            timestamp = datetime.fromtimestamp(time.time() - random.randint(1000, 80000)).isoformat()
            alert_id = f"ALERT_{random.randint(1000, 9999)}"
            
            # Write a dummy thumbnail/video path
            self.db.save_alert({
                "id": alert_id,
                "timestamp": timestamp,
                "camera_id": cam,
                "event_type": evt,
                "severity": sev,
                "status": "Resolved" if random.random() > 0.4 else "Active",
                "description": desc,
                "video_url": "/static/placeholder.mp4",
                "thumbnail_url": "/static/placeholder_thumb.jpg",
                "object_id": obj_id,
                "duration": dur
            })
            
            # Seed heatmap points around these positions
            for _ in range(30):
                self.db.save_heatmap_point(
                    cam, 
                    random.randint(100, 700), 
                    random.randint(100, 400), 
                    weight=random.uniform(0.5, 2.0)
                )

    def generate_simulated_frame(self, camera_id):
        """
        Creates a synthetic video frame as numpy array, overlays tracks and boxes,
        runs LSTM behavior check, generates real video clips & alerts on trigger.
        Returns:
            frame: cv2 image frame (RGB)
        """
        # Create dark blue dashboard style background
        frame = np.zeros((self.frame_height, self.frame_width, 3), dtype=np.uint8)
        
        # Grid lines (futuristic grid aesthetic)
        for i in range(0, self.frame_width, 80):
            cv2.line(frame, (i, 0), (i, self.frame_height), (15, 20, 30), 1)
        for i in range(0, self.frame_height, 80):
            cv2.line(frame, (0, i), (self.frame_width, i), (15, 20, 30), 1)
            
        # Draw camera overlay details
        cv2.putText(frame, f"FEED: {self.cameras[camera_id]} ({camera_id})", (20, 35), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (200, 200, 200), 2)
        cv2.putText(frame, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), (self.frame_width - 240, 35), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (130, 200, 255), 1)
        
        # Camera static boundary zone (restricted yard boundary)
        if camera_id == "CAM_02":
            # Restricted zone boundary box
            cv2.rectangle(frame, (200, 150), (600, 400), (0, 0, 150), 2)
            cv2.putText(frame, "RESTRICTED AREA ZONE-B", (210, 175), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)
            
        # Manage entities in the camera feed
        # We ensure there are 2-3 entities active
        active_ids = [k for k, v in self.entity_tracks.items() if v.get("camera_id") == camera_id]
        if len(active_ids) < 3:
            # Spawn new tracking target
            new_id = self.track_counter
            self.track_counter += 1
            
            # Setup path behavior (normal vs suspicious)
            behavior_type = "normal"
            if camera_id == "CAM_02" and random.random() > 0.4:
                behavior_type = "intruder"
            elif camera_id == "CAM_01" and random.random() > 0.4:
                behavior_type = "loitering"
            
            # Random starting coordinates
            if behavior_type == "intruder":
                start_x, start_y = random.choice([(10, 250), (400, 10), (780, 250)])
            else:
                start_x = random.randint(50, 750)
                start_y = random.choice([40, 450])
                
            self.entity_tracks[new_id] = {
                "camera_id": camera_id,
                "class": "person" if random.random() > 0.2 else "backpack",
                "x": start_x,
                "y": start_y,
                "dx": random.choice([-2, 2]) * random.uniform(0.5, 2.0),
                "dy": random.choice([-2, 2]) * random.uniform(0.5, 2.0),
                "history": [(start_x, start_y)],
                "start_time": time.time(),
                "behavior": behavior_type,
                "alert_triggered": False
            }
            
        # Process and draw entities
        to_delete = []
        for track_id, info in self.entity_tracks.items():
            if info["camera_id"] != camera_id:
                continue
                
            # Get data
            x, y = info["x"], info["y"]
            dx, dy = info["dx"], info["dy"]
            behavior = info["behavior"]
            cls = info["class"]
            
            # Apply behavior pathing modifications
            if behavior == "loitering":
                # Circle/pace back and forth in the center
                if len(info["history"]) > 40:
                    info["dx"] = -dx + random.uniform(-0.5, 0.5)
                    info["dy"] = -dy + random.uniform(-0.5, 0.5)
                    # Reset behavior to normal pathing so it eventually walks away
                    if len(info["history"]) > 250:
                        info["behavior"] = "normal"
            elif behavior == "intruder":
                # Guide towards restricted box (200, 150) -> (600, 400)
                tx, ty = 400, 280
                dist_x, dist_y = tx - x, ty - y
                magnitude = np.sqrt(dist_x**2 + dist_y**2)
                if magnitude > 5:
                    info["dx"] = (dist_x / magnitude) * 1.5
                    info["dy"] = (dist_y / magnitude) * 1.5
                else:
                    # Stays inside restricted area
                    info["dx"] = random.uniform(-0.5, 0.5)
                    info["dy"] = random.uniform(-0.5, 0.5)
            else:
                # Normal walk-through, slight random drift
                if random.random() > 0.95:
                    info["dx"] += random.uniform(-0.5, 0.5)
                    info["dy"] += random.uniform(-0.5, 0.5)

            # Update coordinates
            x_new = int(x + info["dx"])
            y_new = int(y + info["dy"])
            
            # Out of bounds check
            if x_new < 0 or x_new > self.frame_width or y_new < 0 or y_new > self.frame_height:
                to_delete.append(track_id)
                continue
                
            info["x"], info["y"] = x_new, y_new
            info["history"].append((x_new, y_new))
            
            # Periodically record points to heatmap table (every 30 frames roughly)
            if len(info["history"]) % 30 == 0:
                self.db.save_heatmap_point(camera_id, x_new, y_new)

            # Draw Bounding Box and ID
            w, h = (60, 120) if cls == "person" else (40, 40)
            rect_color = (0, 255, 0) # Green for normal tracking
            
            # Run LSTM on track history coordinates to determine suspicious activities
            duration = time.time() - info["start_time"]
            
            # Calculate features for LSTM input: [x, y, dx, dy, speed, duration]
            # Normalizing coordinates to standard values
            x_norm = x_new / self.frame_width
            y_norm = y_new / self.frame_height
            speed = np.sqrt(info["dx"]**2 + info["dy"]**2)
            
            # Collect last 20 frames sequence (or pad if shorter)
            seq_len = 20
            history_slice = info["history"][-seq_len:]
            if len(history_slice) < seq_len:
                # Pad
                history_slice = [(info["history"][0])] * (seq_len - len(history_slice)) + history_slice
                
            seq_features = []
            for h_idx in range(len(history_slice)):
                hx, hy = history_slice[h_idx]
                h_dx = info["dx"] if h_idx == 0 else hx - history_slice[h_idx-1][0]
                h_dy = info["dy"] if h_idx == 0 else hy - history_slice[h_idx-1][1]
                h_speed = np.sqrt(h_dx**2 + h_dy**2)
                seq_features.append([hx/self.frame_width, hy/self.frame_height, h_dx/10, h_dy/10, h_speed/10, duration/100])
                
            # Perform LSTM Inference
            seq_arr = np.array(seq_features, dtype=np.float32)
            suspect_score = self.lstm.forward(seq_arr)
            
            # Double check spatial context
            in_restricted = False
            if camera_id == "CAM_02" and (200 <= x_new <= 600) and (150 <= y_new <= 400):
                in_restricted = True
                suspect_score = max(suspect_score, 0.85) # Override for restricted intrusion

            # Highlight suspicious items
            is_suspicious = suspect_score > 0.70
            if is_suspicious:
                rect_color = (0, 0, 255) # Red for alert
                
            # Draw tracking trail history lines
            if len(info["history"]) > 1:
                pts = np.array(info["history"][-40:], np.int32)
                pts = pts.reshape((-1, 1, 2))
                cv2.polylines(frame, [pts], False, (100, 100, 100) if not is_suspicious else (0, 0, 180), 2)
            
            # Draw bounding box rectangle
            cv2.rectangle(frame, (x_new - w//2, y_new - h//2), (x_new + w//2, y_new + h//2), rect_color, 2)
            
            # Text tags
            tag = f"ID:{track_id} {cls.upper()}"
            if is_suspicious:
                tag += " [SUSPECT]"
            cv2.putText(frame, tag, (x_new - w//2, y_new - h//2 - 10), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, rect_color, 1)
            
            # Trigger Alarm & record video clip once LSTM confirms event
            if is_suspicious and not info["alert_triggered"] and duration > 10.0:
                info["alert_triggered"] = True
                self._trigger_alert_event(camera_id, track_id, cls, behavior, duration, (x_new, y_new))
                
        # Remove tracks that exited screen
        for track_id in to_delete:
            if track_id in self.entity_tracks:
                del self.entity_tracks[track_id]
                
        return frame

    def _trigger_alert_event(self, camera_id, track_id, cls, behavior, duration, pos):
        """Generates video clip, thumbnails, and uploads them, saving the alert database record."""
        logger.info(f"ALARM! Suspicious event detected on {camera_id}: ID {track_id} behavior: {behavior}")
        
        event_type = "Suspicious Loitering"
        severity = "Warning"
        description = f"Subject ID {track_id} exhibiting loitering patterns for {int(duration)}s."
        
        if camera_id == "CAM_02" and behavior == "intruder":
            event_type = "Restricted Area Intrusion"
            severity = "Critical"
            description = f"Intruder ID {track_id} breached restricted perimeter Zone B coordinates."
        elif cls == "backpack" and duration > 30:
            event_type = "Unattended Object"
            severity = "Warning"
            description = f"Backpack ID {track_id} left unattended in camera frame."

        alert_id = f"ALT_{int(time.time())}"
        
        # Save a crop/thumbnail
        thumb_filename = f"thumb_{alert_id}.jpg"
        clip_filename = f"clip_{alert_id}.mp4"
        
        # Generate a real physical thumbnail image and a small video clip
        # We construct a mock video clip of 150 frames with the event overlaid
        thumb_path = os.path.join(self.temp_dir, thumb_filename)
        clip_path = os.path.join(self.temp_dir, clip_filename)
        
        # Generate thumbnail (synthetic)
        thumb_img = np.zeros((300, 480, 3), dtype=np.uint8)
        # Render simulated alert view
        cv2.rectangle(thumb_img, (0, 0), (480, 300), (20, 20, 40), -1)
        cv2.rectangle(thumb_img, (180, 100), (300, 260), (0, 0, 255), 2)
        cv2.putText(thumb_img, f"ALARM: {event_type.upper()}", (30, 45), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        cv2.putText(thumb_img, f"Camera: {camera_id} | ID: {track_id}", (30, 80), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        cv2.imwrite(thumb_path, thumb_img)
        
        # Generate brief MP4 clip representing the suspicious tracks
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        out_video = cv2.VideoWriter(clip_path, fourcc, 15.0, (self.frame_width, self.frame_height))
        
        # Write 45 frames (3 seconds) of simulated video to file
        temp_tracks = {
            track_id: {
                "camera_id": camera_id, "class": cls, "x": pos[0] - 50, "y": pos[1] - 50,
                "dx": 2.0, "dy": 2.0, "history": [], "behavior": behavior, "start_time": time.time()
            }
        }
        
        for _ in range(45):
            temp_frame = np.zeros((self.frame_height, self.frame_width, 3), dtype=np.uint8)
            # Draw standard grid
            for i in range(0, self.frame_width, 80):
                cv2.line(temp_frame, (i, 0), (i, self.frame_height), (15, 20, 30), 1)
            for i in range(0, self.frame_height, 80):
                cv2.line(temp_frame, (0, i), (self.frame_width, i), (15, 20, 30), 1)
                
            # Draw entity
            ti = temp_tracks[track_id]
            ti["x"] = int(ti["x"] + ti["dx"])
            ti["y"] = int(ti["y"] + ti["dy"])
            ti["history"].append((ti["x"], ti["y"]))
            
            # Keep boundaries
            ti["x"] = max(20, min(self.frame_width - 20, ti["x"]))
            ti["y"] = max(20, min(self.frame_height - 20, ti["y"]))
            
            # Draw bounding box
            cv2.rectangle(temp_frame, (ti["x"] - 30, ti["y"] - 60), (ti["x"] + 30, ti["y"] + 60), (0, 0, 255), 2)
            cv2.putText(temp_frame, f"SUSPECT ID:{track_id}", (ti["x"] - 30, ti["y"] - 70), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 255), 1)
            
            # Draw history lines
            if len(ti["history"]) > 1:
                pts = np.array(ti["history"], np.int32).reshape((-1, 1, 2))
                cv2.polylines(temp_frame, [pts], False, (0, 0, 255), 1)
                
            # Camera tags
            cv2.putText(temp_frame, f"ALERT EVENT RECORDING - {camera_id}", (20, 35), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
            cv2.putText(temp_frame, datetime.now().strftime("%Y-%m-%d %H:%M:%S"), (self.frame_width - 220, 35), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 100, 100), 1)
            
            out_video.write(temp_frame)
            
        out_video.release()
        
        # Save files to Storage Client (either local uploads path or S3)
        thumb_url = self.storage.save_file(thumb_path, thumb_filename)
        video_url = self.storage.save_file(clip_path, clip_filename)
        
        # Remove local temp scratch files
        try:
            if os.path.exists(thumb_path):
                os.remove(thumb_path)
            if os.path.exists(clip_path):
                os.remove(clip_path)
        except Exception as e:
            logger.warning(f"Failed to clean up temp files: {e}")
            
        # Write Alert details to DB Client
        self.db.save_alert({
            "id": alert_id,
            "timestamp": datetime.utcnow().isoformat(),
            "camera_id": camera_id,
            "event_type": event_type,
            "severity": severity,
            "status": "Active",
            "description": description,
            "video_url": video_url,
            "thumbnail_url": thumb_url,
            "object_id": track_id,
            "duration": round(duration, 1)
        })
