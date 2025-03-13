import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Divider,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import MovieIcon from '@mui/icons-material/Movie';
import SyncIcon from '@mui/icons-material/Sync';
import { videoApi } from '../services/api';

const VideoSegments = ({ segments, onPlaySegment, processingProgress, video }) => {
  const { isProcessing, currentSegment, totalSegments, percent } = processingProgress;
  const isVideoProcessing = video?.isProcessing || isProcessing;

  // Format time for segment title (e.g., "0:00 - 0:15")
  const formatSegmentTime = (index) => {
    const segmentLength = 15; // 15 seconds per segment
    const startTime = index * segmentLength;
    const endTime = startTime + segmentLength;
    
    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };
    
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  // Handle segment download with proper mime type and filename
  const handleDownload = (segment) => {
    // Get video ID from URL
    const videoId = video?.id;
    if (!videoId) return;
    
    // Create properly formatted download URL
    let downloadUrl;
    if (segment.downloadUrl) {
      // Add download=true parameter
      downloadUrl = segment.downloadUrl.includes('?') 
        ? `${segment.downloadUrl}&download=true` 
        : `${segment.downloadUrl}?download=true`;
    } else if (segment.url) {
      // Add download=true parameter
      downloadUrl = segment.url.includes('?') 
        ? `${segment.url}&download=true` 
        : `${segment.url}?download=true`;
    } else if (videoId && segment.name) {
      // Create a fresh download URL using our API helper
      downloadUrl = videoApi.getSegmentStreamUrl(videoId, segment.name, true);
    } else {
      console.error('Cannot create download URL for segment', segment);
      return;
    }
    
    // Create and click a download link
    const fileName = `segment_${segment.id + 1}.${segment.extension || 'mp4'}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = downloadUrl;
    downloadLink.download = fileName;
    downloadLink.setAttribute('type', segment.mimeType || 'video/mp4');
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
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
          bottom: -30,
          left: -30,
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(144, 202, 249, 0.1) 0%, transparent 70%)',
          zIndex: 0,
        }}
      />
      
      <Box sx={{ mb: 3, position: 'relative', zIndex: 1 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#fff' }}>
          Video Segments
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Each segment is 15 seconds long. Click to play or download individual segments.
        </Typography>
        
        {isVideoProcessing && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SyncIcon 
                  sx={{ 
                    mr: 1, 
                    color: '#ff4081',
                    animation: 'spin 2s linear infinite',
                    '@keyframes spin': {
                      '0%': { transform: 'rotate(0deg)' },
                      '100%': { transform: 'rotate(360deg)' }
                    }
                  }} 
                />
                <Typography variant="body2" color="primary">
                  Processing segments: {currentSegment || 0} of {totalSegments || '?'}
                </Typography>
              </Box>
              <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                {percent || 0}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={percent || 0}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '& .MuiLinearProgress-bar': {
                  background: 'linear-gradient(90deg, #ff4081, #f50057)',
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        )}
      </Box>

      <Divider sx={{ mb: 3, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

      {segments.length === 0 && !isVideoProcessing ? (
        <Box sx={{ textAlign: 'center', py: 4, position: 'relative', zIndex: 1 }}>
          <MovieIcon sx={{ fontSize: 60, color: '#666', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No segments available yet. Process your video to create 15-second segments.
          </Typography>
        </Box>
      ) : segments.length === 0 && isVideoProcessing ? (
        <Box sx={{ textAlign: 'center', py: 4, position: 'relative', zIndex: 1 }}>
          <CircularProgress sx={{ color: '#ff4081', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Creating video segments. Please wait...
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {segments.map((segment) => (
            <Grid item xs={12} sm={6} md={4} key={segment.id}>
              <Card
                elevation={2}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  background: 'linear-gradient(145deg, #232342 0%, #1e1e2f 100%)',
                  borderRadius: 2,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 20px rgba(0, 0, 0, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MovieIcon sx={{ mr: 1, color: '#ff4081' }} />
                    <Typography variant="subtitle1" component="div" sx={{ fontWeight: 500, color: '#fff' }}>
                      Segment {segment.id + 1}
                    </Typography>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {formatSegmentTime(segment.id)}
                  </Typography>
                  
                  <Chip
                    label="15 seconds"
                    size="small"
                    sx={{
                      mt: 1,
                      backgroundColor: 'rgba(255, 64, 129, 0.2)',
                      color: '#ff4081',
                      fontWeight: 500,
                    }}
                  />
                </CardContent>
                
                <CardActions sx={{ p: 2, pt: 0, justifyContent: 'space-between' }}>
                  <Button
                    size="small"
                    startIcon={<PlayCircleOutlineIcon />}
                    onClick={() => onPlaySegment(segment)}
                    sx={{ color: '#90caf9' }}
                  >
                    Play
                  </Button>
                  
                  <Button
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownload(segment)}
                    sx={{ color: '#ff4081' }}
                  >
                    Download
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default VideoSegments; 