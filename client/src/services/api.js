import axios from 'axios';

// Simple, direct configuration - no dynamic port detection
const API_URL = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';

console.log('API configured to connect to:', API_URL);

// Create axios instance with increased timeout for large uploads
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5 minute timeout for large uploads
  maxContentLength: Infinity, // Allow large file uploads
  maxBodyLength: Infinity // Allow large request bodies
});

// Add response interceptor for better error messages
api.interceptors.response.use(
  (response) => {
    console.log('API Response:', response.status, response.config.url);
    return response;
  },
  (error) => {
    console.error('API Error:', error.message);
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Error request:', error.request);
    }
    return Promise.reject(error);
  }
);

// Helper functions for video streaming
export const getStreamUrl = (type, fileId, options = {}) => {
  if (!fileId) {
    console.error('getStreamUrl: No fileId provided');
    return '';
  }
  
  console.log(`getStreamUrl: Creating stream URL for ${type} with ID ${fileId}`);
  
  // Ensure the fileId has .mp4 extension for segment files if it doesn't already
  let finalFileId = fileId;
  if (type === 'segment' && !finalFileId.endsWith('.mp4')) {
    finalFileId = `${finalFileId}.mp4`;
  }
  
  // Add a timestamp to prevent caching issues
  const timestamp = new Date().getTime();
  let url = `${BASE_URL}/stream/${type}/${finalFileId}?t=${timestamp}`;
  
  // Add download flag if requested
  if (options.download) {
    url += '&download=true';
  }
  
  console.log('getStreamUrl: Generated URL:', url);
  return url;
};

// Simple server connection test
export const testServerConnection = async () => {
  try {
    console.log('Testing server connection...');
    const response = await fetch(`${BASE_URL}/health`, { 
      method: 'GET',
      headers: { Accept: 'application/json' },
      mode: 'cors'
    });
    
    if (response.ok) {
      console.log('Server connection successful!');
      return true;
    } else {
      console.error('Server returned error:', response.status);
      return false;
    }
  } catch (err) {
    console.error('Server connection failed:', err);
    return false;
  }
};

// Video API endpoints
export const videoApi = {
  // Upload video with enhanced error handling
  uploadVideo: (formData, onUploadProgress) => {
    console.log('Starting video upload...');
    
    // Log the form data contents (excluding the actual file binary)
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`Form contains file: ${key}, name: ${value.name}, size: ${value.size}, type: ${value.type}`);
      } else {
        console.log(`Form data: ${key} = ${value}`);
      }
    }
    
    return api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
        if (onUploadProgress) {
          onUploadProgress(progressEvent);
        }
      },
    }).then(response => {
      console.log('Upload completed successfully:', response.data);
      return response;
    }).catch(error => {
      console.error('Upload failed:', error);
      throw error;
    });
  },

  // Process video
  processVideo: (videoId) => {
    console.log(`Processing video: ${videoId}`);
    return api.post(`/videos/process/${videoId}`);
  },

  // Get video info
  getVideoInfo: (videoId) => {
    return api.get(`/videos/${videoId}`);
  },

  // Get video segments
  getVideoSegments: (videoId) => {
    return api.get(`/videos/segments/${videoId}`);
  },

  // Delete video
  deleteVideo: (videoId) => {
    return api.delete(`/videos/${videoId}`);
  },
  
  // Get video stream URL
  getVideoStreamUrl: (fileName) => {
    return getStreamUrl('video', fileName);
  },
  
  // Get segment stream URL
  getSegmentStreamUrl: (videoId, segmentName, download = false) => {
    return getStreamUrl('segment', `${videoId}_${segmentName}`, { download });
  }
};

export default api; 