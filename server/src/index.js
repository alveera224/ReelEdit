const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const { Server } = require('socket.io');

// FFmpeg setup
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

// Configure ffmpeg paths
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// Fixed port for reliability
const PORT = 5000;

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure CORS to allow requests from the client
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Setup directories
const uploadsDir = path.join(__dirname, '../uploads');
const tempDir = path.join(uploadsDir, 'temp');
const segmentsDir = path.join(uploadsDir, 'segments');

// Ensure directories exist
[uploadsDir, tempDir, segmentsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

// Store video info in memory for simplicity
const videos = new Map();

// Function to get video duration using FFmpeg
const getVideoDuration = (videoPath) => {
  return new Promise((resolve, reject) => {
    console.log(`Getting duration for video: ${videoPath}`);
    
    // Check if file exists
    if (!fs.existsSync(videoPath)) {
      console.error(`Video file does not exist: ${videoPath}`);
      reject(new Error(`Video file does not exist: ${videoPath}`));
      return;
    }
    
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        console.error('Error getting video duration:', err);
        reject(err);
        return;
      }
      
      if (!metadata || !metadata.format || !metadata.format.duration) {
        console.error('Invalid metadata or missing duration:', metadata);
        reject(new Error('Could not determine video duration'));
        return;
      }
      
      const duration = metadata.format.duration;
      console.log(`Video duration: ${duration} seconds`);
      resolve(duration);
    });
  });
};

// Function to segment video into 15-second clips
const segmentVideo = (videoPath, videoId) => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Starting video segmentation for: ${videoPath}`);
      
      // Check if file exists
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file does not exist: ${videoPath}`);
      }
      
      // Create directory for segments
      const videoSegmentsDir = path.join(segmentsDir, videoId);
      if (!fs.existsSync(videoSegmentsDir)) {
        fs.mkdirSync(videoSegmentsDir, { recursive: true });
        console.log(`Created segments directory: ${videoSegmentsDir}`);
      }

      // Get video duration
      const duration = await getVideoDuration(videoPath);
      console.log(`Video duration confirmed: ${duration} seconds`);

      // Calculate number of segments
      const segmentDuration = 15; // 15 seconds per segment
      const numSegments = Math.ceil(duration / segmentDuration);
      console.log(`Creating ${numSegments} segments of ${segmentDuration} seconds each`);

      const segments = [];
      let completedSegments = 0;
      let errorCount = 0;
      const MAX_ERRORS = 3;

      // Create segments
      for (let i = 0; i < numSegments; i++) {
        const startTime = i * segmentDuration;
        const segmentId = `${videoId}_segment_${i + 1}`;
        const segmentPath = path.join(videoSegmentsDir, `${segmentId}.mp4`);
        
        console.log(`Starting segment ${i + 1}/${numSegments} - From ${startTime}s for ${segmentDuration}s`);
        
        // Special handling for first segment to avoid seeking issues
        const ffmpegCommand = ffmpeg(videoPath);
        
        // Apply different parameters for first segment vs. others
        if (i === 0) {
          // For first segment, don't use seekInput as it can cause problems
          ffmpegCommand
            .setStartTime(0)
            .duration(segmentDuration);
        } else {
          // For other segments, use seekInput
          ffmpegCommand
            .seekInput(startTime)
            .duration(segmentDuration);
        }
        
        ffmpegCommand
          .output(segmentPath)
          .outputOptions([
            '-c:v libx264',     // Video codec
            '-c:a aac',         // Audio codec
            '-b:a 128k',        // Audio bitrate
            '-preset ultrafast', // Fastest encoding
            '-tune fastdecode',  // Optimize for fast decoding
            '-movflags +faststart', // Enable streaming
            '-threads 0'        // Use all available threads
          ])
          .noAudio(false)
          .videoCodec('libx264')
          .on('start', (commandLine) => {
            console.log(`FFmpeg command for segment ${i + 1}: ${commandLine}`);
          })
          .on('progress', (progress) => {
            console.log(`Processing segment ${i + 1}: ${Math.round(progress.percent || 0)}% done`);
            
            // Emit progress via Socket.IO
            io.emit('segmentProgress', {
              videoId,
              currentSegment: i + 1,
              totalSegments: numSegments,
              segmentProgress: Math.round(progress.percent || 0),
              percent: Math.round(((i / numSegments) * 100) + ((progress.percent || 0) / numSegments))
            });
          })
          .on('end', () => {
            console.log(`Created segment ${i + 1}/${numSegments} at ${segmentPath}`);
            
            // Verify the segment file exists
            if (fs.existsSync(segmentPath)) {
              // Add segment info
              segments.push({
                id: segmentId,
                index: i + 1,
                startTime,
                duration: segmentDuration,
                path: segmentPath,
                url: `/stream/segment/${segmentId}`
              });

              completedSegments++;
              
              // Emit progress via Socket.IO
              io.emit('segmentProgress', {
                videoId,
                currentSegment: completedSegments,
                totalSegments: numSegments,
                percent: Math.round((completedSegments / numSegments) * 100)
              });

              // If all segments are created, resolve
              if (completedSegments === numSegments) {
                console.log(`All ${numSegments} segments created successfully`);
                
                // Update video info with segments
                const videoInfo = videos.get(videoId);
                if (videoInfo) {
                  videoInfo.segments = segments;
                  videoInfo.isProcessed = true;
                  videos.set(videoId, videoInfo);
                }
                
                resolve(segments);
              }
            } else {
              console.error(`Segment file not found after processing: ${segmentPath}`);
              errorCount++;
              
              if (errorCount >= MAX_ERRORS) {
                reject(new Error(`Too many segment creation failures (${errorCount})`));
              } else if (completedSegments === numSegments - errorCount) {
                // If we've completed all possible segments, resolve with what we have
                console.log(`Completed ${completedSegments} segments with ${errorCount} errors`);
                
                // Update video info with segments
                const videoInfo = videos.get(videoId);
                if (videoInfo) {
                  videoInfo.segments = segments;
                  videoInfo.isProcessed = true;
                  videos.set(videoId, videoInfo);
                }
                
                resolve(segments);
              }
            }
          })
          .on('error', (err) => {
            console.error(`Error creating segment ${i + 1}:`, err);
            errorCount++;
            
            if (errorCount >= MAX_ERRORS) {
              reject(new Error(`Too many segment creation failures (${errorCount}): ${err.message}`));
            } else if (completedSegments === numSegments - errorCount) {
              // If we've completed all possible segments, resolve with what we have
              console.log(`Completed ${completedSegments} segments with ${errorCount} errors`);
              
              // Update video info with segments
              const videoInfo = videos.get(videoId);
              if (videoInfo) {
                videoInfo.segments = segments;
                videoInfo.isProcessed = true;
                videos.set(videoId, videoInfo);
              }
              
              resolve(segments);
            }
          })
          .run();
      }
    } catch (error) {
      console.error('Error segmenting video:', error);
      reject(error);
    }
  });
};

