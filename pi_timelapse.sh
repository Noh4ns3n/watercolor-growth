#!/bin/bash

# Configuration
CAPTURE_INTERVAL=600
REMOTE_USER="vincent"
REMOTE_IP="192.168.1.34"
REMOTE_HOT_FOLDER="/Users/vincent/Documents/vincent/watercolor-growth/hot_folder" # on main computer
ARCHIVE_DIR="/home/vincent/Documents/watercolor_growth/timelapse_archive" # on the pi
LED_PIN=17

echo "Starting Physarum Timelapse Pipeline with local archiving..."

# Ensure the local archive directory exists
mkdir -p $ARCHIVE_DIR

# Ensure LED starts off
pinctrl set $LED_PIN op dl

while true; do
  # Generate a precise timestamp (e.g., 20260417_225500)
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  LOCAL_FILE="$ARCHIVE_DIR/frame_$TIMESTAMP.png"

  echo "[$TIMESTAMP] Capturing new frame..."
  
  # 1. Turn LED ON
  pinctrl set $LED_PIN op dh
  sleep 0.5
  
  # 2. Capture and save to the unique timestamped file
  rpicam-still --immediate -e png -o $LOCAL_FILE

  # 3. Turn LED OFF
  pinctrl set $LED_PIN op dl

  if [ -f $LOCAL_FILE ]; then
    echo "[$TIMESTAMP] Transferring to Orchestrator..."
    
    # Securely copy the unique file, but rename it to latest.png on the Mac destination
    scp -q $LOCAL_FILE $REMOTE_USER@$REMOTE_IP:$REMOTE_HOT_FOLDER/latest.png
    
    echo "[$TIMESTAMP] Transfer complete. Sleeping for ${CAPTURE_INTERVAL}s."
  else
    echo "[$TIMESTAMP] ERROR: Camera failed to capture."
  fi

  sleep $CAPTURE_INTERVAL
done