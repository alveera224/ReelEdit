# ReelEdit

A modern web application for uploading, processing, and sharing video content, featuring automatic video segmentation for social media.

## Features

- **Video Upload**: Upload video files up to 500MB
- **Video Library**: Browse and search through your uploaded videos
- **Automatic Video Segmentation**: Videos are automatically divided into 15-second segments, perfect for social media sharing
- **Video Preview**: Watch your videos directly in the browser
- **Segment Management**: Preview and download individual video segments
- **Dark/Light Mode**: Toggle between dark and light themes

## Technical Architecture

### Backend (Node.js/Express)
- RESTful API for video management
- File upload handling with Multer
- Video processing with FFmpeg
- JSON-based data storage

### Frontend (React)
- Modern, responsive UI built with React
- Theme switching with context API
- Video playback capabilities
- Segment preview and download

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- FFmpeg (installed via npm package)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd vsp
   npm install
   cd frontproj
   npm install
   ```

3. Start the backend server:
   ```
   cd vsp
   node index.js
   ```

4. Start the frontend development server:
   ```
   cd vsp/frontproj
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`

## How to Use

1. **Upload a Video**: Click the "Upload Video" button and select a video file
2. **View Your Videos**: All uploaded videos appear in the video library
3. **Search Videos**: Use the search bar to find specific videos
4. **View Video Details**: Click on a video to see its details
5. **Video Segments**: In the video details page, you'll find automatically generated segments
6. **Preview Segments**: Click "Preview" to watch a segment in your browser
7. **Download Segments**: Click the download icon to save a segment to your device

## Known Limitations

- Videos are segmented into fixed 15-second clips (up to 5 segments per video)
- Supported video formats depend on your browser's capabilities
- The application uses local storage and is not intended for production use without additional modifications

## License

This project is licensed under the MIT License.
