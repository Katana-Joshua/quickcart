const fs = require('fs');
const path = require('path');

/**
 * Simple utility to convert an image file to base64
 * Usage: node convert_image_to_base64.js <image_path> [output_file]
 * 
 * If output_file is provided, saves base64 to file
 * Otherwise, prints to console
 */

const args = process.argv.slice(2);

if (args.length < 1) {
  console.log('Usage: node convert_image_to_base64.js <image_path> [output_file]');
  console.log('\nExample:');
  console.log('  node convert_image_to_base64.js ./image.jpg');
  console.log('  node convert_image_to_base64.js ./image.jpg base64.txt');
  process.exit(1);
}

const imagePath = args[0];
const outputFile = args[1];

if (!fs.existsSync(imagePath)) {
  console.error(`Image file not found: ${imagePath}`);
  process.exit(1);
}

try {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64String = imageBuffer.toString('base64');
  
  const fileInfo = {
    path: imagePath,
    size: (imageBuffer.length / 1024).toFixed(2) + ' KB',
    base64Length: base64String.length,
    base64Preview: base64String.substring(0, 50) + '...'
  };

  console.log('Image Conversion Complete:');
  console.log('  File:', fileInfo.path);
  console.log('  Size:', fileInfo.size);
  console.log('  Base64 Length:', fileInfo.base64Length, 'characters');
  console.log('  Preview:', fileInfo.base64Preview);
  console.log('');

  if (outputFile) {
    fs.writeFileSync(outputFile, base64String);
    console.log(`✓ Base64 string saved to: ${outputFile}`);
    console.log('\nYou can now use this in SQL:');
    console.log(`UPDATE products SET image_data = '${base64String.substring(0, 50)}...' WHERE id = 1;`);
  } else {
    console.log('Base64 String:');
    console.log('─'.repeat(80));
    console.log(base64String);
    console.log('─'.repeat(80));
    console.log('\nCopy the above string and use it in SQL:');
    console.log(`UPDATE products SET image_data = '${base64String.substring(0, 50)}...' WHERE id = 1;`);
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}

