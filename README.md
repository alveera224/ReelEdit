# ReelEdit - A Database-Free Video Streaming & Segmentation Platform

ReelEdit is a full-stack video streaming platform that allows users to upload videos, stream them, convert them into 15-second segments using FFmpeg, and download either the full video or segmented clips - all without using a database.

## Features

- **Video Uploading**: Upload videos with real-time progress tracking
- **Video Processing**: Automatically split videos into 15-second segments using FFmpeg
- **Video Playback**: Stream videos with a custom video player
- **Video Downloading**: Download the full video or individual segments
- **Temporary Storage**: All files are stored temporarily without a database
- **Real-time Updates**: Get real-time updates on video processing via WebSockets

## Technology Stack

- **Frontend**: React.js + Vite, Material UI
- **Backend**: Node.js + Express.js
- **Video Processing**: FFmpeg
- **Storage**: Temporary file storage (in-memory and disk)
- **Real-time Updates**: Socket.io

## Project Structure

```
ReelEdit/
├── client/               # Frontend React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API and socket services
│   │   ├── hooks/        # Custom React hooks
│   │   └── context/      # React context providers
│   └── ...
├── server/               # Backend Node.js application
│   ├── src/
│   │   ├── controllers/  # Request handlers
│   │   ├── routes/       # API routes
│   │   ├── utils/        # Utility functions
│   │   └── index.ts      # Main server file
│   ├── uploads/          # Temporary storage for videos
│   │   ├── temp/         # Original uploaded videos
│   │   └── segments/     # Processed video segments
│   └── ...
└── ...
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- FFmpeg

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/reeledit.git
   cd reeledit
   ```

2. Install dependencies for the server:
   ```
   cd server
   npm install
   ```

3. Install dependencies for the client:
   ```
   cd ../client
   npm install
   ```

### Running the Application

1. Start the server:
   ```
   cd server
   npm run dev
   ```

2. Start the client:
   ```
   cd client
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Upload a video using the drag-and-drop interface
2. View the uploaded video in the built-in player
3. Process the video to create 15-second segments
4. Stream or download individual segments or the full video

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- FFmpeg for video processing
- Material UI for the beautiful interface
- Socket.io for real-time updates 