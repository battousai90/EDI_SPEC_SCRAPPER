# EDI Specification Scraper

A tool to scrape and normalize EDI specifications from edifactory.de.

## Features

- Scrape EDIFACT message specifications
- Generate format files for various EDI standards
- Generate Data Normalizers
- Preserve the correct segment order and hierarchy

## Docker Setup

### Prerequisites

- Docker
- Docker Compose

### Running with Docker

1. Clone the repository:
   ```bash
   git clone https://github.com/ds-gilbert/EDI_SPEC_SCRAPPER.git
   cd EDI_SPEC_SCRAPPER
   ```

2. Build and run the container:
   ```bash
   docker-compose up -d
   ```

3. Access the application at:
   ```
   http://localhost:3001
   ```

4. Stop the container:
   ```bash
   docker-compose down
   ```

### Environment Variables

You can configure the application by modifying the `docker-compose.yml` file:

- `NODE_ENV`: Set to `production` for production mode or `development` for development mode

### Volume Mounts

- The `output` directory is mounted to persist scraped data
- For development, you can uncomment the source code mounts in the `docker-compose.yml` file

## Manual Setup (without Docker)

### Prerequisites

- Node.js 14+
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ds-gilbert/EDI_SPEC_SCRAPPER.git
   cd EDI_SPEC_SCRAPPER
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Access the application at:
   ```
   http://localhost:3001
   ```

## Usage

### Web Interface

1. Select the EDI standard, revision, and message type
2. Click "Scrap the Specification!" to retrieve the structure
3. Generate formats or Data Normalizers as needed

### Command Line

The application can also be run from the command line:

```bash
npm run scrape <standard> <revision> <messageType>
```

Example:
```bash
npm run scrape EDIFACT D97A ORDERS
```

Parameters:
- `standard`: The EDI standard (e.g., EDIFACT or X12)
- `revision`: The standard revision (e.g., D97A, D921)
- `messageType`: The message type (e.g., ORDERS, ORDRSP)

## Data Structure

The extracted data is saved in the `output/<revision>/<messageType>.json` folder with the following structure:

```json
{
  "Standard": "EDIFACT",
  "Revision": "D97A",
  "Document": "ORDERS",
  "Segments": [
    {
      "Segment": "UNH",
      "Description": "Message header",
      "Elements": [
        {
          "Element": "0062",
          "Name": "Message reference number",
          "Type": "String (AN)"
        }
      ]
    }
  ]
}
```

## Error Handling

The application:
- Checks the robots.txt file before starting scraping
- Handles connection and navigation errors
- Automatically creates necessary folders
- Displays detailed error messages if problems occur

## Notes

- Respect the terms of use of edifactory.de
- Add appropriate delays between requests to avoid overloading the server
- Regularly check for specification updates

## License

ISC