// API Routes
app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  try {
    console.log('Server: Upload request received');
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log(`Server: File received - name: ${req.file.originalname}, size: ${req.file.size}, type: ${req.file.mimetype}`);
    
    // Generate a unique ID for the video
    const videoId = uuidv4();
    console.log(`Server: Generated videoId: ${videoId}`);
    
    // Get the uploaded file path
    const uploadedFilePath = req.file.path;
    
    // Create the final path for the video
    const finalPath = path.join(tempDir, `${videoId}${path.extname(req.file.originalname)}`);
    
    console.log(`Server: Moving file from ${uploadedFilePath} to ${finalPath}`);
    
    // Copy the file to the final location
    try {
      const fileBuffer = fs.readFileSync(uploadedFilePath);
      fs.writeFileSync(finalPath, fileBuffer);
      console.log(`Server: File copied successfully, size: ${fileBuffer.length} bytes`);
    } catch (copyError) {
      console.error('Server: Error copying file:', copyError);
      return res.status(500).json({ error: `Failed to copy file: ${copyError.message || 'Unknown error'}` });
    }
    
    // Remove the original uploaded file if different path
    if (uploadedFilePath !== finalPath && fs.existsSync(uploadedFilePath)) {
      try {
        fs.unlinkSync(uploadedFilePath);
        console.log('Server: Removed temporary upload file');
      } catch (unlinkError) {
        console.error('Server: Error removing temp file:', unlinkError);
        // Continue even if we can't remove the temp file
      }
    }
    
    // Verify the final file exists and has content
    if (!fs.existsSync(finalPath)) {
      return res.status(500).json({ error: 'Failed to save uploaded file' });
    }
    
    const fileSize = fs.statSync(finalPath).size;
    console.log(`Server: Final file size: ${fileSize} bytes`);
    
    if (fileSize === 0) {
      fs.unlinkSync(finalPath);
      return res.status(500).json({ error: 'Uploaded file is empty' });
    }
    
    // Store video info
    const videoInfo = {
      id: videoId,
      originalName: req.file.originalname,
      fileName: path.basename(finalPath),
      path: finalPath,
      size: fileSize,
      createdAt: new Date(),
      url: `/stream/video/${videoId}${path.extname(req.file.originalname)}`,
      isProcessed: false,
      segments: []
    };
    
    videos.set(videoId, videoInfo);
    console.log(`Server: Video info stored for id: ${videoId}`);
    
    // Send success response
    console.log('Server: Sending success response');
    res.status(200).json({ 
      videoId,
      message: 'Video uploaded successfully'
    });
  } catch (error) {
    console.error('Server: Error in upload endpoint:', error);
    res.status(500).json({ error: `Failed to upload video: ${error.message || 'Unknown error'}` });
  }
});

