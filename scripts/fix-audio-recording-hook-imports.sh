#!/bin/bash
# Script untuk memperbarui semua import useAudioRecording ke lokasi baru

echo "Memperbarui imports untuk useAudioRecording hook..."

# Backup files
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backup_audio_recording_hook_${TIMESTAMP}"
mkdir -p $BACKUP_DIR
cp -r src $BACKUP_DIR/
echo "Backup disimpan di $BACKUP_DIR"

# Perbaiki import paths
echo "Mengupdate import paths..."

# Option 1: Ganti dengan @/lib/hooks
find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useAudioRecording } from "@/features/scheduling/hooks/use-audio-recording"|import { useAudioRecording } from "@/lib/hooks"|g'

# Option 2: Ganti dengan import langsung ke file
# find src -type f -name "*.tsx" -o -name "*.ts" | xargs sed -i '' 's|import { useAudioRecording } from "@/features/scheduling/hooks/use-audio-recording"|import { useAudioRecording } from "@/lib/hooks/use-audio-recording"|g'

echo "Selesai! Import useAudioRecording telah diperbarui." 