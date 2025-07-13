const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const xml2js = require('xml2js');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

// Utility functions for format generation
function formatIDOCField(xmlBuilder, { name, length, key, mandatory, content, description }) {
  xmlBuilder.ele(name)
    .att('format', 'fixed')
    .att('length', length.toString());

  if (key) {
    xmlBuilder.att('key', 'true');
  }

  if (mandatory) {
    xmlBuilder.att('min', '1');
  }

  if (description) {
    xmlBuilder.att('description', description);
  }

  if (content) {
    xmlBuilder.txt(content);
  }

  return xmlBuilder.up();
}

function processEDIFACTFormat(xmlBuilder, data, isRoot = false) {
  // Check that data contains segments
  if (!data || (!data.Segments && !Array.isArray(data))) {
    throw new Error('JSON data must contain a Segments property or be an array');
  }

  // If it's not the root, create a new MESSAGE element
  const messageElement = isRoot ? xmlBuilder : xmlBuilder.ele('MESSAGE')
    .att('format', 'none')
    .att('max', 'n')
    .att('requirement', 'mandatory');

  // Function to add an element with its attributes
  const addElement = (parent, name, attributes = {}, content = null, isCompositeChild = false) => {
    const element = parent.ele(name);
    // If it's a child element of a composite (C or S), use compChar
    const endChar = isCompositeChild ? '$compChar' : '$elChar';
    
    Object.entries({
      ...attributes,
      end: attributes.end || endChar
    }).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        element.att(key, value);
      }
    });
    
    if (content) {
      element.txt(content);
    }
    return element;
  };

  // Function to process a segment or a segment group
  const processSegment = (segment, parent) => {
    if (!segment) return;

    // Process segment groups (SG)
    if (segment.Segment && segment.Segment.startsWith('SG')) {
      const groupElement = addElement(parent, segment.Segment, {
        'format': 'none',
        'max': segment.Max || '10'  // Use segment Max value or 10 as default
      });

      // Process the segments of the group
      if (segment.Segments && Array.isArray(segment.Segments)) {
        segment.Segments.forEach(subSegment => {
          processSegment(subSegment, groupElement);
        });
      }
    }
    // Process normal segments
    else if (segment.Segment && !segment.Segment.startsWith('SG')) {
      const segmentElement = addElement(parent, segment.Segment, {
        'end': '$segChar',
        'lastEnd': 'true',
        'emptyEnd': 'false',
        'errorLevel': 'true',
        'requirement': (segment.Requirement || 'conditional').toLowerCase()
      });

      // Add min if mandatory
      if (segment.Requirement && segment.Requirement.toLowerCase() === 'mandatory') {
        segmentElement.att('min', '1');
      }

      // Add max if different from 1
      if (segment.Max && segment.Max !== '1') {
        segmentElement.att('max', segment.Max);
      }

      // Add TAG
      addElement(segmentElement, 'TAG', {
        'end': '$elChar',
        'key': 'true',
        'min': '1'
      }, segment.Segment);

      // Process elements
      if (segment.Elements) {
        segment.Elements.forEach(element => {
          // Determine if it's a composite or simple element
          if (element.Element && (element.Element.startsWith('S') || element.Element.startsWith('C'))) {
            // Composite element (S or C)
            const compositeElement = addElement(segmentElement, element.Element, {
              'end': '$elChar'
            });

            // Process composite sub-elements
            if (element.Elements) {
              element.Elements.forEach(subElement => {
                const attributes = {
                  'end': '$compChar',
                  'maxSize': subElement.Max || ''
                };

                // Add min="1" if element is mandatory
                if (subElement.Requirement && subElement.Requirement.toLowerCase() === 'mandatory') {
                  attributes.min = '1';
                }

                addElement(compositeElement, `E${subElement.Element}`, attributes, null, true);
              });
            }
          } else {
            // Simple element at segment level
            const attributes = {
              'end': '$elChar',
              'maxSize': element.Max || ''
            };

            // Add min="1" if element is mandatory
            if (element.Requirement && element.Requirement.toLowerCase() === 'mandatory') {
              attributes.min = '1';
            }

            addElement(segmentElement, `E${element.Element}`, attributes);
          }
        });
      }
    }
  };

  // Process all segments
  const segments = data.Segments || data;
  if (Array.isArray(segments)) {
    segments.forEach(segment => {
      processSegment(segment, messageElement);
    });
  }

  return messageElement;
}

