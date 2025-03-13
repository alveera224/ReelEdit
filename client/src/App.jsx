import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Button, 
  CircularProgress, 
  Paper, 
  LinearProgress,
  IconButton,
  Snackbar,
  Alert,
  Divider,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Tooltip,
  Fade,
  Zoom,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MovieIcon from '@mui/icons-material/Movie';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import HistoryIcon from '@mui/icons-material/History';
import ContentCutIcon from '@mui/icons-material/ContentCut';
import DownloadIcon from '@mui/icons-material/Download';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import io from 'socket.io-client';
import axios from 'axios';
import './App.css';

// API configuration
const API_URL = 'http://localhost:5000/api';
const STREAM_URL = 'http://localhost:5000/stream/video';
const SEGMENT_STREAM_URL = 'http://localhost:5000/stream/segment';
const SEGMENT_DOWNLOAD_URL = 'http://localhost:5000/download/segment';

// Initialize Socket.IO
const socket = io('http://localhost:5000');

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadedVideo, setUploadedVideo] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [uploadHistory, setUploadHistory] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [videoSegments, setVideoSegments] = useState([]);
  const [processingVideo, setProcessingVideo] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Load upload history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('uploadHistory');
    if (savedHistory) {
      try {
        setUploadHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse upload history:', e);
      }
    }
  }, []);

  // Save upload history to localStorage when it changes
  useEffect(() => {
    if (uploadHistory.length > 0) {
      localStorage.setItem('uploadHistory', JSON.stringify(uploadHistory));
    }
  }, [uploadHistory]);

  // Socket.IO event listeners
  useEffect(() => {
    // Listen for segment processing progress
    socket.on('segmentProgress', (data) => {
      if (uploadedVideo && uploadedVideo.id === data.videoId) {
        setProcessingProgress(data.percent);
      }
    });

    // Listen for processing completion
    socket.on('processingComplete', (data) => {
      if (uploadedVideo && uploadedVideo.id === data.videoId) {
        setProcessingVideo(false);
        setVideoSegments(data.segments);
        showSnackbar('Video processing completed!', 'success');
      }
    });

    // Listen for processing errors
    socket.on('processingError', (data) => {
      if (uploadedVideo && uploadedVideo.id === data.videoId) {
        setProcessingVideo(false);
        setError(`Processing error: ${data.error}`);
        showSnackbar(`Processing error: ${data.error}`, 'error');
      }
    });

    // Cleanup on unmount
    return () => {
      socket.off('segmentProgress');
      socket.off('processingComplete');
      socket.off('processingError');
    };
  }, [uploadedVideo]);

  // Show snackbar notification
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log(`Selected file: ${file.name}, size: ${file.size}, type: ${file.type}`);
      setSelectedFile(file);
      setError(null);
      showSnackbar(`Selected: ${file.name}`, 'info');
    }
  };

  // Handle drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        setError(null);
        showSnackbar(`Selected: ${file.name}`, 'info');
      } else {
        showSnackbar('Please select a valid video file', 'error');
      }
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + ' MB';
    else return (bytes / 1073741824).toFixed(2) + ' GB';
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file first');
      showSnackbar('Please select a file first', 'error');
      return;
    }

    // Validate file type
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a valid video file');
      showSnackbar('Please select a valid video file', 'error');
      return;
    }

    // Validate file size (500MB max)
    const MAX_SIZE = 500 * 1024 * 1024; // 500MB
    if (selectedFile.size > MAX_SIZE) {
      setError('File is too large. Maximum size is 500MB');
      showSnackbar('File is too large. Maximum size is 500MB', 'error');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);
    showSnackbar('Uploading video, please wait...', 'info');

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);

      const response = await axios.post(`${API_URL}/videos/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log(`Upload progress: ${percentCompleted}%`);
          setUploadProgress(percentCompleted);
        },
      });

      console.log('Upload response:', response.data);

      if (response.data && response.data.videoId) {
        showSnackbar('Video uploaded successfully!', 'success');
        
        // Get video info
        const videoInfoResponse = await axios.get(`${API_URL}/videos/${response.data.videoId}`);
        console.log('Video info:', videoInfoResponse.data);
        
        const videoData = {
          id: response.data.videoId,
          url: `${STREAM_URL}/${response.data.videoId}`,
          name: selectedFile.name,
          size: selectedFile.size,
          type: selectedFile.type,
          uploadedAt: new Date().toISOString()
        };
        
        // Set the uploaded video for preview
        setUploadedVideo(videoData);
        
        // Add to upload history
        setUploadHistory(prev => [videoData, ...prev.slice(0, 9)]);
        
        // Reset selected file
        setSelectedFile(null);
      } else {
        setError('Upload failed: Invalid server response');
        showSnackbar('Upload failed: Invalid server response', 'error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(`Upload failed: ${err.response?.data?.error || err.message || 'Unknown error'}`);
      showSnackbar(`Upload failed: ${err.response?.data?.error || err.message || 'Unknown error'}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Handle video selection from history
  const handleSelectVideo = (video) => {
    setUploadedVideo(video);
    setSelectedSegment(null);
    setActiveTab(0);
    showSnackbar(`Selected video: ${video.name}`, 'info');
    
    // Check if video has segments
    fetchVideoSegments(video.id);
  };

  // Handle video deletion from history
  const handleDeleteVideo = (videoId) => {
    setUploadHistory(prev => prev.filter(v => v.id !== videoId));
    if (uploadedVideo && uploadedVideo.id === videoId) {
      setUploadedVideo(null);
      setVideoSegments([]);
      setSelectedSegment(null);
    }
    showSnackbar('Video removed from history', 'info');
  };

  // Fetch video segments
  const fetchVideoSegments = async (videoId) => {
    try {
      const response = await axios.get(`${API_URL}/videos/${videoId}/segments`);
      if (response.data && Array.isArray(response.data)) {
        setVideoSegments(response.data);
      } else {
        setVideoSegments([]);
      }
    } catch (error) {
      console.log('No segments available yet or video not processed');
      setVideoSegments([]);
    }
  };

  // Process video into segments
  const handleProcessVideo = async () => {
    if (!uploadedVideo) {
      showSnackbar('No video selected', 'error');
      return;
    }

    setProcessingVideo(true);
    setProcessingProgress(0);
    setError(null);
    showSnackbar('Processing video into 15-second segments...', 'info');

    try {
      const response = await axios.post(`${API_URL}/videos/${uploadedVideo.id}/process`);
      console.log('Processing started:', response.data);
      
      // The actual progress and completion will be handled by Socket.IO events
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingVideo(false);
      setError(`Processing failed: ${error.response?.data?.error || error.message || 'Unknown error'}`);
      showSnackbar(`Processing failed: ${error.response?.data?.error || error.message || 'Unknown error'}`, 'error');
    }
  };

  // Handle segment selection
  const handleSelectSegment = (segment) => {
    setSelectedSegment(segment);
    showSnackbar(`Selected segment ${segment.index}`, 'info');
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box className="app-background">
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Zoom in={true} timeout={800}>
          <Paper elevation={3} sx={{ 
            p: 3, 
            mb: 4, 
            borderRadius: 3, 
            background: 'linear-gradient(145deg, #ffffff, #f5f5f5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <Typography variant="h3" component="h1" gutterBottom align="center" sx={{ 
              fontWeight: 700, 
              background: 'linear-gradient(45deg, #2196F3, #3f51b5)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 3,
              letterSpacing: '-0.5px'
            }}>
              ReelEdit Video Upload
            </Typography>
            <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 4 }}>
              Upload, preview, and manage your videos in one place
            </Typography>
          </Paper>
        </Zoom>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            {/* File Selection */}
            <Fade in={true} timeout={1000}>
              <Paper elevation={3} sx={{ 
                p: 3, 
                mb: 3, 
                borderRadius: 3, 
                height: '100%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)'
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CloudUploadIcon sx={{ mr: 1, color: '#2196F3' }} />
                  <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 0 }}>
                    Upload New Video
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                
                <Box 
                  sx={{ 
                    border: '2px dashed #2196F3', 
                    borderRadius: 3, 
                    p: 3, 
                    mb: 3, 
                    textAlign: 'center',
                    backgroundColor: dragActive ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 0.1)',
                      borderColor: '#1976d2'
                    },
                    cursor: 'pointer'
                  }}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('video-upload').click()}
                  className={dragActive ? 'upload-area active' : 'upload-area'}
                >
                  <input
                    accept="video/*"
                    style={{ display: 'none' }}
                    id="video-upload"
                    type="file"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  <MovieIcon sx={{ fontSize: 48, color: '#2196F3', mb: 2, opacity: 0.8 }} />
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
                    {dragActive ? 'Drop your video here' : 'Drag & Drop your video here'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    or
                  </Typography>
                  <Button
                    variant="contained"
                    component="span"
                    disabled={uploading}
                    startIcon={<CloudUploadIcon />}
                    sx={{ 
                      mb: 2,
                      background: 'linear-gradient(45deg, #2196F3, #1976d2)',
                      boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1976d2, #2196F3)',
                        boxShadow: '0 6px 15px rgba(33, 150, 243, 0.4)',
                      }
                    }}
                  >
                    Browse Files
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Supported formats: MP4, WebM, MOV, AVI (Max size: 500MB)
                  </Typography>
                </Box>
                
                {selectedFile && (
                  <Zoom in={true} timeout={500}>
                    <Box sx={{ 
                      mb: 3, 
                      p: 2, 
                      backgroundColor: 'rgba(0, 0, 0, 0.03)', 
                      borderRadius: 2,
                      border: '1px solid rgba(0, 0, 0, 0.08)'
                    }}>
                      <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                        Selected: {selectedFile.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Size: {formatFileSize(selectedFile.size)} | Type: {selectedFile.type}
                      </Typography>
                      
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpload}
                        disabled={uploading}
                        fullWidth
                        sx={{ 
                          py: 1.5,
                          background: 'linear-gradient(45deg, #4caf50, #2e7d32)',
                          boxShadow: '0 4px 10px rgba(76, 175, 80, 0.3)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #2e7d32, #4caf50)',
                            boxShadow: '0 6px 15px rgba(76, 175, 80, 0.4)',
                          }
                        }}
                      >
                        {uploading ? (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                            Uploading... {uploadProgress}%
                          </Box>
                        ) : (
                          'Upload Video'
                        )}
                      </Button>
                      
                      {uploading && (
                        <Box sx={{ width: '100%', mt: 2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={uploadProgress} 
                            sx={{ 
                              height: 8, 
                              borderRadius: 4,
                              backgroundColor: 'rgba(76, 175, 80, 0.2)',
                              '& .MuiLinearProgress-bar': {
                                backgroundColor: '#4caf50',
                                backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)',
                                backgroundSize: '1rem 1rem',
                                animation: 'progress-bar-stripes 1s linear infinite',
                              }
                            }}
                          />
                          <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 1 }}>
                            {uploadProgress}% complete
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Zoom>
                )}
                
                {/* Recent Uploads */}
                {uploadHistory.length > 0 && (
                  <Box sx={{ mt: 4 }} className="animate-fade-in">
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <HistoryIcon sx={{ mr: 1, color: '#757575' }} />
                      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, mb: 0 }}>
                        Recent Uploads
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />
                    
                    <Box sx={{ maxHeight: '300px', overflowY: 'auto', pr: 1 }}>
                      {uploadHistory.map((video, index) => (
                        <Fade in={true} timeout={300 + index * 100} key={video.id}>
                          <Box 
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              mb: 1, 
                              p: 1.5, 
                              borderRadius: 2,
                              backgroundColor: uploadedVideo?.id === video.id ? 'rgba(33, 150, 243, 0.1)' : 'rgba(0, 0, 0, 0.02)',
                              border: uploadedVideo?.id === video.id ? '1px solid rgba(33, 150, 243, 0.3)' : '1px solid transparent',
                              '&:hover': { 
                                backgroundColor: uploadedVideo?.id === video.id ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                              },
                              transition: 'all 0.2s ease'
                            }}
                          >
                            <Box sx={{ 
                              width: 40, 
                              height: 40, 
                              borderRadius: '50%', 
                              backgroundColor: 'rgba(33, 150, 243, 0.1)', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              mr: 2
                            }}>
                              <MovieIcon sx={{ color: '#2196F3', fontSize: 20 }} />
                            </Box>
                            <Box sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                                {video.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatFileSize(video.size)} • {formatDate(video.uploadedAt)}
                              </Typography>
                            </Box>
                            <Box>
                              <Tooltip title="Play Video">
                                <IconButton 
                                  size="small" 
                                  color="primary" 
                                  onClick={() => handleSelectVideo(video)}
                                  sx={{ 
                                    mr: 1,
                                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                    '&:hover': {
                                      backgroundColor: 'rgba(33, 150, 243, 0.2)',
                                    }
                                  }}
                                >
                                  <PlayArrowIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Remove from History">
                                <IconButton 
                                  size="small" 
                                  color="error" 
                                  onClick={() => handleDeleteVideo(video.id)}
                                  sx={{ 
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                    '&:hover': {
                                      backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                    }
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </Fade>
                      ))}
                    </Box>
                  </Box>
                )}
              </Paper>
            </Fade>
          </Grid>

          <Grid item xs={12} md={6}>
            {/* Video Preview */}
            <Fade in={true} timeout={1200}>
              <Paper elevation={3} sx={{ 
                p: 3, 
                borderRadius: 3, 
                height: '100%',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12)'
                }
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PlayArrowIcon sx={{ mr: 1, color: '#4caf50' }} />
                  <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600, mb: 0 }}>
                    Video Preview
                  </Typography>
                </Box>
                <Divider sx={{ mb: 3 }} />
                
                {uploadedVideo ? (
                  <Zoom in={true} timeout={500}>
                    <Box className="animate-fade-in">
                      {/* Tabs for Original and Segmented Videos */}
                      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                        <Tabs 
                          value={activeTab} 
                          onChange={handleTabChange} 
                          variant="fullWidth"
                          sx={{
                            '& .MuiTab-root': {
                              fontWeight: 500,
                              py: 1.5
                            }
                          }}
                        >
                          <Tab 
                            label="Original Video" 
                            icon={<MovieIcon />} 
                            iconPosition="start"
                          />
                          <Tab 
                            label="Segmented Videos" 
                            icon={<ContentCutIcon />} 
                            iconPosition="start"
                          />
                        </Tabs>
                      </Box>

                      {/* Original Video Tab */}
                      {activeTab === 0 && (
                        <Box>
                          <Box sx={{ 
                            position: 'relative',
                            width: '100%', 
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                            mb: 2,
                            backgroundColor: '#000'
                          }}>
                            <video
                              controls
                              width="100%"
                              autoPlay
                              src={uploadedVideo.url}
                              style={{ display: 'block', maxHeight: '400px' }}
                              className="video-player"
                            >
                              Your browser does not support the video tag.
                            </video>
                            <Box sx={{ 
                              position: 'absolute', 
                              top: 10, 
                              right: 10, 
                              backgroundColor: 'rgba(0,0,0,0.5)',
                              borderRadius: '50%',
                              width: 36,
                              height: 36,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Tooltip title="Open in Fullscreen">
                                <IconButton 
                                  size="small" 
                                  sx={{ color: 'white' }}
                                  onClick={() => window.open(uploadedVideo.url, '_blank')}
                                >
                                  <FullscreenIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          
                          <Card variant="outlined" sx={{ 
                            mb: 2, 
                            borderRadius: 2,
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
                            }
                          }}>
                            <CardContent>
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                                {uploadedVideo.name}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <Box sx={{ 
                                  backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                                  color: '#4caf50', 
                                  borderRadius: 10, 
                                  px: 1.5, 
                                  py: 0.5,
                                  display: 'flex',
                                  alignItems: 'center',
                                  width: 'fit-content'
                                }}>
                                  <CheckCircleIcon sx={{ fontSize: 16, mr: 0.5 }} />
                                  <Typography variant="caption" sx={{ fontWeight: 500 }}>
                                    Ready to Play
                                  </Typography>
                                </Box>
                              </Box>
                              <Typography variant="body2" color="text.secondary" paragraph>
                                Size: {formatFileSize(uploadedVideo.size)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Uploaded: {formatDate(uploadedVideo.uploadedAt)}
                              </Typography>
                            </CardContent>
                          </Card>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                            <Button 
                              variant="outlined" 
                              color="primary" 
                              href={uploadedVideo.url} 
                              target="_blank"
                              sx={{ 
                                mr: 2,
                                borderRadius: 2,
                                px: 3
                              }}
                              startIcon={<FullscreenIcon />}
                            >
                              Open in New Tab
                            </Button>
                            <Button 
                              variant="contained" 
                              color="secondary" 
                              onClick={handleProcessVideo}
                              disabled={processingVideo}
                              sx={{ 
                                borderRadius: 2,
                                px: 3,
                                background: 'linear-gradient(45deg, #9c27b0, #673ab7)',
                                boxShadow: '0 4px 10px rgba(156, 39, 176, 0.3)',
                                '&:hover': {
                                  background: 'linear-gradient(45deg, #8e24aa, #5e35b1)',
                                  boxShadow: '0 6px 15px rgba(156, 39, 176, 0.4)',
                                }
                              }}
                              startIcon={<ContentCutIcon />}
                            >
                              {processingVideo ? 'Processing...' : 'Segment Video'}
                            </Button>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                            <Button 
                              variant="outlined" 
                              color="error" 
                              onClick={() => setUploadedVideo(null)}
                              sx={{ 
                                borderRadius: 2,
                                px: 3
                              }}
                              startIcon={<DeleteIcon />}
                            >
                              Close Preview
                            </Button>
                          </Box>
                          
                          {processingVideo && (
                            <Box sx={{ width: '100%', mt: 3 }}>
                              <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                                Processing video into 15-second segments: {processingProgress}%
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={processingProgress} 
                                sx={{ 
                                  height: 8, 
                                  borderRadius: 4,
                                  backgroundColor: 'rgba(156, 39, 176, 0.2)',
                                  '& .MuiLinearProgress-bar': {
                                    backgroundColor: '#9c27b0',
                                    backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)',
                                    backgroundSize: '1rem 1rem',
                                    animation: 'progress-bar-stripes 1s linear infinite',
                                  }
                                }}
                              />
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Segmented Videos Tab */}
                      {activeTab === 1 && (
                        <Box>
                          {videoSegments.length > 0 ? (
                            <Box>
                              {/* Segment Player */}
                              {selectedSegment && (
                                <Box sx={{ 
                                  position: 'relative',
                                  width: '100%', 
                                  borderRadius: 3,
                                  overflow: 'hidden',
                                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                                  mb: 3,
                                  backgroundColor: '#000'
                                }}>
                                  <video
                                    controls
                                    width="100%"
                                    autoPlay
                                    src={`${SEGMENT_STREAM_URL}/${selectedSegment.id}`}
                                    style={{ display: 'block', maxHeight: '300px' }}
                                    className="video-player segment-player"
                                  >
                                    Your browser does not support the video tag.
                                  </video>
                                  <Box sx={{ 
                                    position: 'absolute', 
                                    top: 10, 
                                    right: 10, 
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    borderRadius: '50%',
                                    width: 36,
                                    height: 36,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                  }}>
                                    <Tooltip title="Open in Fullscreen">
                                      <IconButton 
                                        size="small" 
                                        sx={{ color: 'white' }}
                                        onClick={() => window.open(`${SEGMENT_STREAM_URL}/${selectedSegment.id}`, '_blank')}
                                      >
                                        <FullscreenIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  </Box>
                                </Box>
                              )}

                              {/* Segment List */}
                              <Typography variant="h6" gutterBottom sx={{ fontWeight: 500, mb: 2 }}>
                                15-Second Segments ({videoSegments.length})
                              </Typography>
                              
                              <Box sx={{ 
                                maxHeight: selectedSegment ? '200px' : '400px', 
                                overflowY: 'auto', 
                                pr: 1,
                                borderRadius: 2,
                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                backgroundColor: 'rgba(0, 0, 0, 0.02)'
                              }}>
                                <List>
                                  {videoSegments.map((segment) => (
                                    <ListItem 
                                      key={segment.id}
                                      button
                                      onClick={() => handleSelectSegment(segment)}
                                      selected={selectedSegment?.id === segment.id}
                                      className="segment-list-item segment-item"
                                      sx={{ 
                                        mb: 0.5,
                                        borderRadius: 1,
                                        backgroundColor: selectedSegment?.id === segment.id ? 'rgba(33, 150, 243, 0.1)' : 'transparent',
                                        '&:hover': {
                                          backgroundColor: selectedSegment?.id === segment.id ? 'rgba(33, 150, 243, 0.15)' : 'rgba(0, 0, 0, 0.04)',
                                        }
                                      }}
                                    >
                                      <ListItemIcon>
                                        <VideoLibraryIcon color="primary" />
                                      </ListItemIcon>
                                      <ListItemText 
                                        primary={`Segment ${segment.index}`} 
                                        secondary={`Start: ${segment.startTime}s | Duration: ${segment.duration}s`}
                                      />
                                      <ListItemSecondaryAction>
                                        <Tooltip title="Download Segment">
                                          <IconButton 
                                            edge="end" 
                                            color="primary"
                                            href={`${SEGMENT_DOWNLOAD_URL}/${segment.id}`}
                                            download={`segment_${segment.index}.mp4`}
                                          >
                                            <DownloadIcon />
                                          </IconButton>
                                        </Tooltip>
                                      </ListItemSecondaryAction>
                                    </ListItem>
                                  ))}
                                </List>
                              </Box>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                                <Button 
                                  variant="contained" 
                                  color="primary" 
                                  onClick={() => setActiveTab(0)}
                                  sx={{ 
                                    borderRadius: 2,
                                    px: 3,
                                    background: 'linear-gradient(45deg, #2196F3, #1976d2)',
                                    boxShadow: '0 4px 10px rgba(33, 150, 243, 0.3)',
                                    '&:hover': {
                                      background: 'linear-gradient(45deg, #1976d2, #2196F3)',
                                      boxShadow: '0 6px 15px rgba(33, 150, 243, 0.4)',
                                    }
                                  }}
                                  startIcon={<MovieIcon />}
                                >
                                  Back to Original Video
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              py: 8,
                              backgroundColor: 'rgba(0, 0, 0, 0.02)',
                              borderRadius: 3,
                              border: '1px dashed #ccc'
                            }}>
                              <ContentCutIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                              <Typography variant="h6" color="text.secondary" align="center" sx={{ fontWeight: 500 }}>
                                No segments available
                              </Typography>
                              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, maxWidth: '80%', mb: 3 }}>
                                Process the video to create 15-second segments
                              </Typography>
                              <Button 
                                variant="contained" 
                                color="secondary" 
                                onClick={handleProcessVideo}
                                disabled={processingVideo}
                                sx={{ 
                                  borderRadius: 2,
                                  px: 3,
                                  background: 'linear-gradient(45deg, #9c27b0, #673ab7)',
                                  boxShadow: '0 4px 10px rgba(156, 39, 176, 0.3)',
                                  '&:hover': {
                                    background: 'linear-gradient(45deg, #8e24aa, #5e35b1)',
                                    boxShadow: '0 6px 15px rgba(156, 39, 176, 0.4)',
                                  }
                                }}
                                startIcon={<ContentCutIcon />}
                              >
                                {processingVideo ? 'Processing...' : 'Segment Video'}
                              </Button>
                              
                              {processingVideo && (
                                <Box sx={{ width: '100%', mt: 3, px: 4 }}>
                                  <Typography variant="body2" color="text.secondary" align="center" gutterBottom>
                                    Processing video into 15-second segments: {processingProgress}%
                                  </Typography>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={processingProgress} 
                                    sx={{ 
                                      height: 8, 
                                      borderRadius: 4,
                                      backgroundColor: 'rgba(156, 39, 176, 0.2)',
                                      '& .MuiLinearProgress-bar': {
                                        backgroundColor: '#9c27b0',
                                        backgroundImage: 'linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.15) 50%, rgba(255, 255, 255, 0.15) 75%, transparent 75%, transparent)',
                                        backgroundSize: '1rem 1rem',
                                        animation: 'progress-bar-stripes 1s linear infinite',
                                      }
                                    }}
                                  />
                                </Box>
                              )}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Zoom>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    py: 10,
                    backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 3,
                    border: '1px dashed #ccc'
                  }}>
                    <Box sx={{ 
                      width: 80, 
                      height: 80, 
                      borderRadius: '50%', 
                      backgroundColor: 'rgba(0, 0, 0, 0.04)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      mb: 2
                    }}>
                      <PlayArrowIcon sx={{ fontSize: 40, color: 'text.disabled' }} />
                    </Box>
                    <Typography variant="h6" color="text.secondary" align="center" sx={{ fontWeight: 500 }}>
                      No video selected
                    </Typography>
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, maxWidth: '80%' }}>
                      Upload a new video or select one from your recent uploads to preview it here
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Fade>
          </Grid>
        </Grid>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          TransitionComponent={Fade}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            variant="filled"
            sx={{ 
              width: '100%',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              borderRadius: 2
            }}
            icon={snackbar.severity === 'success' ? <CheckCircleIcon /> : undefined}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </Box>
  );
}

export default App;
