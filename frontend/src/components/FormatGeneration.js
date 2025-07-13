import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  FormControl,
  Autocomplete,
  TextField,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Snackbar,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FolderIcon from '@mui/icons-material/Folder';
import DownloadIcon from '@mui/icons-material/Download';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

// Lists of available standards
const standards = [
  { label: 'EDIFACT', value: 'EDIFACT' },
  { label: 'X12', value: 'X12' },
  { label: 'IDOC', value: 'IDOC' },
];

// Complete list of EDIFACT versions
const edifactVersions = [
  { label: 'D921 (1992)', value: 'D921' },
  { label: 'D93A (1993)', value: 'D93A' },
  { label: 'D94A (1994)', value: 'D94A' },
  { label: 'D95A (1995)', value: 'D95A' },
  { label: 'D95B (1995)', value: 'D95B' },
  { label: 'D96A (1996)', value: 'D96A' },
  { label: 'D97A (1997)', value: 'D97A' },
  { label: 'D97B (1997)', value: 'D97B' },
  { label: 'D98A (1998)', value: 'D98A' },
  { label: 'D98B (1998)', value: 'D98B' },
  { label: 'D99A (1999)', value: 'D99A' },
  { label: 'D99B (1999)', value: 'D99B' },
  { label: 'D00A (2000)', value: 'D00A' },
  { label: 'D00B (2000)', value: 'D00B' },
  { label: 'D01A (2001)', value: 'D01A' },
  { label: 'D01B (2001)', value: 'D01B' },
  { label: 'D02A (2002)', value: 'D02A' },
  { label: 'D02B (2002)', value: 'D02B' },
  { label: 'D03A (2003)', value: 'D03A' },
  { label: 'D03B (2003)', value: 'D03B' },
  { label: 'D04A (2004)', value: 'D04A' },
  { label: 'D04B (2004)', value: 'D04B' },
  { label: 'D05A (2005)', value: 'D05A' },
  { label: 'D05B (2005)', value: 'D05B' },
  { label: 'D06A (2006)', value: 'D06A' },
  { label: 'D06B (2006)', value: 'D06B' },
  { label: 'D07A (2007)', value: 'D07A' },
  { label: 'D07B (2007)', value: 'D07B' },
  { label: 'D08A (2008)', value: 'D08A' },
  { label: 'D08B (2008)', value: 'D08B' },
  { label: 'D09A (2009)', value: 'D09A' },
  { label: 'D09B (2009)', value: 'D09B' },
  { label: 'D10A (2010)', value: 'D10A' },
  { label: 'D10B (2010)', value: 'D10B' },
  { label: 'D11A (2011)', value: 'D11A' },
  { label: 'D11B (2011)', value: 'D11B' },
  { label: 'D12A (2012)', value: 'D12A' },
  { label: 'D12B (2012)', value: 'D12B' },
  { label: 'D13A (2013)', value: 'D13A' },
  { label: 'D13B (2013)', value: 'D13B' },
  { label: 'D14A (2014)', value: 'D14A' },
  { label: 'D14B (2014)', value: 'D14B' },
  { label: 'D15A (2015)', value: 'D15A' },
  { label: 'D15B (2015)', value: 'D15B' },
  { label: 'D16A (2016)', value: 'D16A' },
  { label: 'D16B (2016)', value: 'D16B' },
  { label: 'D17A (2017)', value: 'D17A' },
  { label: 'D17B (2017)', value: 'D17B' },
  { label: 'D18A (2018)', value: 'D18A' },
  { label: 'ISO9735', value: 'ISO9735' },
];

// List of important EDIFACT messages
const edifactMessages = [
  { label: 'ORDERS - Purchase Order', value: 'ORDERS' },
  { label: 'DESADV - Dispatch Advice', value: 'DESADV' },
  { label: 'ORDRSP - Purchase Order Response', value: 'ORDRSP' },
  { label: 'INVOIC - Invoice', value: 'INVOIC' },
  { label: 'DELFOR - Delivery Forecast', value: 'DELFOR' },
];