function processIDOCFormat(xmlBuilder, data) {
  let newSegment = false;

  xmlBuilder.ele('TRANSACTION')
    .att('format', 'none')
    .att('max', 'n');

  // Add EDI_DC40 header
  const headerElement = xmlBuilder.ele('EDI_DC40')
    .att('min', '1')
    .att('errorLevel', 'true');

  // Add EDI_DC40 fields
  const headerFields = [
    { name: 'TABNAM', length: 10, key: true, mandatory: true, content: 'EDI_DC40_U' },
    { name: 'MANDT', length: 3 },
    { name: 'DOCNUM', length: 16 },
    // ... other EDI_DC40 fields
  ];

  headerFields.forEach(field => {
    formatIDOCField(headerElement, field);
  });

  for (const line of data) {
    const position = line.Position?.toString() || '';

    if (newSegment && (!position || position.includes('_GROUP_'))) {
      xmlBuilder.up();
      newSegment = false;
    }

    if (position.includes('_GROUP_END')) {
      xmlBuilder.up();
    } else if (position.includes('_GROUP_BEGIN')) {
      xmlBuilder.ele(position.replace('_BEGIN', ''))
        .att('format', 'none');

      const max = (line.Max || '1').toString().toLowerCase();
      if (max !== '1') {
        xmlBuilder.att('max', max);
      }
    } else if (line.Segment) {
      xmlBuilder.ele(line.Type);
      
      if (line.Max !== '1') {
        xmlBuilder.att('max', line.Max.toString().toLowerCase());
      }
      xmlBuilder.att('errorLevel', 'true');
      newSegment = true;

      // Add segment fields
      formatIDOCField(xmlBuilder, {
        name: 'SEGNAM',
        length: 30,
        key: true,
        mandatory: true,
        content: line.Segment
      });
      
      // Other segment fields
      ['MANDT', 'DOCNUM', 'SEGNUM', 'PSGNUM', 'HLEVEL'].forEach(field => {
        formatIDOCField(xmlBuilder, {
          name: field,
          length: field === 'DOCNUM' ? 16 : field === 'MANDT' ? 3 : 6
        });
      });
    } else if (line.Field) {
      formatIDOCField(xmlBuilder, {
        name: line.Field,
        length: line.Length,
        description: line.Description
      });
    }
  }

  return xmlBuilder;
}

// Endpoint for scraping
app.post('/api/scrape', async (req, res) => {
  const { standard, revision, messageType } = req.body;

  // Input validation
  if (!standard || !revision || !messageType) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Execute scraping script
  exec(`node src/index.js ${standard} ${revision} ${messageType}`, async (error, stdout, stderr) => {
    if (error) {
      console.error(`Execution error: ${error}`);
      return res.status(500).json({ message: 'Error during scraping', error: error.message });
    }

    try {
      // Read generated JSON file using the correct path format
      const outputPath = path.join(__dirname, 'output', revision.replace(/\s+\(\d+\)$/, ''), `${messageType}.json`);
      const jsonContent = await fs.readFile(outputPath, 'utf8');
      res.json(JSON.parse(jsonContent));
    } catch (err) {
      console.error(`File reading error: ${err}`);
      res.status(500).json({ message: 'Error reading results', error: err.message });
    }
  });
});

// Endpoint for format generation
app.post('/api/generate-format', async (req, res) => {
  try {
    const { standard, revision, messageType, mode, format, jsonData } = req.body;

    if (!jsonData) {
      throw new Error('Missing JSON data');
    }

    // Create a new XML builder directly with MESSAGE as root
    const builder = require('xmlbuilder');
    const xml = builder.create('MESSAGE', { encoding: 'UTF-8' })
      .att('format', 'none')
      .att('max', 'n')
      .att('requirement', 'mandatory');

    // Add comment
    xml.com(`${standard}-${revision}-${messageType}`);

    // Process according to standard
    switch (standard) {
      case 'EDIFACT':
        processEDIFACTFormat(xml, jsonData, true);
        break;
      case 'IDOC':
        processIDOCFormat(xml, jsonData);
        break;
      default:
        throw new Error(`Unsupported standard: ${standard}`);
    }

    // Generate result according to requested format
    let content;
    if (format === 'xml') {
      content = xml.end({ pretty: true, allowEmpty: true, headless: true });
    } else {
      // Convert XML to JSON
      const parser = new xml2js.Parser();
      content = JSON.stringify(await parser.parseStringPromise(xml.end()), null, 2);
    }

    res.json({ content });
  } catch (error) {
    console.error('Error generating format:', error);
    res.status(500).json({ message: error.message });
  }
});

