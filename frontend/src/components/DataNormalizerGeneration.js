import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Autocomplete,
  Input,
  Snackbar,
  Stack
} from '@mui/material';
import MuiAlert from '@mui/material/Alert';
import { styled } from '@mui/material/styles';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import BuildIcon from '@mui/icons-material/Build';

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

const Toast = React.forwardRef(function Toast(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// EDIFACT versions list
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
  { label: 'ISO9735', value: 'ISO9735' }
];

function DataNormalizerGeneration() {
  const [inputFormat, setInputFormat] = useState('');
  const [outputFormat, setOutputFormat] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatingType, setGeneratingType] = useState(null); // 'input' or 'output'
  const [error, setError] = useState(null);

  // Toast management
  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // States for DN data
  const [dnData, setDnData] = useState({
    input: {
      type: 'edi',
      file: null,
      fileName: null,
      fileContent: null,
      standard: 'EDIFACT',
      revision: 'D97A',
      message: ''
    },
    output: {
      type: 'edi',
      file: null,
      fileName: null,
      fileContent: null,
      standard: 'EDIFACT',
      revision: 'D97A',
      message: ''
    }
  });

  // State for generated DNs
  const [generatedDn, setGeneratedDn] = useState({
    input: {
      content: null,
      fileName: null
    },
    output: {
      content: null,
      fileName: null
    }
  });

  // Toast management functions
  const handleCloseToast = () => {
    setToast({ ...toast, open: false });
  };

  const showToast = (message, severity = 'success') => {
    setToast({
      open: true,
      message,
      severity
    });
  };

  // Function to handle type change (Input or Output)
  const handleDnTypeChange = (section, value) => {
    setDnData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        type: value,
        file: null,
        fileName: null,
        fileContent: null
      }
    }));
  };

  // Function to handle form field changes
  const handleDnDataChange = (section, field, value) => {
    setDnData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Function to read file content
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve(event.target.result);
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  // Function to handle file upload
  const handleDnFileUpload = async (section, e) => {
    const file = e.target.files[0];
    if (!file) return;

    const type = dnData[section].type;
    const validTypes = {
      edi: ['application/json', ''],
      idoc: ['text/plain', ''],
      csv: ['text/csv', 'application/vnd.ms-excel', '']
    };

    try {
      const content = await readFileContent(file);
      let fileData = { fileName: file.name, fileContent: content };

      // Process content according to type
      if (type === 'edi') {
        try {
          const jsonContent = JSON.parse(content);
          fileData = {
            ...fileData,
            standard: jsonContent.Standard || 'EDIFACT',
            revision: jsonContent.Revision || 'D97A',
            message: jsonContent.Document || ''
          };
        } catch (err) {
          // If JSON is not valid, keep default values
          console.error('Error parsing JSON:', err);
        }
      } else if (type === 'idoc') {
        const match = content.match(/BEGIN_IDOC\s+(\w+)/);
        if (match) {
          fileData.message = match[1];
        }
      }

      setDnData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          ...fileData
        }
      }));

      showToast(`File ${file.name} uploaded successfully`, 'success');
    } catch (err) {
      showToast('Error reading file', 'error');
    }
  };

  // Function to generate DN
  const handleGenerateDnForSection = async (section) => {
    setLoading(true);
    setGeneratingType(section);
    
    try {
      let xmlContent = '';
      const data = dnData[section];
      
      if (data.type === 'edi') {
        if (data.standard === 'EDIFACT') {
          // Clean revision to remove date if present
          const cleanRevision = data.revision.split(' ')[0];
          xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE doc [
    <!ENTITY unb SYSTEM "./../../SFEDI/format/edifact/unb.xml">
    <!ENTITY ${data.message} SYSTEM "./../../SFEDI/format/edifact/${cleanRevision}/${data.message}.xml">
    <!ENTITY unz SYSTEM "./../../SFEDI/format/edifact/unz.xml">
]>
<ixDOC format="variable" segChar="'" elChar="+" compChar=":" emptyEnd="true" lastEnd="false">
    <INTERCHANGE format="none" max="n">
        &unb;
        &${data.message};
        &unz;
    </INTERCHANGE>
</ixDOC>`;
        } else if (data.standard === 'X12') {
          xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE doc [
    <!ENTITY isa SYSTEM "./../../SFEDI/format/x12/isa.xml">
    <!ENTITY gs SYSTEM "./../../SFEDI/format/x12/gs.xml">
    <!ENTITY x${data.message} SYSTEM "./../../SFEDI/format/x12/${data.revision}/${data.message}.xml">
    <!ENTITY ge SYSTEM "./../../SFEDI/format/x12/ge.xml">
    <!ENTITY iea SYSTEM "./../../SFEDI/format/x12/iea.xml">
]>
<ixDOC format="variable" segChar="\\n" elChar="|" compChar=">" emptyEnd="true" lastEnd="false">
    <INTERCHANGE format="none" max="n">
        &isa;
        &gs;
        &x${data.message};
        &ge;
        &iea;
    </INTERCHANGE>
</ixDOC>`;
        }
      } else if (data.type === 'idoc') {
        const message2 = data.message.slice(0, -2);
        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE doc [
    <!ENTITY ${message2} SYSTEM "./idoc/${data.message}.xml">
]>
<ixDOC format="variable" end="\\r\\n or \\n">
    &${message2};
</ixDOC>`;
      } else if (data.type === 'csv') {
        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ixDOC format="fixed" end=";;">
    <ROW format="element" optional="0" max="n">
        <COL type="string" optional="1" max="1" name="column1"/>
        <COL type="string" optional="1" max="1" name="column2"/>
        <COL type="string" optional="1" max="1" name="column3"/>
        <!-- Ajouter d'autres colonnes selon la structure du CSV -->
    </ROW>
</ixDOC>`;
      }

      if (xmlContent) {
        // Generate filename
        let fileName;
        if (data.type === 'edi') {
          fileName = `DN__${data.standard}-${data.revision}-${data.message}.xml`;
        } else if (data.type === 'idoc') {
          const message2 = data.message.slice(0, -2);
          fileName = `DN__IDoc-Fixed-${data.message}-${message2}.xml`;
        } else {
          fileName = `DN__CSV-Fixed.xml`;
        }

        // Update state with generated content
        setGeneratedDn(prev => ({
          ...prev,
          [section]: {
            content: xmlContent,
            fileName
          }
        }));

        showToast(`${section} DN generated successfully`, 'success');
      }
    } catch (err) {
      setError(`Error generating DN ${section}: ${err.message}`);
      showToast(`Error generating DN ${section}`, 'error');
    } finally {
      setLoading(false);
      setGeneratingType(null);
    }
  };

  // Function to download DN
  const handleDnDownload = (section) => {
    const { content, fileName } = generatedDn[section];
    if (!content || !fileName) return;

    const blob = new Blob([content], { type: 'text/xml' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    showToast(`${section} DN downloaded successfully`, 'success');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Normalizer Generation
      </Typography>

      <StyledPaper>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* Section Input */}
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              Input
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                value={dnData.input.type}
                onChange={(e) => handleDnTypeChange('input', e.target.value)}
                label="Type"
              >
                <MenuItem value="edi">EDI json file</MenuItem>
                <MenuItem value="idoc">IDOC txt file</MenuItem>
                <MenuItem value="csv">CSV txt file</MenuItem>
              </Select>
            </FormControl>

            {dnData.input.type === 'edi' && (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Standard</InputLabel>
                  <Select
                    value={dnData.input.standard}
                    onChange={(e) => handleDnDataChange('input', 'standard', e.target.value)}
                    label="Standard"
                  >
                    <MenuItem value="EDIFACT">EDIFACT</MenuItem>
                    <MenuItem value="X12">X12</MenuItem>
                  </Select>
                </FormControl>

                {dnData.input.standard === 'EDIFACT' && (
                  <Autocomplete
                    freeSolo
                    options={edifactVersions}
                    value={edifactVersions.find(v => v.value === dnData.input.revision) || null}
                    onChange={(event, newValue) => {
                      handleDnDataChange('input', 'revision', newValue?.value || newValue || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                      handleDnDataChange('input', 'revision', newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Revision"
                        fullWidth
                        margin="normal"
                      />
                    )}
                  />
                )}

                <TextField
                  fullWidth
                  margin="normal"
                  label="Message type"
                  value={dnData.input.message}
                  onChange={(e) => handleDnDataChange('input', 'message', e.target.value)}
                />
              </>
            )}

            <Box sx={{ mt: 2 }}>
              <Input
                type="file"
                onChange={(e) => handleDnFileUpload('input', e)}
                sx={{ display: 'none' }}
                id="dn-input-file"
                accept={
                  dnData.input.type === 'edi' ? '.json' :
                  dnData.input.type === 'idoc' ? '.txt' :
                  '.csv'
                }
              />
              <label htmlFor="dn-input-file">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<FileUploadIcon />}
                  sx={{ mt: 2, mb: 2 }}
                >
                  Upload {dnData.input.type.toUpperCase()} file
                </Button>
              </label>
              {dnData.input.fileName && (
                <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                  File loaded: {dnData.input.fileName}
                </Typography>
              )}
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Button
                type="button"
                variant="contained"
                color="primary"
                startIcon={<BuildIcon />}
                onClick={() => handleGenerateDnForSection('input')}
                disabled={loading || (dnData.input.type === 'edi' && !dnData.input.message)}
                fullWidth
              >
                {loading && generatingType === 'input' ? 
                  <CircularProgress size={24} /> : 
                  'Generate Data Normalizer (Input)'
                }
              </Button>
            </Box>
            
            {generatedDn.input.content && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Generated DN Preview
                </Typography>
                <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto', mb: 2 }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {generatedDn.input.content}
                  </pre>
                </Paper>
                <Button 
                  variant="outlined" 
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDnDownload('input')}
                >
                  Download Input DN
                </Button>
              </Box>
            )}
          </Box>

          {/* Section Output */}
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              Output
            </Typography>
            
            <FormControl fullWidth margin="normal">
              <InputLabel>Type</InputLabel>
              <Select
                value={dnData.output.type}
                onChange={(e) => handleDnTypeChange('output', e.target.value)}
                label="Type"
              >
                <MenuItem value="edi">EDI</MenuItem>
                <MenuItem value="idoc">IDOC</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>

            {dnData.output.type === 'edi' && (
              <>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Standard</InputLabel>
                  <Select
                    value={dnData.output.standard}
                    onChange={(e) => handleDnDataChange('output', 'standard', e.target.value)}
                    label="Standard"
                  >
                    <MenuItem value="EDIFACT">EDIFACT</MenuItem>
                    <MenuItem value="X12">X12</MenuItem>
                  </Select>
                </FormControl>

                {dnData.output.standard === 'EDIFACT' && (
                  <Autocomplete
                    freeSolo
                    options={edifactVersions}
                    value={edifactVersions.find(v => v.value === dnData.output.revision) || null}
                    onChange={(event, newValue) => {
                      handleDnDataChange('output', 'revision', newValue?.value || newValue || '');
                    }}
                    onInputChange={(event, newInputValue) => {
                      handleDnDataChange('output', 'revision', newInputValue);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Revision"
                        fullWidth
                        margin="normal"
                      />
                    )}
                  />
                )}

                <TextField
                  fullWidth
                  margin="normal"
                  label="Message type"
                  value={dnData.output.message}
                  onChange={(e) => handleDnDataChange('output', 'message', e.target.value)}
                />
              </>
            )}

            <Box sx={{ mt: 2 }}>
              <Input
                type="file"
                onChange={(e) => handleDnFileUpload('output', e)}
                sx={{ display: 'none' }}
                id="dn-output-file"
                accept={
                  dnData.output.type === 'edi' ? '.json' :
                  dnData.output.type === 'idoc' ? '.txt' :
                  '.csv'
                }
              />
              <label htmlFor="dn-output-file">
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<FileUploadIcon />}
                  sx={{ mt: 2, mb: 2 }}
                >
                  Upload {dnData.output.type.toUpperCase()} file
                </Button>
              </label>
              {dnData.output.fileName && (
                <Typography variant="body2" sx={{ mt: 1, color: 'success.main' }}>
                  File loaded: {dnData.output.fileName}
                </Typography>
              )}
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Button
                type="button"
                variant="contained"
                color="secondary"
                startIcon={<BuildIcon />}
                onClick={() => handleGenerateDnForSection('output')}
                disabled={loading || (dnData.output.type === 'edi' && !dnData.output.message)}
                fullWidth
              >
                {loading && generatingType === 'output' ? 
                  <CircularProgress size={24} /> : 
                  'Generate Data Normalizer (Output)'
                }
              </Button>
            </Box>
            
            {generatedDn.output.content && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Generated DN Preview
                </Typography>
                <Paper sx={{ p: 2, maxHeight: 200, overflow: 'auto', mb: 2 }}>
                  <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                    {generatedDn.output.content}
                  </pre>
                </Paper>
                <Button 
                  variant="outlined" 
                  size="small"
                  fullWidth
                  sx={{ mt: 1 }}
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDnDownload('output')}
                >
                  Download Output DN
                </Button>
              </Box>
            )}
          </Box>
        </Stack>
      </StyledPaper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Toast onClose={handleCloseToast} severity={toast.severity}>
          {toast.message}
        </Toast>
      </Snackbar>
    </Box>
  );
}

export default DataNormalizerGeneration; 