import moment from 'moment';
import * as db from "../DB/connection.js";
import UserLog from '../DB/models/UserLog.js'; // Adjust the path as necessary
export const executeQuery = (query, values) => {
  return new Promise((resolve, reject) => {
    db.query(query, values, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
};

export const sortByValue = (sortBy) => {
  //console.log("sortBy",sortBy);
  let sortOnValue
  if (sortBy === "popularity") {
    sortOnValue = "toppics_ranking desc"
  } else if (sortBy === "new-arrivals") {
    sortOnValue = "newarrival_ranking desc"
  } else if (sortBy === "price-low-to-high") {
    sortOnValue = "final_price asc"
  } else if (sortBy === "price-high-to-low") {
    sortOnValue = "final_price desc"
  } else if (sortBy === "discount") {
    sortOnValue = "discount_percent desc"
  } else if (sortBy === "ranking") {
    sortOnValue = "ranking asc"
  } else {
    console.log("no action as invalid sort by parameter")
    sortOnValue = "created_at desc"
  }
  return sortOnValue
};

export const validateCuratedData = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next(); // Move to the next middleware or route handler
};

export const validateProductData = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next(); // Move to the next middleware or route handler
};
export const generateUniqueNumber = () => {
  let number;
  do {
    number = Math.floor(Math.random() * 10000); // Generate a random number between 0 and 9999
  } while (number.toString().length !== 4); // Ensure the length is exactly 4 digits
  return number;
}
// to generate the code for brand
export const generateUniqueBrandCode = async (name) => {
    // Remove numbers from the name
    let cleanedName = name.replace(/\d/g, '');

    // If the cleaned name is less than 3 characters, append 'zz' to make it three characters long
    //if (cleanedName.length < 3) {
      cleanedName += 'zzyyxxwwvvuuttssrrqqppoonnmm';
    //}
  let code = cleanedName.slice(0, 3).toUpperCase(); // Get the first three letters of the name as code
  let originalCode = code; // Store the original code for later use

  // Check if the code exists in the database
  let exists = await codeExistsInDB(code);

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
          exists = await codeExistsInDB(code);
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
export const codeExistsInDB = (code) => {
  return new Promise((resolve, reject) => {
    const selectQuery = `SELECT code FROM brands WHERE code='${code}'`;
    console.log(selectQuery)
    db.query(selectQuery, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result.length > 0 ? true : false);
      }
    });
  });
};
//category code generation
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
export const codeExistsInDBCategory = (code) => {
  return new Promise((resolve, reject) => {
    const selectQuery = `SELECT code FROM categories WHERE code='${code}'`;
    console.log(selectQuery)
    db.query(selectQuery, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result.length > 0 ? true : false);
      }
    });
  });
};
//end
export async function generateHtmlTemplate(htmlstr, htmobj) {
  //Preparing HTML Template
      // Building a regex like `/3|6|234/g`
      let re = new RegExp(Object.keys(htmobj).join("|"), "g");

      // Arrow function is approximately equivalent to
      // an anonymous function like `function(match) { return arr[match]; }`
      new_str = htmlstr.replace(re, (match) => htmobj[match]);
      //Preparing HTML Template
return new_str;
}

export async function addUserLogs(data) {
  try {
    const log = new UserLog(data);
    await log.save();
  } catch (error) {
    console.error('Error saving user log:', error);
  }
}

export async function timeAgo(date) {
  const now = moment();
  const reviewDate = moment(date);
  const duration = moment.duration(now.diff(reviewDate));
  const years = duration.years();
  const months = duration.months();
  const days = duration.days();
  const hours = duration.hours();
  const minutes = duration.minutes();
  const seconds = duration.seconds();
  if (years > 0) {
      return years === 1 ? '1 year ago' : `${years} years ago`;
  }
  if (months > 0) {
      return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  if (days > 0) {
      return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  if (hours > 0) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  if (minutes > 0) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  return seconds === 1 ? '1 second ago' : `${seconds} seconds ago`;
}