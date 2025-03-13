import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Divider,
  Grid,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import MovieIcon from '@mui/icons-material/Movie';
import MemoryIcon from '@mui/icons-material/Memory';
import SyncIcon from '@mui/icons-material/Sync';

const VideoInfo = ({ video, onProcess, onDelete, processingProgress }) => {
  if (!video) return null;

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format duration
  const formatDuration = (seconds) => {
    if (!seconds) return '00:00:00';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        borderRadius: 2,
        backgroundColor: '#1e1e2f',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decorative element */}
      <Box
        sx={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 64, 129, 0.1) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      
      <Box sx={{ mb: 2, position: 'relative', zIndex: 1 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#fff' }}>
          Video Information
        </Typography>
      </Box>

      <Divider sx={{ mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

      <Grid container spacing={3}>
        {/* Video Details */}
        <Grid item xs={12} md={8}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500, color: '#fff' }}>
              {video.originalName}
            </Typography>
            
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Chip
                icon={<AccessTimeIcon />}
                label={`Duration: ${formatDuration(video.duration)}`}
                size="small"
                sx={{ backgroundColor: '#1a237e', color: '#fff', mb: 1 }}
              />
              
              <Chip
                icon={<MemoryIcon />}
                label={`Size: ${formatFileSize(video.size)}`}
                size="small"
                sx={{ backgroundColor: '#1b5e20', color: '#fff', mb: 1 }}
              />
              
              {video.isProcessing ? (
                <Chip
                  icon={<SyncIcon sx={{ animation: 'spin 2s linear infinite' }} />}
                  label="Processing..."
                  size="small"
                  sx={{ 
                    backgroundColor: '#ff6f00', 
                    color: '#fff',
                    mb: 1,
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }}
                />
              ) : video.hasSegments ? (
                <Chip
                  icon={<MovieIcon />}
                  label={`${video.segmentsCount} Segments`}
                  size="small"
                  sx={{ backgroundColor: '#ff6f00', color: '#fff', mb: 1 }}
                />
              ) : null}
            </Stack>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Uploaded: {formatDate(video.createdAt)}
            </Typography>
          </Box>

          {/* Actions */}
          <Box sx={{ mt: 3 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                href={video.url}
                download={video.originalName}
                sx={{
                  backgroundColor: '#2196f3',
                  '&:hover': { backgroundColor: '#1976d2' },
                }}
              >
                Download Original
              </Button>
              
              <Button
                variant="contained"
                startIcon={video.isProcessing ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : <SettingsIcon />}
                onClick={onProcess}
                disabled={video.hasSegments || video.isProcessing || processingProgress.isProcessing}
                sx={{
                  backgroundColor: '#ff4081',
                  '&:hover': { backgroundColor: '#f50057' },
                }}
              >
                {video.isProcessing || processingProgress.isProcessing
                  ? 'Processing...'
                  : video.hasSegments
                  ? 'Already Processed'
                  : 'Process Video'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<DeleteIcon />}
                onClick={onDelete}
                color="error"
                disabled={video.isProcessing}
              >
                Delete Video
              </Button>
            </Stack>
          </Box>
        </Grid>

        {/* Video Preview */}
        <Grid item xs={12} md={4}>
          <Box
            sx={{
              width: '100%',
              height: '100%',
              minHeight: 180,
              backgroundColor: '#000',
              borderRadius: 1,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Box
              component="video"
              src={video.url}
              controls
              preload="metadata"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default VideoInfo; 