// Process video into segments
app.post('/api/videos/:id/process', async (req, res) => {
  try {
    const videoId = req.params.id;
    
    if (!videos.has(videoId)) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    const videoInfo = videos.get(videoId);
    
    // Check if video is already processed
    if (videoInfo.isProcessed) {
      return res.status(200).json({ 
        message: 'Video already processed',
        segments: videoInfo.segments
      });
    }
    
    // Update processing status
    videoInfo.isProcessing = true;
    videos.set(videoId, videoInfo);
    
    // Send initial response
    res.status(200).json({ 
      message: 'Video processing started',
      videoId
    });
    
    // Process video in background
    try {
      const segments = await segmentVideo(videoInfo.path, videoId);
      
      // Update video info
      videoInfo.isProcessed = true;
      videoInfo.isProcessing = false;
      videoInfo.segments = segments;
      videos.set(videoId, videoInfo);
      
      // Emit completion event
      io.emit('processingComplete', {
        videoId,
        segments
      });
      
      console.log(`Processing complete for video ${videoId}, created ${segments.length} segments`);
    } catch (error) {
      console.error(`Error processing video ${videoId}:`, error);
      
      // Update video info
      videoInfo.isProcessing = false;
      videoInfo.processingError = error.message;
      videos.set(videoId, videoInfo);
      
      // Emit error event
      io.emit('processingError', {
        videoId,
        error: error.message
      });
    }
  } catch (error) {
    console.error('Error in process endpoint:', error);
    res.status(500).json({ error: `Failed to process video: ${error.message || 'Unknown error'}` });
  }
});

// Get video info
app.get('/api/videos/:id', (req, res) => {
  const videoId = req.params.id;
  
  if (!videos.has(videoId)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  const videoInfo = videos.get(videoId);
  res.status(200).json(videoInfo);
});

// Get video segments
app.get('/api/videos/:id/segments', (req, res) => {
  const videoId = req.params.id;
  
  if (!videos.has(videoId)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  
  const videoInfo = videos.get(videoId);
  
  if (!videoInfo.isProcessed) {
    return res.status(400).json({ error: 'Video has not been processed yet' });
  }
  
  res.status(200).json(videoInfo.segments);
});

// Stream video
app.get('/stream/video/:id', (req, res) => {
  const videoId = req.params.id;
  let videoPath = '';
  
  // Find the video by ID
  for (const [id, info] of videos.entries()) {
    if (id === videoId || info.fileName.startsWith(videoId)) {
      videoPath = info.path;
      break;
    }
  }
  
  if (!videoPath || !fs.existsSync(videoPath)) {
    return res.status(404).send('Video not found');
  }
  
  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  // Handle range requests for video streaming
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    
    console.log(`Streaming range ${start}-${end}/${fileSize} for ${videoPath}`);
    
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    });
    
    file.pipe(res);
  } else {
    // Handle full file download
    console.log(`Streaming full file ${videoPath}`);
    
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
    
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Stream segment
app.get('/stream/segment/:id', (req, res) => {
  const segmentId = req.params.id;
  let segmentPath = '';
  
  // Find the segment
  for (const [videoId, info] of videos.entries()) {
    if (info.segments) {
      const segment = info.segments.find(s => s.id === segmentId);
      if (segment) {
        segmentPath = segment.path;
        break;
      }
    }
  }
  
  if (!segmentPath || !fs.existsSync(segmentPath)) {
    return res.status(404).send('Segment not found');
  }
  
  const stat = fs.statSync(segmentPath);
  const fileSize = stat.size;
  const range = req.headers.range;
  
  // Handle range requests for video streaming
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(segmentPath, { start, end });
    
    console.log(`Streaming segment range ${start}-${end}/${fileSize} for ${segmentPath}`);
    
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    });
    
    file.pipe(res);
  } else {
    // Handle full file download
    console.log(`Streaming full segment ${segmentPath}`);
    
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
    
    fs.createReadStream(segmentPath).pipe(res);
  }
});

// Download segment
app.get('/download/segment/:id', (req, res) => {
  const segmentId = req.params.id;
  let segmentPath = '';
  let segmentName = '';
  
  // Find the segment
  for (const [videoId, info] of videos.entries()) {
    if (info.segments) {
      const segment = info.segments.find(s => s.id === segmentId);
      if (segment) {
        segmentPath = segment.path;
        segmentName = `segment_${segment.index}.mp4`;
        break;
      }
    }
  }
  
  if (!segmentPath || !fs.existsSync(segmentPath)) {
    return res.status(404).send('Segment not found');
  }
  
  // Set headers for file download
  res.setHeader('Content-Disposition', `attachment; filename="${segmentName}"`);
  res.setHeader('Content-Type', 'video/mp4');
  
  // Stream the file to the client
  fs.createReadStream(segmentPath).pipe(res);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} in your browser`);
  console.log(`API base URL: http://localhost:${PORT}/api`);
  console.log(`Streaming URL: http://localhost:${PORT}/stream/video/:id`);
}); 