const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// DM Software teal terminal mark
// We use a clean viewBox of 0 0 100 100 with the terminal window centered and transparent margins
// Outer terminal body: #036a6e (signature brand teal)
// Prompt (> and _): #ffffff (crisp white)
// Canvas: 100% TRANSPARENT (no white square box)
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="dm-teal" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#04787d" />
      <stop offset="100%" stop-color="#025659" />
    </linearGradient>
  </defs>
  <!-- Rounded Terminal Window Body -->
  <path d="M86.736,21H14.44C12.864,21,5,21.764,5,29.948v40.893C5,79.025,13.58,79,15.142,79h69.474C86.178,79,95,79.025,95,69.767V30.65C95,21.764,88.3,21,86.736,21z" fill="url(#dm-teal)" />
  <!-- Crisp Terminal Prompt: > and _ -->
  <path d="M41.315,50.373L17.149,61.468c-1.247,0.587-2.723,0.027-3.296-1.22c-0.144-0.344-0.215-0.688-0.215-1.031c0-0.947,0.53-1.85,1.447-2.265l19.321-8.873L15.1,39.092c-1.247-0.573-1.792-2.064-1.205-3.311c0.416-0.902,1.319-1.433,2.251-1.433c0.344,0,0.702,0.072,1.046,0.229l24.108,11.278C41.816,46.085,42.203,47,42.448,47h0.014c0.029,0,0.057,0.073,0.071,0.132C43.107,48.363,42.562,49.799,41.315,50.373z M80.66,69.693c-0.072,0.101-0.158,0.202-0.259,0.272c-0.015,0.03-0.043,0.059-0.085,0.086c-0.03,0.029-0.059,0.043-0.088,0.073c-0.1,0.085-0.214,0.171-0.343,0.243c-0.473,0.271-1.033,0.429-1.635,0.429l-31.303,0.072c-1.619,0-2.924-1.118-2.938-2.494c0-0.688,0.329-1.304,0.86-1.763c0.53-0.445,1.247-0.717,2.064-0.731l31.304-0.072c1.605,0,2.924,1.118,2.924,2.494C81.161,68.819,80.976,69.293,80.66,69.693z" fill="#ffffff" />
</svg>`;

async function run() {
  const svgBuf = Buffer.from(svgContent);

  // Write SVG favicons
  fs.writeFileSync('public/favicon.svg', svgContent);
  fs.writeFileSync('src/app/icon.svg', svgContent);
  fs.writeFileSync('public/brand/logomark.svg', svgContent);

  // Generate crisp transparent PNGs:
  // 1. 32x32 transparent PNG
  const png32 = await sharp(svgBuf)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 2. 48x48 transparent PNG
  const png48 = await sharp(svgBuf)
    .resize(48, 48, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 3. 180x180 Apple touch icon
  const png180 = await sharp(svgBuf)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 4. 192x192 Android / PWA
  const png192 = await sharp(svgBuf)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // 5. 512x512 High-res
  const png512 = await sharp(svgBuf)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  // Write PNG files (replacing the old white square ones)
  fs.writeFileSync('public/favicon.png', png48);
  fs.writeFileSync('public/icon-192.png', png192);
  fs.writeFileSync('public/apple-touch-icon.png', png180);

  fs.writeFileSync('src/app/icon.png', png48);
  fs.writeFileSync('src/app/apple-icon.png', png180);

  // Write ICO file (standard multi-size ICO or 32x32 PNG as ico)
  // Most modern browsers accept PNG-encoded ICO
  fs.writeFileSync('public/favicon.ico', png32);
  fs.writeFileSync('src/app/favicon.ico', png32);

  console.log('All favicons successfully generated with transparent background and crisp vectors!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

