import React, { useState } from 'react';
import {
  Box,
  CssBaseline,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Container,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Autocomplete,
  Divider,
  Input,
  Grid,
  Snackbar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Code as CodeIcon,
  Transform as TransformIcon,
  DataObject as DataObjectIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import MuiAlert from '@mui/material/Alert';
import DownloadIcon from '@mui/icons-material/Download';
import FormatIcon from '@mui/icons-material/Code';
import UploadIcon from '@mui/icons-material/Upload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import BuildIcon from '@mui/icons-material/Build';
import axios from 'axios';
import EDISpecScraper from './components/EDISpecScraper';
import FormatGeneration from './components/FormatGeneration';
import DataNormalizerGeneration from './components/DataNormalizerGeneration';

// Styles
const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
  }),
);

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const Toast = React.forwardRef(function Toast(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function App() {
  const [open, setOpen] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);
  const [scrapingResult, setScrapingResult] = useState(null);

  const menuItems = [
    { 
      text: 'EDI Specification Scraper', 
      icon: <CodeIcon />, 
      component: <EDISpecScraper onScrapingComplete={setScrapingResult} /> 
    },
    { 
      text: 'Format Generation', 
      icon: <TransformIcon />, 
      component: <FormatGeneration scrapingResult={scrapingResult} /> 
    },
    { 
      text: 'Data Normalizer Generation', 
      icon: <DataObjectIcon />, 
      component: <DataNormalizerGeneration /> 
    },
  ];

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* AppBar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="toggle drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            EDI Tools
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader />
        <List>
          {menuItems.map((item, index) => (
            <ListItem
              button
              key={item.text}
              onClick={() => setSelectedTab(index)}
              selected={selectedTab === index}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      {/* Main content */}
      <Main open={open}>
        <DrawerHeader />
        <Container maxWidth="xl">
          {menuItems[selectedTab].component}
        </Container>
      </Main>
    </Box>
  );
}

export default App;
