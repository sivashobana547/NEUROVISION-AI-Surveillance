# Automated Video Surveillance Threat Detection Pipeline

An end-to-end video analytics pipeline designed for military, intelligence, and high-security organizations (such as NSG) to automate CCTV camera monitoring, track human/object vectors, and detect suspicious behavioral patterns (loitering, zone intrusions, unattended objects) in real time.

---

## 🏗️ Architecture & AI Pipeline

```
┌────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│ IP/CCTV Camera │ ───> │ YOLOv8 Object Detection │ ───> │ DeepSORT Multi-Tracking │
└────────────────┘      └─────────────────────────┘      └─────────────────────────┘
                                                                      │
                                                                      ▼
┌────────────────┐      ┌─────────────────────────┐      ┌─────────────────────────┐
│ React UI HUD   │ <─── │   Flask REST/MJPEG API  │ <─── │ NumPy LSTM Sequence Net │
└────────────────┘      └─────────────────────────┘      └─────────────────────────┘
        │                            │
        ▼                            ▼
┌───────────────┐      ┌─────────────────────────┐
│ Local / S3    │      │  Local SQLite / MongoDB │
└───────────────┘      └─────────────────────────┘
```

1. **YOLOv8 Detection Layer**: Processes raw frames to locate and classify bounding boxes for target classes (`person`, `backpack`, `suitcase`, `car`, `motorcycle`).
2. **DeepSORT Tracking Layer**: Assigns unique, consistent ID integers to each detected object across consecutive video frames, tracking continuous motion vectors.
3. **LSTM Behavioral Net**: A Recurrent Neural Network (RNN) with Long Short-Term Memory cells that ingests spatial coordinates, velocities, and tracking durations over a rolling window. It scores behavioral threat probabilities (pacing, loitering, intrusion).
4. **Flask Core API**: Serves JSON APIs for database logs, heatmap densities, dashboard state, and stream MJPEG feeds to web browsers.
5. **Storage & Database Layer**: Stores security metadata (alerts log) and recorded evidence clips, with automated failover fallbacks between MongoDB/S3 and Local SQLite/Filesystem.
6. **React HUD Dashboard**: Visualizes feeds, tracks, alarm streams, and canvas heatmaps in a dark-mode glassmorphism interface.

---

## 🛠️ Repository File Structure

```
video-surveillance-analytics/
├── backend/
│   ├── app.py                # Flask Server (MJPEG Streamer & REST APIs)
│   ├── analytics_engine.py   # AI Pipeline (YOLO/DeepSORT wrapper + custom NumPy LSTM)
│   ├── db_client.py          # Database Wrapper (MongoDB with SQLite fallback)
│   ├── storage_client.py     # Media Storage Wrapper (Amazon S3 with local directory fallback)
│   ├── requirements.txt      # Python dependencies
│   └── test_analytics.py     # Backend unit tests
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.jsx # KPI cards & statistics charts
│   │   │   ├── LiveFeed.jsx  # Multi-camera matrix view & log console
│   │   │   ├── Heatmap.jsx   # Pixel-manipulated Canvas loitering heatmap
│   │   │   └── Reports.jsx   # Historical audit log & HTML5 clip playback
│   │   ├── App.jsx           # Global state & API polling coordinator
│   │   ├── index.css         # Styling system (Glassmorphism & animations)
│   │   └── main.jsx          # Entry point
│   ├── index.html            # HTML shell with meta SEO configuration
│   ├── package.json          # Node dependencies
│   └── vite.config.js        # Vite config
├── .gitignore                # Git exclusion config
└── README.md                 # Main Documentation
```

---

## ⚙️ Quick Start Installation

Ensure **Python 3.10+** (accessible via `py` on Windows or `python` on Unix) and **Node.js v18+** are installed.

### 1. Start the Flask Backend
```bash
# Navigate to the backend folder
cd backend

# Create a virtual environment
py -m venv venv

# Activate the virtual environment
# On Windows:
.\venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend unit tests to verify the installation
python test_analytics.py

# Launch the server
python app.py
```
*The Flask server runs on [http://localhost:5000](http://localhost:5000).*

### 2. Start the React Frontend
```bash
# Navigate to the frontend folder
cd frontend

# Install package dependencies
npm install

# Run the local development server
npm run dev
```
*The React UI runs on [http://localhost:5173](http://localhost:5173).*

---

## ☁️ Cloud Configuration (Optional)

To enable actual MongoDB and Amazon S3 integrations instead of the local fallbacks, set the following environment variables in your server terminal before launching `app.py`:

```bash
# MongoDB Config
set MONGO_URI="mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority"
set MONGO_DB_NAME="surveillance_db"

# Amazon S3 Config
set S3_BUCKET_NAME="nsg-surveillance-evidence"
set AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
set AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

---

## 📡 Live Stream Integration (Replacing the Simulator)

To replace the simulation loops with actual hardware camera feeds running YOLOv8 and DeepSORT tracking models:

1. Inside `backend/requirements.txt`, install the deep learning libraries:
   ```txt
   ultralytics>=8.0.0
   deep-sort-realtime>=1.3.0
   ```
2. Download a YOLOv8 weights file (e.g., `yolov8n.pt`).
3. In `backend/analytics_engine.py`, enable model loading and modify `SimulationEngine`'s loop to grab frames from your cameras using OpenCV instead of the synthetic frames:
   ```python
   # Replace the simulator track update logic:
   cap = cv2.VideoCapture("rtsp://admin:password@192.168.1.50:554/stream1")
   ret, frame = cap.read()
   if ret:
       # Run YOLO & DeepSORT inference
       tracks = real_pipeline.process_frame(frame)
       # For each track, update coordinate history arrays and feed to lstm.forward()
   ```
