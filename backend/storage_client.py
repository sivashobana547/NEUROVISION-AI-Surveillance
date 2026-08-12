import os
import shutil
import logging

logger = logging.getLogger("SurveillanceStorage")

try:
    import boto3
    from botocore.exceptions import NoCredentialsError
    HAS_BOTO3 = True
except ImportError:
    HAS_BOTO3 = False

class StorageClient:
    def __init__(self):
        self.bucket_name = os.environ.get("S3_BUCKET_NAME", None)
        self.aws_access_key = os.environ.get("AWS_ACCESS_KEY_ID", None)
        self.aws_secret_key = os.environ.get("AWS_SECRET_ACCESS_KEY", None)
        self.use_s3 = False
        self.s3_client = None

        if HAS_BOTO3 and self.bucket_name and self.aws_access_key and self.aws_secret_key:
            try:
                logger.info(f"Attempting to initialize S3 connection for bucket: {self.bucket_name}")
                self.s3_client = boto3.client(
                    's3',
                    aws_access_key_id=self.aws_access_key,
                    aws_secret_access_key=self.aws_secret_key
                )
                self.use_s3 = True
                logger.info("S3 storage client initialized successfully.")
            except Exception as e:
                logger.warning(f"Failed to initialize S3 client: {e}. Falling back to local storage.")
        else:
            logger.info("S3 credentials/bucket not configured. Using local filesystem storage.")

        # Local storage setup
        self.local_upload_dir = os.path.join(
            os.path.dirname(__file__), "static", "uploads"
        )
        os.makedirs(self.local_upload_dir, exist_ok=True)

    def save_file(self, src_path, dest_filename):
        """
        Saves a file from src_path to storage.
        Returns the public URL of the saved file.
        """
        if not os.path.exists(src_path):
            logger.error(f"Source file does not exist: {src_path}")
            return None

        if self.use_s3:
            try:
                # Upload to S3
                self.s3_client.upload_file(
                    src_path, 
                    self.bucket_name, 
                    dest_filename,
                    ExtraArgs={'ACL': 'public-read'} # Assuming bucket allows ACLs
                )
                url = f"https://{self.bucket_name}.s3.amazonaws.com/{dest_filename}"
                logger.info(f"Uploaded {dest_filename} to S3 bucket. URL: {url}")
                return url
            except NoCredentialsError:
                logger.error("AWS credentials not found.")
            except Exception as e:
                logger.error(f"Failed to upload to S3: {e}")
                
            # If S3 fails, fall back to local inside this block
            logger.warning("S3 upload failed. Falling back to local storage.")

        # Local storage execution
        dest_path = os.path.join(self.local_upload_dir, dest_filename)
        try:
            shutil.copy2(src_path, dest_path)
            # Return server relative URL path
            url = f"/static/uploads/{dest_filename}"
            logger.info(f"Saved file locally: {dest_path}. URL: {url}")
            return url
        except Exception as e:
            logger.error(f"Failed to save file locally: {e}")
            return None
