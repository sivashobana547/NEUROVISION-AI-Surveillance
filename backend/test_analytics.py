import unittest
import os
import sys
import numpy as np
import tempfile
import shutil

# Add backend directory to path
sys.path.append(os.path.dirname(__file__))

from analytics_engine import NumPyLSTM
from db_client import DBClient
from storage_client import StorageClient


class TestAnalyticsPipeline(unittest.TestCase):
    
    def setUp(self):
        # Set environment to use local db and storage
        os.environ["MONGO_URI"] = ""
        os.environ["S3_BUCKET_NAME"] = ""
        
        self.db = DBClient()
        self.storage = StorageClient()
        self.lstm = NumPyLSTM()

    def test_lstm_dimensions_and_outputs(self):
        """Test that the custom LSTM processes tracks and outputs scores between 0 and 1."""
        # Create dummy sequence: 20 steps, 6 features [x, y, dx, dy, speed, duration]
        dummy_seq = np.random.randn(20, 6)
        score = self.lstm.forward(dummy_seq)
        
        self.assertIsInstance(score, float)
        self.assertTrue(0.0 <= score <= 1.0, f"LSTM score {score} is out of bounds [0, 1]")

    def test_sqlite_fallback_saving_and_fetching(self):
        """Test database client fallback saving and querying operations."""
        alert = {
            "camera_id": "CAM_01",
            "event_type": "Suspicious Loitering",
            "severity": "Warning",
            "description": "Pacing unit test alert description",
            "object_id": 999,
            "duration": 45.2
        }
        
        alert_id = self.db.save_alert(alert)
        self.assertIsNotNone(alert_id, "Failed to save alert to database")
        
        # Retrieve alerts
        all_alerts = self.db.get_alerts()
        self.assertTrue(len(all_alerts) > 0, "No alerts retrieved from database")
        
        # Verify saved alert details
        saved_alert = next((a for a in all_alerts if a["id"] == alert_id), None)
        self.assertIsNotNone(saved_alert, f"Saved alert with ID {alert_id} not found in fetch list")
        self.assertEqual(saved_alert["camera_id"], "CAM_01")
        self.assertEqual(saved_alert["object_id"], 999)
        self.assertEqual(saved_alert["status"], "Active")
        
        # Resolve alert
        success = self.db.resolve_alert(alert_id)
        self.assertTrue(success, "Failed to mark alert as resolved")
        
        updated_alerts = self.db.get_alerts()
        resolved_alert = next((a for a in updated_alerts if a["id"] == alert_id), None)
        self.assertEqual(resolved_alert["status"], "Resolved")

    def test_storage_client_fallback_saving(self):
        """Test storage client files copy fallback."""
        # Create a temporary file to copy
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_file.write(b"fake image data content")
            temp_path = temp_file.name
            
        try:
            dest_name = "test_upload_file.jpg"
            url = self.storage.save_file(temp_path, dest_name)
            
            self.assertIsNotNone(url)
            self.assertEqual(url, f"/static/uploads/{dest_name}")
            
            # Check if copied physically
            uploaded_filepath = os.path.join(self.storage.local_upload_dir, dest_name)
            self.assertTrue(os.path.exists(uploaded_filepath), f"File was not copied to {uploaded_filepath}")
            
            # Cleanup
            if os.path.exists(uploaded_filepath):
                os.remove(uploaded_filepath)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)


if __name__ == '__main__':
    unittest.main()
