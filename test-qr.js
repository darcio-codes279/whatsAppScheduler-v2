const https = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/whatsapp/qr',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Response status:', res.statusCode);
      console.log('Has QR:', response.hasQr);
      console.log('QR Code length:', response.qrCode ? response.qrCode.length : 'N/A');
      console.log('QR Data URL present:', !!response.qrDataUrl);
      console.log('Raw QR present:', !!response.rawQr);

      if (response.rawQr) {
        console.log('Raw QR preview:', response.rawQr.substring(0, 100));
        console.log('Raw QR starts with expected format:', response.rawQr.startsWith('1@') || response.rawQr.includes('whatsapp'));
        console.log('Raw QR length:', response.rawQr.length);
      }

      if (response.qrCode) {
        // Check if it's a valid base64 string
        const isValidBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(response.qrCode);
        console.log('Is valid base64:', isValidBase64);

        // Check if it starts with expected WhatsApp QR format
        try {
          const decoded = Buffer.from(response.qrCode, 'base64').toString();
          console.log('QR Code starts with expected format:', decoded.startsWith('1@') || decoded.includes('whatsapp'));
        } catch (e) {
          console.log('Could not decode base64 as text');
        }
      }

      if (response.message) {
        console.log('Message:', response.message);
      }
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.end();