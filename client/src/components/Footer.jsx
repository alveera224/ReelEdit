import React from 'react';
import { Box, Container, Typography, Link, Grid } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 4,
        px: 2,
        mt: 'auto',
        background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 100%)',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={3} alignItems="center" justifyContent="space-between">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <VideocamIcon 
                sx={{ 
                  mr: 1, 
                  color: '#ff4081',
                  fontSize: 24,
                  filter: 'drop-shadow(0 0 8px rgba(255, 64, 129, 0.5))'
                }} 
              />
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
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
            
            <Typography variant="body2" color="text.secondary">
              © {new Date().getFullYear()} - A Database-Free Video Streaming & Segmentation Platform
            </Typography>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Supports video files up to 500MB in size
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Built with React, Node.js, Express, and FFmpeg
            </Typography>
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              All videos are stored temporarily and will be automatically deleted after 24 hours
            </Typography>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Footer; 