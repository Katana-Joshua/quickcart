const fs = require('fs');
const path = require('path');

/**
 * Convert an image file to base64 string
 * @param {string} imagePath - Path to the image file
 * @returns {string} Base64 encoded image string
 */
function imageToBase64(imagePath) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return null;
  }
}

/**
 * Convert base64 string to image buffer (for saving files)
 * @param {string} base64String - Base64 encoded image string
 * @param {string} outputPath - Path to save the image file
 */
function base64ToImage(base64String, outputPath) {
  try {
    const imageBuffer = Buffer.from(base64String, 'base64');
    fs.writeFileSync(outputPath, imageBuffer);
    return true;
  } catch (error) {
    console.error('Error converting base64 to image:', error);
    return false;
  }
}

module.exports = {
  imageToBase64,
  base64ToImage
};

