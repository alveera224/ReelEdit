import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Slider,
  Grid,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import RefreshIcon from '@mui/icons-material/Refresh';
import { getStreamUrl } from '../services/api';

const VideoPlayer = ({ videoUrl, title }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processedUrl, setProcessedUrl] = useState('');
  const [retryAttempted, setRetryAttempted] = useState(false);

  // Process the video URL to ensure it uses our streaming endpoint
  useEffect(() => {
    if (!videoUrl) {
      console.log('VideoPlayer: No videoUrl provided');
      setProcessedUrl('');
      setLoading(false);
      return;
    }

    console.log('VideoPlayer: Processing URL:', videoUrl);
    setLoading(true);
    setError(null);
    
    try {
      // If the URL is already a full URL, use it directly
      if (videoUrl.includes('http://') || videoUrl.includes('https://')) {
        console.log('VideoPlayer: Using provided URL directly');
        setProcessedUrl(videoUrl);
      } 
      // If the URL is a video ID, convert it to a streaming URL
      else if (videoUrl.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)) {
        console.log('VideoPlayer: Converting video ID to streaming URL');
        setProcessedUrl(getStreamUrl('video', videoUrl));
      }
      // If the URL is a relative path, use it as is
      else {
        console.log('VideoPlayer: Using relative URL');
        setProcessedUrl(videoUrl);
      }
    } catch (error) {
      console.error('VideoPlayer: Error processing URL:', error);
      setError('Failed to process video URL');
    }
  }, [videoUrl]);

  // Format time in MM:SS format
  const formatTime = (time) => {
    if (isNaN(time)) return '00:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Reload video if there was an error
  const handleReload = () => {
    if (videoRef.current) {
      setError(null);
      setLoading(true);
      
      // Generate a new URL with a fresh timestamp
      const timestamp = new Date().getTime();
      const freshUrl = `${processedUrl.split('?')[0]}?cache=${timestamp}`;
      setProcessedUrl(freshUrl);
      
      // Force reload
      videoRef.current.load();
    }
  };

  // Handle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (error) {
        // If there was an error, try reloading the video first
        handleReload();
        return;
      }
      
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        const playPromise = videoRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Auto-play started successfully
              setIsPlaying(true);
            })
            .catch(err => {
              // Auto-play was prevented
              console.error('Error playing video:', err);
              setError('Video playback was prevented. Click to try again.');
              setIsPlaying(false);
            });
        }
      }
    }
  };

  // Handle mute/unmute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Handle volume change
  const handleVolumeChange = (event, newValue) => {
    if (videoRef.current) {
      videoRef.current.volume = newValue;
      setVolume(newValue);
      setIsMuted(newValue === 0);
    }
  };

  // Handle seek
  const handleSeek = (event, newValue) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newValue;
      setCurrentTime(newValue);
    }
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        containerRef.current.requestFullscreen();
      }
    }
  };

  // Handle mouse movement to show/hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    
    // Clear existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Set new timeout to hide controls after 3 seconds
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Update current time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Set duration when metadata is loaded
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setLoading(false);
    }
  };

  // Handle video end
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  };
  
  // Handle video error
  const handleError = (e) => {
    console.error('VideoPlayer: Error event triggered:', e);
    
    if (videoRef.current) {
      console.error('VideoPlayer: Error code:', videoRef.current.error?.code);
      console.error('VideoPlayer: Error message:', videoRef.current.error?.message);
    }
    
    let errorMessage = 'Error loading video. ';
    
    if (videoRef.current && videoRef.current.error) {
      switch (videoRef.current.error.code) {
        case 1: // MEDIA_ERR_ABORTED
          errorMessage += 'The video playback was aborted.';
          break;
        case 2: // MEDIA_ERR_NETWORK
          errorMessage += 'A network error occurred while loading the video.';
          // Try to reload the video with a direct URL if it fails due to CORS
          retryWithDirectUrl();
          break;
        case 3: // MEDIA_ERR_DECODE
          errorMessage += 'The video file is corrupted or the format is not supported.';
          break;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage += 'The video format is not supported by your browser.';
          // Try to use a different format or URL approach
          retryWithDirectUrl();
          break;
        default:
          errorMessage += 'An unknown error occurred.';
      }
    }
    
    setError(errorMessage);
    setLoading(false);
  };
  
  // Handle video loaded
  const handleLoaded = () => {
    console.log('VideoPlayer: Video loaded successfully');
    setLoading(false);
    setError(null);
  };

  // Retry playing with a direct URL to bypass CORS issues
  const retryWithDirectUrl = () => {
    if (!processedUrl || retryAttempted) return;
    
    console.log('VideoPlayer: Retrying with direct URL approach');
    
    // Extract the core URL without query parameters
    const baseUrl = processedUrl.split('?')[0];
    
    // Add a timestamp to avoid caching
    const timestamp = new Date().getTime();
    const directUrl = `${baseUrl}?direct=true&t=${timestamp}`;
    
    console.log('VideoPlayer: Retrying with URL:', directUrl);
    
    if (videoRef.current) {
      // Try with a direct approach and full CORS headers
      videoRef.current.src = directUrl;
      videoRef.current.load();
    }
    
    // Set flag to prevent infinite retry loops
    setRetryAttempted(true);
  };

  // Reset retry flag when URL changes
  useEffect(() => {
    setRetryAttempted(false);
  }, [videoUrl]);

  // Reset video when url changes
  useEffect(() => {
    if (!processedUrl) {
      console.log('VideoPlayer: No processed URL available');
      return;
    }
    
    console.log('VideoPlayer: URL changed, resetting video with:', processedUrl);
    setLoading(true);
    setError(null);
    setCurrentTime(0);
    setIsPlaying(false);
    
    if (videoRef.current) {
      try {
        videoRef.current.src = processedUrl;
        videoRef.current.load();
        console.log('VideoPlayer: Video element updated with new source');
      } catch (err) {
        console.error('VideoPlayer: Error updating video source:', err);
        setError('Failed to load video source');
        setLoading(false);
      }
    } else {
      console.error('VideoPlayer: Video ref is null');
    }
  }, [processedUrl]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // Handle video loading events
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !processedUrl) return;

    const handleLoadStart = () => {
      console.log('VideoPlayer: Video loading started');
      setLoading(true);
    };

    const handleLoadedData = () => {
      console.log('VideoPlayer: Video data loaded');
      setLoading(false);
      setError(null);
    };

    const handleError = (e) => {
      console.error('VideoPlayer: Video loading error:', e);
      setLoading(false);
      setError('Failed to load video. Please try again.');
      
      // If this is the first error, try with a different URL format
      if (!retryAttempted && videoUrl) {
        console.log('VideoPlayer: Attempting to retry with different URL format');
        setRetryAttempted(true);
        // Try with a timestamp to avoid caching issues
        const timestamp = new Date().getTime();
        setProcessedUrl(`${processedUrl}${processedUrl.includes('?') ? '&' : '?'}t=${timestamp}`);
      }
    };

    videoElement.addEventListener('loadstart', handleLoadStart);
    videoElement.addEventListener('loadeddata', handleLoadedData);
    videoElement.addEventListener('error', handleError);

    return () => {
      videoElement.removeEventListener('loadstart', handleLoadStart);
      videoElement.removeEventListener('loadeddata', handleLoadedData);
      videoElement.removeEventListener('error', handleError);
    };
  }, [processedUrl, videoUrl, retryAttempted]);

  return (
    <Paper
      elevation={3}
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        backgroundColor: '#000',
        position: 'relative',
      }}
    >
      <Box
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        sx={{
          position: 'relative',
          width: '100%',
          paddingTop: '56.25%', // 16:9 aspect ratio
          backgroundColor: '#000',
          cursor: showControls ? 'default' : 'none',
        }}
      >
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 10,
            }}
          >
            <CircularProgress sx={{ color: '#ff4081' }} />
          </Box>
        )}
        
        {error && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              p: 3,
              textAlign: 'center',
              zIndex: 10,
            }}
          >
            <Typography variant="body1" color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
            <IconButton 
              onClick={handleReload} 
              sx={{ color: '#ff4081' }}
            >
              <RefreshIcon sx={{ fontSize: 40 }} />
            </IconButton>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              Click to reload
            </Typography>
          </Box>
        )}
        
        <Box
          component="video"
          ref={videoRef}
          className={classes.video}
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleError}
          onLoadedData={handleLoaded}
          playsInline
          preload="auto"
          muted={isMuted}
          controls
          crossOrigin="anonymous"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        >
          {/* Provide multiple source alternatives for better compatibility */}
          <source src={processedUrl} type="video/mp4" />
          <source src={processedUrl} type="video/webm" />
          {/* Fallback message if video can't be played */}
          <p>Your browser does not support HTML5 video.</p>
        </Box>

        {/* Video Title */}
        {showControls && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              p: 2,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
              transition: 'opacity 0.3s',
              zIndex: 5,
            }}
          >
            <Typography variant="subtitle1" color="white" noWrap>
              {title}
            </Typography>
          </Box>
        )}

        {/* Video Controls */}
        {showControls && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              p: 2,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
              transition: 'opacity 0.3s',
              zIndex: 5,
            }}
          >
            {/* Progress Bar */}
            <Slider
              value={currentTime}
              max={duration || 100}
              onChange={handleSeek}
              sx={{
                color: '#ff4081',
                height: 4,
                '& .MuiSlider-thumb': {
                  width: 12,
                  height: 12,
                  transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                  '&:hover, &.Mui-focusVisible': {
                    boxShadow: '0px 0px 0px 8px rgba(255, 64, 129, 0.16)',
                  },
                  '&.Mui-active': {
                    width: 16,
                    height: 16,
                  },
                },
                '& .MuiSlider-rail': {
                  opacity: 0.28,
                },
              }}
            />

            <Grid container alignItems="center" spacing={2}>
              {/* Play/Pause Button */}
              <Grid item>
                <IconButton onClick={togglePlay} size="small" sx={{ color: 'white' }}>
                  {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Grid>

              {/* Time Display */}
              <Grid item>
                <Typography variant="caption" color="white">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </Typography>
              </Grid>

              {/* Volume Control */}
              <Grid item xs>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 150 }}>
                  <IconButton onClick={toggleMute} size="small" sx={{ color: 'white' }}>
                    {isMuted ? <VolumeOffIcon /> : <VolumeUpIcon />}
                  </IconButton>
                  <Slider
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    min={0}
                    max={1}
                    step={0.1}
                    sx={{
                      color: '#ff4081',
                      ml: 1,
                      '& .MuiSlider-rail': {
                        opacity: 0.28,
                      },
                    }}
                  />
                </Box>
              </Grid>

              {/* Fullscreen Button */}
              <Grid item>
                <Tooltip title="Fullscreen">
                  <IconButton onClick={toggleFullscreen} size="small" sx={{ color: 'white' }}>
                    <FullscreenIcon />
                  </IconButton>
                </Tooltip>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Play/Pause Overlay */}
        {!isPlaying && !error && !loading && (
          <Box
            onClick={togglePlay}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              borderRadius: '50%',
              width: 60,
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 5,
            }}
          >
            <PlayArrowIcon sx={{ color: 'white', fontSize: 40 }} />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default VideoPlayer; 