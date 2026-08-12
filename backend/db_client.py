import os
import sqlite3
import json
import logging
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("SurveillanceDB")

# Try importing PyMongo
try:
    from pymongo import MongoClient
    from bson import ObjectId
    HAS_PYMONGO = True
except ImportError:
    HAS_PYMONGO = False

class DBClient:
    def __init__(self):
        self.mongo_uri = os.environ.get("MONGO_URI", None)
        self.db_name = os.environ.get("MONGO_DB_NAME", "surveillance_db")
        self.use_mongo = False
        self.mongo_client = None
        self.db = None
        
        # Determine database to use
        if HAS_PYMONGO and self.mongo_uri:
            try:
                logger.info(f"Attempting to connect to MongoDB: {self.mongo_uri}")
                self.mongo_client = MongoClient(self.mongo_uri, serverSelectionTimeoutMS=2000)
                # Check connection
                self.mongo_client.server_info()
                self.db = self.mongo_client[self.db_name]
                self.use_mongo = True
                logger.info("Connected to MongoDB successfully.")
            except Exception as e:
                logger.warning(f"Failed to connect to MongoDB: {e}. Falling back to SQLite.")
        else:
            logger.info("No MongoDB URI configured or pymongo not installed. Using local SQLite.")
            
        if not self.use_mongo:
            # Initialize SQLite
            self.sqlite_path = os.path.join(os.path.dirname(__file__), "surveillance.db")
            self._init_sqlite()

    def _init_sqlite(self):
        """Initialize local SQLite database tables."""
        conn = sqlite3.connect(self.sqlite_path)
        cursor = conn.cursor()
        
        # Create alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id TEXT PRIMARY KEY,
                timestamp TEXT,
                camera_id TEXT,
                event_type TEXT,
                severity TEXT,
                status TEXT,
                description TEXT,
                video_url TEXT,
                thumbnail_url TEXT,
                object_id INTEGER,
                duration REAL
            )
        """)
        
        # Create heatmap_points table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS heatmap_points (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                camera_id TEXT,
                x INTEGER,
                y INTEGER,
                weight REAL,
                timestamp TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        logger.info(f"SQLite database initialized at {self.sqlite_path}")

    def save_alert(self, alert_data):
        """Save a new alert to the database."""
        if "id" not in alert_data:
            alert_data["id"] = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")[:-3]
        if "timestamp" not in alert_data:
            alert_data["timestamp"] = datetime.utcnow().isoformat()
        if "status" not in alert_data:
            alert_data["status"] = "Active"

        if self.use_mongo:
            try:
                # Convert ID to string if needed or use MongoDB default _id
                data_copy = alert_data.copy()
                data_copy["_id"] = data_copy["id"]
                self.db.alerts.replace_one({"_id": data_copy["_id"]}, data_copy, upsert=True)
                return alert_data["id"]
            except Exception as e:
                logger.error(f"Error saving alert to MongoDB: {e}")
                return None
        else:
            try:
                conn = sqlite3.connect(self.sqlite_path)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO alerts (
                        id, timestamp, camera_id, event_type, severity, status, description, video_url, thumbnail_url, object_id, duration
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    alert_data.get("id"),
                    alert_data.get("timestamp"),
                    alert_data.get("camera_id"),
                    alert_data.get("event_type"),
                    alert_data.get("severity"),
                    alert_data.get("status"),
                    alert_data.get("description"),
                    alert_data.get("video_url"),
                    alert_data.get("thumbnail_url"),
                    alert_data.get("object_id"),
                    alert_data.get("duration")
                ))
                conn.commit()
                conn.close()
                return alert_data["id"]
            except Exception as e:
                logger.error(f"Error saving alert to SQLite: {e}")
                return None

    def get_alerts(self, filters=None):
        """Fetch alerts based on filters."""
        if filters is None:
            filters = {}

        if self.use_mongo:
            try:
                query = {}
                if "status" in filters:
                    query["status"] = filters["status"]
                if "severity" in filters:
                    query["severity"] = filters["severity"]
                if "camera_id" in filters:
                    query["camera_id"] = filters["camera_id"]
                
                # Fetch alerts sorting by timestamp descending
                cursor = self.db.alerts.find(query).sort("timestamp", -1)
                alerts = []
                for doc in cursor:
                    doc["id"] = doc.get("_id", doc.get("id"))
                    if "_id" in doc:
                        del doc["_id"]
                    alerts.append(doc)
                return alerts
            except Exception as e:
                logger.error(f"Error getting alerts from MongoDB: {e}")
                return []
        else:
            try:
                conn = sqlite3.connect(self.sqlite_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                query = "SELECT * FROM alerts"
                params = []
                conditions = []
                
                if "status" in filters:
                    conditions.append("status = ?")
                    params.append(filters["status"])
                if "severity" in filters:
                    conditions.append("severity = ?")
                    params.append(filters["severity"])
                if "camera_id" in filters:
                    conditions.append("camera_id = ?")
                    params.append(filters["camera_id"])
                    
                if conditions:
                    query += " WHERE " + " AND ".join(conditions)
                    
                query += " ORDER BY timestamp DESC"
                
                cursor.execute(query, params)
                rows = cursor.fetchall()
                alerts = [dict(row) for row in rows]
                conn.close()
                return alerts
            except Exception as e:
                logger.error(f"Error getting alerts from SQLite: {e}")
                return []

    def resolve_alert(self, alert_id):
        """Mark an alert as resolved."""
        if self.use_mongo:
            try:
                self.db.alerts.update_one({"_id": alert_id}, {"$set": {"status": "Resolved"}})
                return True
            except Exception as e:
                logger.error(f"Error resolving alert in MongoDB: {e}")
                return False
        else:
            try:
                conn = sqlite3.connect(self.sqlite_path)
                cursor = conn.cursor()
                cursor.execute("UPDATE alerts SET status = 'Resolved' WHERE id = ?", (alert_id,))
                conn.commit()
                conn.close()
                return True
            except Exception as e:
                logger.error(f"Error resolving alert in SQLite: {e}")
                return False

    def save_heatmap_point(self, camera_id, x, y, weight=1.0):
        """Record coordinate data for heatmaps."""
        timestamp = datetime.utcnow().isoformat()
        if self.use_mongo:
            try:
                self.db.heatmap.insert_one({
                    "camera_id": camera_id,
                    "x": x,
                    "y": y,
                    "weight": weight,
                    "timestamp": timestamp
                })
                return True
            except Exception as e:
                logger.error(f"Error saving heatmap point to MongoDB: {e}")
                return False
        else:
            try:
                conn = sqlite3.connect(self.sqlite_path)
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO heatmap_points (camera_id, x, y, weight, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                """, (camera_id, x, y, weight, timestamp))
                conn.commit()
                conn.close()
                return True
            except Exception as e:
                logger.error(f"Error saving heatmap point to SQLite: {e}")
                return False

    def get_heatmap_points(self, camera_id=None, limit=1000):
        """Fetch heatmap coordinates."""
        if self.use_mongo:
            try:
                query = {}
                if camera_id:
                    query["camera_id"] = camera_id
                cursor = self.db.heatmap.find(query).sort("timestamp", -1).limit(limit)
                points = []
                for doc in cursor:
                    points.append({
                        "camera_id": doc["camera_id"],
                        "x": doc["x"],
                        "y": doc["y"],
                        "weight": doc.get("weight", 1.0)
                    })
                return points
            except Exception as e:
                logger.error(f"Error getting heatmap points from MongoDB: {e}")
                return []
        else:
            try:
                conn = sqlite3.connect(self.sqlite_path)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                
                query = "SELECT camera_id, x, y, weight FROM heatmap_points"
                params = []
                if camera_id:
                    query += " WHERE camera_id = ?"
                    params.append(camera_id)
                
                query += f" ORDER BY timestamp DESC LIMIT {limit}"
                cursor.execute(query, params)
                rows = cursor.fetchall()
                points = [dict(row) for row in rows]
                conn.close()
                return points
            except Exception as e:
                logger.error(f"Error getting heatmap points from SQLite: {e}")
                return []

    def get_analytics_summary(self):
        """Fetch high level stats for cards."""
        alerts = self.get_alerts()
        
        # Calculate summary numbers
        total_alerts = len(alerts)
        active_alerts = len([a for a in alerts if a["status"] == "Active"])
        resolved_alerts = total_alerts - active_alerts
        
        # Count types
        type_counts = {}
        for a in alerts:
            t = a["event_type"]
            type_counts[t] = type_counts.get(t, 0) + 1
            
        return {
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "resolved_alerts": resolved_alerts,
            "type_counts": type_counts
        }