// Function to format XML in a readable way
function formatXML(xml) {
  const PADDING = 2; // Desired indentation size
  const reg = /(>)(<)(\/*)/g;
  let formatted = '';
  let pad = 0;

  xml = xml.replace(reg, '$1\r\n$2$3');
  xml.split('\r\n').forEach((line) => {
    let indent = 0;
    if (line.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (line.match(/^<\/\w/)) {
      if (pad !== 0) pad -= PADDING;
    } else if (line.match(/^<\w[^>]*[^/]>.*$/)) {
      indent = PADDING;
    }

    formatted += ' '.repeat(pad) + line + '\n';
    pad += indent;
  });

  return formatted.trim();
}

function FormatGeneration({ scrapingResult }) {
  const [source, setSource] = useState('scraping'); // 'scraping' or 'file'
  const [format, setFormat] = useState('xml'); // 'xml' or 'json'
  const [standard, setStandard] = useState(scrapingResult?.Standard || '');
  const [revision, setRevision] = useState(scrapingResult?.Revision || '');
  const [messageType, setMessageType] = useState(scrapingResult?.Document || '');
  const [jsonFile, setJsonFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [ixpathFolder, setIxpathFolder] = useState('');
  const folderInputRef = useRef();

  // Snackbar State
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success'); // 'success', 'error', 'info', 'warning'

  // Function to display Snackbar
  const showSnackbar = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setOpenSnackbar(true);
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target.result);
          setJsonFile(jsonData);
          // Extract information from JSON
          if (jsonData.Standard) setStandard(jsonData.Standard);
          if (jsonData.Revision) setRevision(jsonData.Revision);
          if (jsonData.Document) setMessageType(jsonData.Document);
          showSnackbar('JSON file loaded successfully', 'success');
        } catch (err) {
          setError('File must be valid JSON format');
          showSnackbar('File must be valid JSON format', 'error');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleFolderSelect = async () => {
    if (folderInputRef.current) {
      folderInputRef.current.value = null; // reset
      folderInputRef.current.click();
    }
  };

    const handleFolderChange = (event) => {
    const files = event.target.files;
    if (files.length > 0) {
      // On prend le chemin du premier fichier, qui contient le dossier parent
      const fullPath = files[0].webkitRelativePath || files[0].name;
      const folderPath = fullPath.split('/')[0];
      setIxpathFolder(folderPath);
      showSnackbar(`Working folder: ${folderPath}`, 'info');
    }
  };

  const handleSendToSfedi = async () => {
    if (!result || !ixpathFolder) return;

    try {
      const response = await fetch('http://localhost:3001/api/write-to-ixpath', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: result.content,
          standard,
          revision,
          messageType,
          ixpathFolder, // Utilise le chemin tel que sélectionné
          format,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error writing file');
      }

      const data = await response.json();
      showSnackbar(`File successfully written to: ${data.path}`, 'success');
    } catch (err) {
      setError(err.message);
      showSnackbar(err.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (source === 'scraping') {
      if (!standard || !revision || !messageType) {
        setError('All fields are required for scraping');
        showSnackbar('All fields are required for scraping', 'error');
        return;
      }
    } else if (source === 'file') {
      if (!standard || !revision || !messageType || !jsonFile) {
        setError('All fields are required for file-based generation');
        showSnackbar('All fields are required for file-based generation', 'error');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('http://localhost:3001/api/generate-format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source,
          format,
          standard,
          revision,
          messageType,
          jsonData: source === 'scraping' ? scrapingResult : jsonFile,
          ixpathFolder,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error generating format');
      }

      const data = await response.json();
      setResult(data);
      showSnackbar('Format generated successfully', 'success');
    } catch (err) {
      setError(err.message);
      showSnackbar(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([result.content], { type: format === 'xml' ? 'text/xml' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${standard}_${revision}_${messageType}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Format Generation
      </Typography>

      <StyledPaper>
        <form onSubmit={handleSubmit}>
          {/* Source Selection */}
          <FormControl fullWidth margin="normal">
            <Autocomplete
              options={[
                { label: 'From Scraping', value: 'scraping' },
                { label: 'From JSON File', value: 'file' },
              ]}
              getOptionLabel={(option) => option.label}
              value={
                source === 'scraping'
                  ? { label: 'From Scraping', value: 'scraping' }
                  : { label: 'From JSON File', value: 'file' }
              }
              onChange={(event, newValue) => setSource(newValue ? newValue.value : 'scraping')}
              disableClearable
              renderInput={(params) => (
                <TextField {...params} label="Source" required margin="normal" />
              )}
            />
          </FormControl>

          {/* Load JSON file if source is 'file' */}
          {source === 'file' && (
            <Box sx={{ mt: 2 }}>
              <Button
                component="label"
                variant="contained"
                startIcon={<CloudUploadIcon />}
                color="primary"
                sx={{ mb: 2, display: 'inline-block', minWidth: '150px' }}
              >
                Load JSON File
                <VisuallyHiddenInput
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                />
              </Button>
              {fileName && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  File loaded: {fileName}
                </Typography>
              )}
            </Box>
          )}

          {/* Define iXpath folder */}
          <Box sx={{ mb: 4, mt: 2 }}>
            <Button
              variant="contained"
              onClick={handleFolderSelect}
              startIcon={<FolderIcon />}
              color="primary"
              sx={{ mb: 2, display: 'inline-block', minWidth: '150px' }}
            >
              Define iXpath folder
            </Button>
            <input
              type="file"
              webkitdirectory="true"
              directory=""
              ref={folderInputRef}
              style={{ display: 'none' }}
              onChange={handleFolderChange}
            />
            {ixpathFolder && (
              <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
                Working folder: {ixpathFolder}
              </Typography>
            )}
          </Box>

          {/* Standard Selection */}
          <FormControl fullWidth margin="normal">
            <Autocomplete
              options={standards}
              getOptionLabel={(option) => option.label || option}
              value={standards.find((s) => s.value === standard) || null}
              onChange={(event, newValue) => {
                setStandard(newValue ? newValue.value : '');
                setRevision('');
                setMessageType('');
              }}
              freeSolo
              autoSelect
              isOptionEqualToValue={(option, value) => option.value === value?.value}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Standard"
                  required
                  fullWidth
                  margin="normal"
                />
              )}
            />
          </FormControl>

          {/* Revision Selection */}
          <FormControl fullWidth margin="normal">
            <Autocomplete
              options={standard === 'EDIFACT' ? edifactVersions : []}
              getOptionLabel={(option) => option.label || option}
              value={edifactVersions.find((r) => r.value === revision) || null}
              onChange={(event, newValue) => {
                setRevision(newValue ? newValue.value : '');
              }}
              freeSolo
              autoSelect
              disabled={standard !== 'EDIFACT'}
              isOptionEqualToValue={(option, value) => option.value === value?.value}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Revision"
                  required
                  fullWidth
                  margin="normal"
                />
              )}
            />
          </FormControl>

          {/* Message Type Selection */}
          <FormControl fullWidth margin="normal">
            <Autocomplete
              options={standard === 'EDIFACT' ? edifactMessages : []}
              getOptionLabel={(option) => option.label || option}
              value={edifactMessages.find((m) => m.value === messageType) || null}
              onChange={(event, newValue) => {
                setMessageType(newValue ? newValue.value : '');
              }}
              freeSolo
              autoSelect
              disabled={standard !== 'EDIFACT'}
              isOptionEqualToValue={(option, value) => option.value === value?.value}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Message Type"
                  required
                  fullWidth
                  margin="normal"
                />
              )}
            />
          </FormControl>

          {/* Format Selection */}
          <FormControl fullWidth margin="normal">
            <Autocomplete
              options={[
                { label: 'XML', value: 'xml' },
                { label: 'JSON', value: 'json' },
              ]}
              getOptionLabel={(option) => option.label}
              value={
                format === 'xml'
                  ? { label: 'XML', value: 'xml' }
                  : { label: 'JSON', value: 'json' }
              }
              onChange={(event, newValue) => setFormat(newValue ? newValue.value : 'xml')}
              disableClearable
              renderInput={(params) => (
                <TextField {...params} label="Output Format" required margin="normal" />
              )}
            />
          </FormControl>

          {/* Generate Format Button */}
          <Box sx={{ mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || (source === 'file' && !jsonFile)}
              sx={{ minWidth: '150px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'GENERATE FORMAT'}
            </Button>
          </Box>
        </form>
      </StyledPaper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Result and Download button */}
      {result && (
        <StyledPaper>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Generated Format
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={handleDownload}
                sx={{ minWidth: '150px' }}
              >
                Download
              </Button>
            </Box>
            <Box
              sx={{
                maxHeight: '400px',
                overflow: 'auto',
                bgcolor: 'grey.100',
                p: 2,
                borderRadius: 1,
                fontFamily: 'monospace',
              }}
            >
              <pre>
                {format === 'xml' ? formatXML(result.content) : JSON.stringify(result, null, 2)}
              </pre>
            </Box>

            {/* Button to send to SFEDI */}
            <Box>
              <Button
                variant="contained"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={handleSendToSfedi}
                disabled={!ixpathFolder || !result}
                sx={{ minWidth: '150px' }}
              >
                Send to SFEDI
              </Button>
            </Box>
          </Stack>
        </StyledPaper>
      )}

      {/* Snackbar for Toast messages */}
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setOpenSnackbar(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default FormatGeneration;