// Endpoint for Data Normalizer (DN) generation
app.post('/api/generate-dn', async (req, res) => {
  try {
    const { type, format, fileContent } = req.body;
    
    if (!type || !format) {
      throw new Error('Type and format are required');
    }

    // Structure to store DN-specific data
    let dnData = {};
    
    // For simplicity, we'll simulate information detection
    // In a real implementation, these values would come from file analysis
    if (format === 'edifact') {
      dnData = {
        type: 'edi',
        standard: 'EDIFACT',
        revision: '96A', // To be determined from file content
        message: 'ORDERS' // To be determined from file content
      };
    } else if (format === 'x12') {
      dnData = {
        type: 'edi',
        standard: 'X12',
        revision: '4010', // To be determined from file content
        message: '850' // To be determined from file content
      };
    } else if (format === 'idoc') {
      dnData = {
        type: 'idoc',
        message: 'ORDERS02' // To be determined from file content
      };
    } else {
      // For other formats (xml, json, csv)
      dnData = {
        type: format,
        standard: format,
        message: 'custom'
      };
    }

    // Generate DN XML content
    let xmlContent = '';
    
    if (dnData.type === 'edi') {
      if (dnData.standard === 'EDIFACT') {
        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE doc [
    <!ENTITY unb SYSTEM "./../../SFEDI/format/edifact/unb.xml">
    <!ENTITY ${dnData.message} SYSTEM "./../../SFEDI/format/edifact/${dnData.revision}/${dnData.message}.xml">
    <!ENTITY unz SYSTEM "./../../SFEDI/format/edifact/unz.xml">
]>
<ixDOC format="variable" segChar="'" elChar="+" compChar=":" emptyEnd="true" lastEnd="false">
    <INTERCHANGE format="none" max="n">
        &unb;
        &${dnData.message};
        &unz;
    </INTERCHANGE>
</ixDOC>`;
      } else if (dnData.standard === 'X12') {
        xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE doc [
    <!ENTITY isa SYSTEM "./../../SFEDI/format/x12/isa.xml">
    <!ENTITY gs SYSTEM "./../../SFEDI/format/x12/gs.xml">
    <!ENTITY x${dnData.message} SYSTEM "./../../SFEDI/format/x12/${dnData.revision}/${dnData.message}.xml">
    <!ENTITY ge SYSTEM "./../../SFEDI/format/x12/ge.xml">
    <!ENTITY iea SYSTEM "./../../SFEDI/format/x12/iea.xml">
]>
<ixDOC format="variable" segChar="\\n" elChar="|" compChar=">" emptyEnd="true" lastEnd="false">
    <INTERCHANGE format="none" max="n">
        &isa;
        &gs;
        &x${dnData.message};
        &ge;
        &iea;
    </INTERCHANGE>
</ixDOC>`;
      }
    } else if (dnData.type === 'idoc') {
      const message2 = dnData.message.slice(0, -2);
      xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE doc [
    <!ENTITY ${message2} SYSTEM "./idoc/${dnData.message}.xml">
]>
<ixDOC format="variable" end="\\r\\n or \\n">
    &${message2};
</ixDOC>`;
    } else {
      // Custom format for other types (xml, json, csv)
      xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<ixDOC format="variable">
    <FORMAT type="${dnData.type}">
        <!-- Custom definition for ${dnData.type} -->
    </FORMAT>
</ixDOC>`;
    }

    // Generate filename
    let fileName;
    if (dnData.type === 'edi') {
      fileName = `DN__${dnData.standard}-${dnData.revision}-${dnData.message}.xml`;
    } else if (dnData.type === 'idoc') {
      const message2 = dnData.message.slice(0, -2);
      fileName = `DN__IDoc-Fixed-${dnData.message}-${message2}.xml`;
    } else {
      fileName = `DN__${dnData.type.toUpperCase()}-custom.xml`;
    }

    // Return content and filename
    res.json({
      content: xmlContent,
      fileName
    });
  } catch (error) {
    console.error('Error generating DN:', error);
    res.status(500).json({ message: error.message });
  }
});

// Endpoint for writing file to iXpath
app.post('/api/write-to-ixpath', async (req, res) => {
  try {
    const { content, standard, revision, messageType, ixpathFolder, format } = req.body;

    if (!content || !standard || !revision || !messageType || !ixpathFolder) {
      throw new Error('All parameters are required');
    }

    // Create full path
    const targetPath = path.join(
      ixpathFolder,
      'SFEDI',
      'format',
      standard.toLowerCase(),
      revision.toUpperCase(),
      `${messageType.toUpperCase()}.${format}`
    );

    // Create directories recursively
    await fs.mkdir(path.dirname(targetPath), { recursive: true });

    // Write file
    await fs.writeFile(targetPath, content);

    res.json({ 
      message: 'File written successfully',
      path: targetPath
    });
  } catch (error) {
    console.error('Error writing file:', error);
    res.status(500).json({ message: error.message });
  }
});

// Serve static frontend files if build exists (for all environments)
const frontendBuildPath = path.join(__dirname, 'frontend', 'build');
if (fsSync.existsSync(frontendBuildPath)) {
  app.use(express.static(frontendBuildPath));
  // Fallback: serve index.html for all non-API routes
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});