

/**
 * Generates a 3-character uppercase unique code based on brand name.
 * Adds 'Z' characters if the name is too short.
 * @param {string} brandName 
 * @returns {string}
 */
import Category from '../DB/models/category.js';
export const generateUniqueCode = (brandName = '') => {
  const cleanName = brandName.replace(/[^A-Z]/gi, '').toUpperCase();
  const code = (cleanName + 'ZZ').substring(0, 3);
  return code;
};
export const generateUniqueCategoryCode = async (name) => {
  // Remove numbers from the name
  let cleanedName = name.replace(/\d/g, '');

  // If the cleaned name is less than 3 characters, append 'zz' to make it three characters long
  //if (cleanedName.length < 3) {
    cleanedName += 'zzyyxxwwvvuuttssrrqqppoonnmm';
  //}
let code = cleanedName.slice(0, 3).toUpperCase(); // Get the first three letters of the name as code
let originalCode = code; // Store the original code for later use

// Check if the code exists in the database
let exists = await codeExistsInDBCategory(code);

// If the code exists, modify it until it's unique
while (exists) {
  console.log("loop")
    let modified = false;
    // Loop through each character of the name to generate the next character for the code
    for (let i = 3; i < cleanedName.length; i++) {
        // Get the next character from the name
        let nextChar = cleanedName[i].toUpperCase();
        console.log(nextChar);
        // Replace the last character of the code with the next character from the name
        code = code.slice(0, -1) + nextChar;
        // Check if the modified code exists in the database
        exists = await codeExistsInDBCategory(code);
        if (!exists) {
            modified = true;
            break; // Exit loop if a unique code is found
        }
    }
    // If all possible variations of the code are taken, throw an error
    if (!modified && code === originalCode) {
        throw new Error("Unable to generate a unique brand code.");
    }
}

return code;
}
export const codeExistsInDBCategory = async (code) => {
  try {
    const category = await Category.findOne({ code: code });
    return !!category; // true if found, false if not
  } catch (error) {
    throw error;
  }
};

/**
 * Cleans and formats a string for slug usage:
 * - Converts to lowercase
 * - Removes special characters
 * - Replaces spaces with hyphens
 * - Removes trailing hyphens
 * @param {string} inputString 
 * @returns {string}
 */
export const cleanString = async (inputString = '') => {
  if (typeof inputString !== 'string') return '';

  const lowerCase = inputString.toLowerCase();
  const alphanumericOnly = lowerCase.replace(/[^\w\s]/gi, '');
  const withHyphens = alphanumericOnly.replace(/\s+/g, '-');
  return withHyphens.replace(/-+$/, '');
};
