// Google Apps Script for Portfolio Contact Form
// Read the setup instructions provided by the AI to deploy this safely.

const SHEET_NAME = "Submissions";
const NOTIFICATION_EMAIL = "victoriaodueso06@gmail.com"; 

function doPost(e) {
  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = doc.getSheetByName(SHEET_NAME);
    
    // If the sheet doesn't exist, create it and add headers
    if (!sheet) {
      sheet = doc.insertSheet(SHEET_NAME);
      sheet.appendRow(["Timestamp", "Name", "Email", "Message"]);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold");
    }

    // Parse the data (supports both JSON payload and form data)
    let name, email, message;
    
    if (e.postData.type === "application/json") {
      const parsedData = JSON.parse(e.postData.contents);
      name = parsedData.name || "Unknown";
      email = parsedData.email || "Unknown";
      message = parsedData.message || "No Message";
    } else {
      name = e.parameter.name || "Unknown";
      email = e.parameter.email || "Unknown";
      message = e.parameter.message || "No Message";
    }
    
    const timestamp = new Date();

    // 1. Save data to Google Sheets
    sheet.appendRow([timestamp, name, email, message]);

    // 2. Send Email Notification
    const emailSubject = `New Portfolio Contact Form Submission from ${name}`;
    const emailBody = `You have received a new message from your portfolio website.\n\n` +
                      `Name: ${name}\n` +
                      `Email: ${email}\n` +
                      `Date: ${timestamp}\n\n` +
                      `Message:\n${message}\n\n` +
                      `--\nThis message was automatically saved to your linked Google Sheet.`;
                      
    MailApp.sendEmail({
      to: NOTIFICATION_EMAIL,
      replyTo: email,
      subject: emailSubject,
      body: emailBody
    });

    // Return success response to the frontend
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Return error message if something fails
    return ContentService
      .createTextOutput(JSON.stringify({ "status": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
