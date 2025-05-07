# FASTS3 - Event Management System [Demo Video](https://www.youtube.com/watch?v=5e69Yg-t4wo)

A secure and scalable event management system that provides location-based storage solutions for various events like weddings, group trips, and gatherings.

## Features

- **Event-Specific Storage**: Each event gets its own dedicated storage space
- **Secure Access**: Individual username/password authentication for each event
- **QR Code Access**: Easy sharing through QR codes for event participants
- **Multi-Instance Support**: Run multiple events simultaneously with unique ports
- **Cloud Storage**: AWS S3 integration for reliable file storage
- **Responsive Design**: Modern UI that works on all devices

## Tech Stack

- **Backend**: Node.js
- **Frontend**: HTML5, CSS, JavaScript
- **Cloud Services**: AWS S3, AWS Server
- **Scripting**: BASH

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- AWS Account with S3 access
- BASH shell

### Installation

1. Clone the repository:
```bash
git clone https://github.com/mraposka/FastS3
```

2. Change ip address to your aws web server(SERVER_IP):
```bash
nano deploy.sh
```

3. Run deployment script:
```bash
sudo bash deploy.sh
```

## Usage

1. Deploy a new event:
   - The system will create a dedicated folder
   - Enter your unique S3 access credentials
   - Assign a specific port

2. Share access:
   - Use the generated QR code
   - Share credentials with event participants

3. Access files:
   - Scan QR code or use URL
   - Login with provided credentials
   - Upload and manage event files

## Security

- Each event has isolated storage
- Unique authentication per event
- Secure AWS S3 integration
- Port-based isolation
