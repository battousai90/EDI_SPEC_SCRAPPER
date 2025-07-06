import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Autocomplete,
  TextField,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import DownloadIcon from '@mui/icons-material/Download';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const standards = [
  { label: 'EDIFACT', value: 'EDIFACT' },
  { label: 'X12', value: 'X12' },
  { label: 'IDOC', value: 'IDOC' },
];

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

const edifactMessages = [
  { label: 'ORDERS - Purchase Order', value: 'ORDERS' },
  { label: 'DESADV - Dispatch Advice', value: 'DESADV' },
  { label: 'ORDRSP - Purchase Order Response', value: 'ORDRSP' },
  { label: 'INVOIC - Invoice', value: 'INVOIC' },
  { label: 'DELFOR - Delivery Forecast', value: 'DELFOR' }
];

function EDISpecScraper({ onScrapingComplete }) {
  const [standardInput, setStandardInput] = useState('');
  const [revisionInput, setRevisionInput] = useState('');
  const [messageTypeInput, setMessageTypeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!standardInput || !revisionInput || !messageTypeInput) {
      setError('All fields are required');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3001/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          standard: standardInput,
          revision: revisionInput,
          messageType: messageTypeInput,
        }),
      });

      if (!response.ok) {
        throw new Error('Error during scraping');
      }

      const data = await response.json();
      setResult(data);
      onScrapingComplete && onScrapingComplete(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (result) {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${standardInput}_${revisionInput}_${messageTypeInput}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        EDI Specification Scraper
      </Typography>

      <StyledPaper>
        <form onSubmit={handleSubmit}>
          <Autocomplete
            options={standards}
            getOptionLabel={(option) => option.label || option}
            value={standardInput ? { label: standardInput, value: standardInput } : null}
            onChange={(event, newValue) => {
              setStandardInput(newValue ? newValue.value : '');
              setRevisionInput('');
              setMessageTypeInput('');
            }}
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

          <Autocomplete
            options={standardInput === 'EDIFACT' ? edifactVersions : []}
            getOptionLabel={(option) => option.label || option}
            value={revisionInput ? { label: revisionInput, value: revisionInput } : null}
            onChange={(event, newValue) => {
              setRevisionInput(newValue ? newValue.value : '');
            }}
            disabled={!standardInput}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Revision"
                required
                fullWidth
                margin="normal"
              />
            )}
            freeSolo
          />

          <Autocomplete
            options={standardInput === 'EDIFACT' ? edifactMessages : []}
            getOptionLabel={(option) => option.label || option}
            value={messageTypeInput ? { label: messageTypeInput, value: messageTypeInput } : null}
            onChange={(event, newValue) => {
              setMessageTypeInput(newValue ? newValue.value : '');
            }}
            disabled={!standardInput}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Message Type"
                required
                fullWidth
                margin="normal"
              />
            )}
            freeSolo
          />

          <Box sx={{ mt: 2 }}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ minWidth: '150px' }}
            >
              {loading ? <CircularProgress size={24} /> : 'Scrap the Specification !'}
            </Button>
          </Box>
        </form>
      </StyledPaper>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {result && (
        <StyledPaper>
          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Scraping result
              </Typography>
            </Box>
            <Box
              sx={{
                maxHeight: '400px',
                overflow: 'auto',
                bgcolor: 'grey.100',
                p: 2,
                borderRadius: 1,
              }}
            >
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </Box>
            <Box sx={{ mt: 2 }}>
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
          </Stack>
        </StyledPaper>
      )}
    </Box>
  );
}

export default EDISpecScraper; 