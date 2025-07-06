const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

// Base URL configuration
const BASE_URL = 'https://www.edifactory.de/edifact/directory';

// Main scraping function
async function scrapeEDISpecs(standard, revision, document) {
    // If the document is UNH or another service segment, go directly to its definition
    if (['UNH', 'UNT', 'BGM', 'DTM'].includes(document)) {
        const segmentUrl = `${BASE_URL}/${revision}/segment/${document}/popup`;
        const segmentDetails = await getSegmentDetails(segmentUrl);
        
        // Create a simplified structure object for a single segment
        const mainStructure = {
            Standard: standard,
            Revision: revision,
            Document: document,
            Segments: [{
                Min: '1',
                Max: '1',
                Scope: 'Used',
                Position: '0010',
                Segment: document,
                Name: document,
                Description: `Service segment ${document}`,
                Requirement: 'Mandatory',
                Elements: segmentDetails.Elements || []
            }]
        };
        
        // Save to a JSON file
        const outputDir = path.join('output', revision);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const outputFile = path.join(outputDir, `${document}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(mainStructure, null, 2));
        console.log(`\nSpecifications saved in ${outputFile}`);
        return;
    }
    
    const url = `${BASE_URL}/${revision}/message/${document}`;
    
    console.log(`Accessing URL: ${url}`);
    const response = await axios.get(url);
    console.log('Message page loaded\n');

    const $ = cheerio.load(response.data);
    
    console.log('Analyzing page structure:');
    console.log('-----------------------------------\n');

    const mainStructure = {
        Standard: standard,
        Revision: revision,
        Document: document,
        Segments: []
    };

    // Store original order of elements
    const orderedElements = [];
    
    // Process segment groups
    const groups = {};
    const groupRelationships = {};
    
    // First pass: identify all groups and relationships and store order
    $('.isotope-container').each((i, element) => {
        const $element = $(element);
        const title = $element.find('h3').text().trim();
        const groupMatch = title.match(/SG(\d+)/);
        const segmentText = $element.find('h3.deep a').text().trim();
        const description = $element.find('p').text().trim();
        
        // Store the original position for sorting
        const originalPosition = i;
        
        if (groupMatch) {
            const groupCode = `SG${groupMatch[1]}`;
            const reqMatch = title.match(/C\((\d+)\)/);
            const requirement = reqMatch ? reqMatch[1] : '';
            const [min, max] = ['0', requirement || '1'];
            
            // Create group object
            groups[groupCode] = {
                Min: min,
                Max: max,
                Scope: 'Used',
                Position: ((i + 1) * 10).toString().padStart(4, '0'),
                Segment: groupCode,
                Name: groupCode,
                Description: description,
                Requirement: 'Conditional',
                Segments: [],
                originalPosition: originalPosition
            };
            
            // Store in ordered elements
            orderedElements.push({
                type: 'group',
                code: groupCode,
                originalPosition: originalPosition
            });
            
            // Determine parent-child relationships dynamically
            const parentGroup = $element.closest('.collapse').prev('h3').text().match(/SG(\d+)/);
            if (parentGroup) {
                const parentGroupCode = `SG${parentGroup[1]}`;
                
                if (!groupRelationships[parentGroupCode]) {
                    groupRelationships[parentGroupCode] = [];
                }
                groupRelationships[parentGroupCode].push(groupCode);
                
                console.log(`Relationship detected: ${parentGroupCode} is parent of ${groupCode}`);
            }
        } else if (segmentText) {
            // Store non-group segments in order
            orderedElements.push({
                type: 'segment',
                code: segmentText,
                element: $element,
                originalPosition: originalPosition,
                description: description
            });
        }
    });
    
    console.log('Group relationships identified:');
    console.log(groupRelationships);
    
    // Mark all groups that are sub-groups
    const subGroupSet = new Set();
    for (const parentGroup in groupRelationships) {
        for (const childGroup of groupRelationships[parentGroup]) {
            subGroupSet.add(childGroup);
        }
    }

    // Function to add a group (and its sub-groups) to a parent
    function addGroupToParent(groupCode, parentSegments) {
        if (groups[groupCode]) {
            // Add this group as a segment to the parent
            parentSegments.push(groups[groupCode]);
            
            // Check if this group has sub-groups
            if (groupRelationships[groupCode]) {
                for (const childGroupCode of groupRelationships[groupCode]) {
                    // Recursively add sub-groups to this group (as segments)
                    addGroupToParent(childGroupCode, groups[groupCode].Segments);
                }
            }
        }
    }
    
    // Process all elements in their original order
    const processedGroups = new Set();
    
    for (const element of orderedElements) {
        if (element.type === 'segment') {
            const $element = element.element;
            const title = $element.find('h3').text().trim();
            const segmentText = element.code;
            const description = element.description;

            // Check if it's a segment inside a group
            const parentGroupMatch = $element.closest('.collapse').prev('h3').text().match(/SG(\d+)/);
            const isInGroup = parentGroupMatch !== null;
            const parentGroupCode = isInGroup ? `SG${parentGroupMatch[1]}` : null;

            // Cherche le pattern [MC](n) dans le texte qui suit le titre
            const afterTitleText = $element.text().replace(title, '').trim();
            const reqMatch = afterTitleText.match(/[MC]\((\d+)\)/);
            const segReq = reqMatch ? (afterTitleText.includes('M(') ? 'M' : 'C') : 'C';
            const max = reqMatch ? reqMatch[1] : '1';
            
            // Get segment details
            const segmentUrl = `${BASE_URL}/${revision}/segment/${segmentText}/popup`;
            const segmentDetails = await getSegmentDetails(segmentUrl);
            
            const segment = {
                Min: segReq === 'M' ? '1' : '0',
                Max: max,
                Scope: 'Used',
                Position: ((element.originalPosition + 1) * 10).toString().padStart(4, '0'),
                Segment: segmentText,
                Name: segmentText,
                Description: description,
                Requirement: segReq === 'M' ? 'Mandatory' : 'Conditional',
                Elements: segmentDetails.Elements || [],
                originalPosition: element.originalPosition
            };
            
            // Add segment to parent group or main structure
            if (isInGroup && groups[parentGroupCode]) {
                console.log(`Segment added to group: ${parentGroupCode}`);
                groups[parentGroupCode].Segments.push(segment);
            } else {
                console.log('Segment added to main structure');
                mainStructure.Segments.push(segment);
            }
        } else if (element.type === 'group' && !subGroupSet.has(element.code) && !processedGroups.has(element.code)) {
            console.log(`Top-level group added to structure: ${element.code}`);
            addGroupToParent(element.code, mainStructure.Segments);
            processedGroups.add(element.code);
        }
    }

    // Sort segments within each group by their original position
    function sortSegmentsByPosition(segments) {
        if (!segments) return;
        segments.sort((a, b) => a.originalPosition - b.originalPosition);
        segments.forEach(segment => {
            if (segment.Segments) {
                sortSegmentsByPosition(segment.Segments);
            }
        });
    }

    // Sort all segments by their original position
    sortSegmentsByPosition(mainStructure.Segments);

    // Clean up by removing originalPosition property
    function removeOriginalPosition(segments) {
        if (!segments) return;
        segments.forEach(segment => {
            delete segment.originalPosition;
            if (segment.Segments) {
                removeOriginalPosition(segment.Segments);
            }
        });
    }

    // Clean up JSON before saving
    const cleanJson = (obj) => {
        // Remove originalPosition and other working properties
        removeOriginalPosition(obj.Segments);
        
        // Recursive function to clean objects
        const cleanObject = (object) => {
            // Remove isSubGroup and other working properties
            if (object.hasOwnProperty('isSubGroup')) {
                delete object.isSubGroup;
            }
            
            // Process segments recursively
            if (object.Segments) {
                object.Segments.forEach(segment => {
                    cleanObject(segment);
                });
            }
        };
        
        // Create a deep copy of the object
        const cleanedObj = JSON.parse(JSON.stringify(obj));
        
        // Clean all top-level segments
        cleanedObj.Segments.forEach(segment => cleanObject(segment));
        
        return cleanedObj;
    };
    
    // Clean the JSON
    const cleanedStructure = cleanJson(mainStructure);
    
    // Display extraction summary
    console.log('Extraction summary:');
    console.log('----------------------');
    console.log(`Total number of top-level segments/groups: ${cleanedStructure.Segments.length}`);
    
    // Function to count segments (including sub-groups and their segments)
    function countSegments(segment) {
        if (!segment.Segments || segment.Segments.length === 0) {
            return 1;
        }
        
        let count = 1; // Count this segment
        for (const childSegment of segment.Segments) {
            count += countSegments(childSegment);
        }
        return count;
    }
    
    let totalSegments = 0;
    for (const segment of cleanedStructure.Segments) {
        const count = countSegments(segment);
        console.log(`${segment.Segment} : ${count} segments (including sub-groups)`);
        totalSegments += count;
    }
    console.log(`Total of all segments: ${totalSegments}`);
    
    // Create output directory if it doesn't exist
    const outputDir = path.join('output', revision);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save specifications to a JSON file
    const outputFile = path.join(outputDir, `${document}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(cleanedStructure, null, 2));
    console.log(`\nSpecifications saved in ${outputFile}`);
}

async function getSegmentDetails(url) {
    try {
        console.log(`Retrieving segment details: ${url}`);
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        
        const elements = [];
        const preContent = $('.segment-content pre').text();
        
        if (preContent) {
            const lines = preContent.split('\n');
            let currentComposite = null;
            let currentElements = [];
            let positionCounter = 10;
            
            // First pass: analyze the complete structure
            const segmentStructure = [];
            let currentIndent = 0;
            let currentParent = null;
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                
                // Calculate indentation by counting spaces at beginning
                const leadingSpaces = line.match(/^\s*/)[0].length;
                const indentLevel = Math.floor(leadingSpaces / 3); // Assume indentation level = 3 spaces
                
                if (trimmedLine.match(/^[SC]\d{3,4}/)) {
                    // It's a composite
                    const [code, ...rest] = trimmedLine.split(/\s+/);
                    segmentStructure.push({
                        type: 'composite',
                        code: code,
                        indent: indentLevel,
                        content: trimmedLine,
                        children: []
                    });
                } else if (trimmedLine.match(/^\d{4}/)) {
                    // It's an element
                    const [code, ...rest] = trimmedLine.split(/\s+/);
                    segmentStructure.push({
                        type: 'element',
                        code: code,
                        indent: indentLevel,
                        content: trimmedLine,
                        parent: null
                    });
                }
            }
            
            // Second pass: build hierarchy
            // Establish parent-child relationships based on indentation
            const root = { children: [] };
            const stack = [root];
            
            for (const item of segmentStructure) {
                while (stack.length > item.indent + 1) {
                    stack.pop();
                }
                const parent = stack[stack.length - 1];
                if (parent) {
                    if (parent.children) {
                        parent.children.push(item);
                    }
                    item.parent = parent;
                }
                
                if (item.type === 'composite') {
                    stack.push(item);
                }
            }
            
            // Third pass: create objects from hierarchy
            for (const item of segmentStructure) {
                if (item.indent === 0) {
                    if (item.type === 'composite') {
                        // Top-level composite
                        const [code, ...rest] = item.content.split(/\s+/);
                        const requirement = rest.join(' ').match(/[MC]/);
                        
                        const composite = {
                            Scope: "Used",
                            Position: String(positionCounter).padStart(3, '0'),
                            Element: code,
                            Name: rest.join(' '),
                            Description: "",
                            Requirement: requirement && requirement[0] === 'M' ? "Mandatory" : "Conditional",
                            Type: "Composite (composite)",
                            Elements: []
                        };
                        
                        // Add composite children
                        for (const child of item.children || []) {
                            if (child.type === 'element') {
                                const elementMatch = child.content.match(/^(\d{4})\s+(.+?)\s+([MC])\s+([an\d.]+)/);
                                if (elementMatch) {
                                    const [, code, name, req, format] = elementMatch;
                                    
                                    // Convert format (e.g. an1..14 -> String (AN))
                                    const typeMap = {
                                        'an': 'String (AN)',
                                        'a': 'A',
                                        'n': 'Numeric (N)'
                                    };
                                    
                                    const formatType = format.match(/^([a-z]+)/)[1];
                                    const formatRange = format.match(/(\d+)\.\.(\d+)/);
                                    
                                    composite.Elements.push({
                                        Scope: "Used",
                                        Position: composite.Position + String(composite.Elements.length + 1).padStart(3, '0'),
                                        Element: code,
                                        Name: name.trim(),
                                        Description: "",
                                        Requirement: req === 'M' ? 'Mandatory' : 'Conditional',
                                        Type: typeMap[formatType] || formatType,
                                        Min: formatRange ? formatRange[1] : "1",
                                        Max: formatRange ? formatRange[2] : format.replace(/^[a-z]+/, '')
                                    });
                                }
                            }
                        }
                        
                        elements.push(composite);
                        positionCounter += 10;
                    } else if (item.type === 'element') {
                        // Top-level element
                        const elementMatch = item.content.match(/^(\d{4})\s+(.+?)\s+([MC])\s+([an\d.]+)/);
                        if (elementMatch) {
                            const [, code, name, req, format] = elementMatch;
                            
                            // Convert format
                            const typeMap = {
                                'an': 'String (AN)',
                                'a': 'A',
                                'n': 'Numeric (N)'
                            };
                            
                            const formatType = format.match(/^([a-z]+)/)[1];
                            const formatRange = format.match(/(\d+)\.\.(\d+)/);
                            
                            elements.push({
                                Scope: "Used",
                                Position: String(positionCounter).padStart(3, '0'),
                                Element: code,
                                Name: name.trim(),
                                Description: "",
                                Requirement: req === 'M' ? 'Mandatory' : 'Conditional',
                                Type: typeMap[formatType] || formatType,
                                Min: formatRange ? formatRange[1] : "1",
                                Max: formatRange ? formatRange[2] : format.replace(/^[a-z]+/, '')
                            });
                            
                            positionCounter += 10;
                        }
                    }
                }
            }
        }
        
        return { Elements: elements };
    } catch (error) {
        console.error(`Error extracting segment details: ${error.message}`);
        return { Elements: [] };
    }
}

// Function to check robots.txt
async function checkRobotsTxt() {
    try {
        const response = await fetch(`${BASE_URL}/robots.txt`);
        const robotsTxt = await response.text();
        console.log('robots.txt content:', robotsTxt);
        return true;
    } catch (error) {
        console.error('Error checking robots.txt:', error);
        return false;
    }
}

// Application entry point
async function main() {
    const standard = process.argv[2] || 'EDIFACT';
    const revision = process.argv[3] || 'D97A';
    const messageType = process.argv[4] || 'ORDSRP';

    if (!standard || !revision || !messageType) {
        console.error('Usage: node index.js <standard> <revision> <messageType>');
        process.exit(1);
    }

    try {
        const robotsCheck = await checkRobotsTxt();
        if (!robotsCheck) {
            console.error('Unable to check robots.txt');
            process.exit(1);
        }

        await scrapeEDISpecs(standard, revision, messageType);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();