import React from 'react';
import { AppBar, Toolbar, Typography, Container, Box, Button } from '@mui/material';
import { Link } from 'react-router-dom';
import VideocamIcon from '@mui/icons-material/Videocam';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

const Header = () => {
  return (
    <AppBar position="static" elevation={0}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <VideocamIcon 
              sx={{ 
                mr: 1, 
                color: '#ff4081',
                fontSize: 32,
                filter: 'drop-shadow(0 0 8px rgba(255, 64, 129, 0.5))'
              }} 
            />
            <Typography
              variant="h5"
              component={Link}
              to="/"
              sx={{
                fontWeight: 700,
                letterSpacing: '.2rem',
                color: 'white',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                textShadow: '0 0 10px rgba(255, 255, 255, 0.3)',
              }}
            >
              <span style={{ 
                color: '#ff4081', 
                background: 'linear-gradient(45deg, #ff4081, #f50057)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                Reel
              </span>
              Edit
            </Typography>
          </Box>
          
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
            <Typography variant="subtitle2" sx={{ color: '#b0b0b0', mr: 3 }}>
              Video Streaming & Segmentation
            </Typography>
            
            <Button 
              component={Link} 
              to="/" 
              startIcon={<CloudUploadIcon />}
              variant="contained"
              color="primary"
              size="small"
              sx={{ 
                borderRadius: 20,
                px: 2,
                background: 'linear-gradient(45deg, #ff4081 30%, #f50057 90%)',
                boxShadow: '0 2px 10px rgba(255, 64, 129, 0.3)',
              }}
            >
              Upload Video
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Header; 