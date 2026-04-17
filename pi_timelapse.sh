#!/bin/bash

# Timelapse script running on the Pi
CAPTURE_INTERVAL=600 # 10 minutes in seconds
REMOTE_USER="vincent"
REMOTE_IP="192.168.1.34"
REMOTE_HOT_FOLDER="/Users/vincent/Documents/vincent/watercolor-growth/hot_folder" # on main computer
TEMP_FILE="/home/vincent/Documents/watercolor_growth/latest_capture.png" # on the pi

echo "Starting Physarum Timelapse Pipeline..."

while true; do
  echo "[$(date)] Capturing new frame..."
  
  # Take a photo. 
  # --immediate forces capture without a preview warmup.
  # --tuning-file adjusts color balance if needed (optional).
  rpicam-still --immediate -e png -o $TEMP_FILE

  if [ -f $TEMP_FILE ]; then
    echo "[$(date)] Transferring to Orchestrator..."
    
    # Securely copy the file to the hot_folder, renaming it to latest.png
    scp -q $TEMP_FILE $REMOTE_USER@$REMOTE_IP:$REMOTE_HOT_FOLDER/latest.png
    
    echo "[$(date)] Transfer complete. Sleeping for ${CAPTURE_INTERVAL}s."
  else
    echo "[$(date)] ERROR: Camera failed to capture."
  fi

  sleep $CAPTURE_INTERVAL
done