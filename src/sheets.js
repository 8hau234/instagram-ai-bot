const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const fs = require('fs');
const path = require('path');

let creds;
const credsPath = path.join(__dirname, '../google-credentials.json');

// Support both local JSON file and Render Environment Variables
if (fs.existsSync(credsPath)) {
    creds = require(credsPath);
} else {
    creds = {
        client_email: 'bot-sheets@insta-bot-498910.iam.gserviceaccount.com',
        // Replaces literal string \n with actual newlines when read from Render Env Vars
        private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.trim().replace(/\\n/g, '\n') : null
    };
    if (!creds.private_key) console.error('CRITICAL: GOOGLE_PRIVATE_KEY is empty or missing!');
}

// Initialize auth
const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
  ],
});

const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID, serviceAccountAuth);

/**
 * Saves an order to the Google Sheet.
 * @param {string} name - Customer Name
 * @param {string} phone - Customer Phone Number
 * @param {string} orderDetails - What they want to order
 * @param {string} callTime - When they want to book a call
 */
async function saveOrderToSheet(name, phone, orderDetails, callTime = 'Not specified') {
    try {
        await doc.loadInfo(); // loads document properties and worksheets
        console.log(`Connected to Sheet: ${doc.title}`);
        
        let sheet = doc.sheetsByIndex[0]; 
        
        try {
            // Attempt to load existing headers
            await sheet.loadHeaderRow();
        } catch (err) {
            // If it throws an error, the sheet is completely blank. Set the headers!
            await sheet.setHeaderRow(['Date', 'Name', 'Phone', 'Order Details', 'Call Time', 'Status']);
        }

        // Append the new order row
        const newRow = await sheet.addRow({
            'Date': new Date().toLocaleString(),
            'Name': name,
            'Phone': phone,
            'Order Details': orderDetails,
            'Call Time': callTime,
            'Status': 'New'
        });

        console.log('Successfully saved new order row to Google Sheets!');
        return true;
    } catch (error) {
        console.error('Failed to save to Google Sheets:', error);
        return false;
    }
}

module.exports = {
    saveOrderToSheet
};
