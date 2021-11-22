// Scripts for ENDEAVR Booth

// Script properties store booth meeting url, updated daily
var props = PropertiesService.getScriptProperties();
let endeavrBooth = 'booth@endeavr.city';
var boothStaffGroup = "booth-operators@endeavr.city";
var permanentBoothStaff = [{"email": boothStaffGroup}] // used for building calendar event (needs array of JSON objects)

secretsId = "1m2pxwcB542VDeeMtaMP_sROX86DMSqSz0ahmTzWwB4g"

let calendarId = 'primary';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Kiosk');
}

function getBoothMeetingUrl() {
  // returns booth meeting URL to be opened by HTML kiosk in Kiosk.html

  var ss = SpreadsheetApp.openById(secretsId)
  return ss.getSheetByName('Secrets').getRange('B5').getValue()
}

function createBoothMeeting() {
  // Runs automatically every morning, creating a new meeting URL each day for security
  // and attaching to a new booth calendar event

  var d = new Date();
  
  console.log("creating new Booth meeting " + d);

  // Create calendar event from 6am to 6pm
  var startDate = new Date(d.toLocaleDateString());
  startDate.setHours(6);
  var start = startDate.toJSON(); // date readable by Google Calendar

  var endDate = new Date(d.toLocaleDateString());
  endDate.setHours(18);
  var end = endDate.toJSON();

  try {
    // build calendar event
    var payload = {
      "calendarId": calendarId,
      "conferenceDataVersion": 1,
      "maxAttendees": 10,
      "summary": 'ENDEAVR Telemedicine Booth - ' + d.toLocaleDateString(),
      "description": 'All Telemedicine Visits on this day for ENDEAVR Patients in the Booth will occur through this Meet call.'
        + '\nWhile you are seeing the patient, you can perform remote diagnostics using ENDEAVR devices such as the digital throatscope, otoscope, and stethoscope. These data can be accessed during the session from your RDD Folder.\nSee email for more details.',
      "end": {
        "dateTime": end,  
        "timeZone": "America/Chicago"
      },
      "start": {
        "dateTime": start,
        "timeZone": "America/Chicago" //Los_Angeles, New_York
      },
      "conferenceData": {
        "createRequest": {
          "conferenceSolutionKey": {
            "type": "hangoutsMeet"
          },
          "requestId": "req" + d    //this needs to be unique on every request
        }
      },
      "transparency": "transparent",

      "attendees": permanentBoothStaff
    }
    
    
    //Create Google Meet Meeting
    const args = { "conferenceDataVersion": 1 }
    
    const response = Calendar.Events.insert(payload, calendarId, args)
    console.log("Success! " + response)
    var meetingUrl = response.conferenceData.entryPoints[0].uri;
    console.log("New calendar event ID: " + response.id);
    console.log("New Booth meeting created: " + meetingUrl);
    
    props.setProperty('eventId', response.id)

    // Update Operator Spreadsheet
    SpreadsheetApp.openById('1m2pxwcB542VDeeMtaMP_sROX86DMSqSz0ahmTzWwB4g').getSheetByName('Secrets').getRange('B5').setValue(meetingUrl)

  } catch(e) {
    console.log("Oh no: " + e.message);
  }
}

function createBoothMeetingForDoctor(patientResponses) {
  // Create calendar event shared with doctor containing the Booth Meet link attached to the event
  
  // Use ID and label to attach existing Meet call to calendar event
  boothMeetingUrl = getBoothMeetingUrl();
  boothMeetingId = boothMeetingUrl.substring(24);
  boothMeetingLabel = boothMeetingUrl.substring(8);
  
  console.log("Creating booth event for " + doctor.getName());

  // Set start and end time for calendar event
  var d = new Date();
  let appointmentLength = 60; // minutes
  var start = d.toJSON();
  var endTime = d.getTime() + appointmentLength * 60000;
  var d2 = new Date(endTime);
  var end = d2.toJSON(); // date readable by Google Calendar

  // Each doctor has their own sheet with their own patients, as well as an RDD folder for real-time vitals to be shared
  var dataFile = DriveApp.getFileById(doctor.destinationId);
  var rddFolder = DriveApp.getFileById(doctor.rddId);

  var payload = {
    "calendarId": "primary",
      "conferenceDataVersion": 1,
      "maxAttendees": 10,
      "sendUpdates": "all",
      "summary": 'ENDEAVR Telemedicine ' + patientResponses[1].trim().substring(0,3).toUpperCase() + ' - ' + doctor.getName(),
      "description": 'Booth Telemedicine Visit with New ENDEAVR Patient\nCheck email for more information.\n'
        + 'Patient Intake Data:\n' + doctor.destinationUrl
        + '\nWhile you are seeing the patient, you can perform remote diagnostics using ENDEAVR devices such as the digital throatscope, otoscope, and stethoscope. These data can be accessed instantly during the session from the following link:\n' + doctor.rddUrl,
      "end": {
        "dateTime": end,  
        "timeZone": "America/Chicago"
      },
      "start": {
        "dateTime": start,
        "timeZone": "America/Chicago" //Los_Angeles, New_York
      },
      "conferenceData": {
        "conferenceId": boothMeetingId,
        "conferenceSolution": {
          "key": {
            "type": "hangoutsMeet",
            "name": doctor.name + " For Telemedicine Appointment"
          }
        },
        "entryPoints": [ // An array of objects. It accepts one video type.
        {
          "entryPointType": "video",
          "label": boothMeetingLabel,
          "uri": boothMeetingUrl
        }],
      },
      "attachments":[
        {fileId: doctor.destinationId, fileUrl: dataFile.getUrl(), mimeType: dataFile.getMimeType(), title: dataFile.getName()},
        {fileId: doctor.rddId, fileUrl: rddFolder.getUrl(), mimeType: rddFolder.getMimeType(), title: rddFolder.getName()}
        ],

      "attendees": [{"email": doctor.email}]
  }

  const args = {"conferenceDataVersion": 1, supportsAttachments: true};

  try {
        var response = Calendar.Events.insert(payload, calendarId, args)
        console.log(`Success! ${response}`)
  } catch(e) {
    console.log(`Oh no: ${e.message}`)
  }
}

function sendBoothMail(patientResponses) {
  let meetingURL = getBoothMeetingUrl();

  let htmlbody = createBoothHTMLBody(meetingURL, patientResponses);

  var blob = UrlFetchApp.fetch("https://i.postimg.cc/m2bXVsCY/ENDEAVR-main-logo.png").getBlob();
  var bccList = boothStaffGroup;

  GmailApp.sendEmail(doctor.email, "ENDEAVR Telemedicine Booth Appointment is Ready! (PHI Enclosed)",
    "Hello " + doctor.getName() + ",\n\n"
    + "An ENDEAVR patient (" + patientResponses[1].trim() + ") is waiting for your appointment to begin immediately. Please see the patient using the following link:\n\n"
    + meetingURL + "\n\n"
    + "Please visit the following link to access the patient’s intake form data including vital signs and symptom descriptions. Please make sure you are signed in to " + doctor.email + " in order to access it:\n\n"
    + doctor.destinationUrl + "\n\n"
    + "While you are seeing the patient, you can perform remote diagnostics using ENDEAVR devices such as the digital throatscope, otoscope, and stethoscope. These data can be accessed instantly during the session from the following link:\n\n"
    + doctor.rddUrl + "\n\n"
    + "Thanks,\nENDEAVRide\nSelf-Driving Service of, by, for the people\n\n",
    {htmlBody: htmlbody, inlineImages: {image: blob}, name:'ENDEAVR Institute', bcc:bccList}
    );
  console.log("Booth appointment email sent to doctor");
}


function createBoothHTMLBody(meetingURL, patientResponses) {
  // Creates a custom email with HTML formatting to send to the doctor to inform them that a patient is waiting
  // for them, and provide a link to join

  var output = "<HTML><BODY><P style=\"font-family:'Times New Roman';font-size:18px\">"
  + "Hello " + doctor.getName() + ",<BR><BR>"
  + "An ENDEAVR Booth patient (<B>" + patientResponses[1].trim() + "</B>) is waiting for your appointment to begin <B><U>immediately</U></B>. Please see the patient using the following link:<BR><BR>"
  + "<A target=_blank href=\"" + meetingURL + "\">" + meetingURL + "</A><BR><BR>"
  + "Please visit the following link to access the <B>patient’s intake form data</B> including vital signs and symptom descriptions. Please make sure you are signed in to <B>" + doctor.email + "</B> in order to access it:<BR><BR>"
  + "<A target=_blank href=\"" + doctor.destinationUrl + "\">" + doctor.destinationUrl + "</A><BR><BR>"
  + "While you are seeing the patient, you can perform <B>remote diagnostics</B> using ENDEAVR devices such as the digital throatscope, otoscope, and stethoscope. These data can be accessed instantly during the session from the following link:<BR><BR>"
  + "<A target=_blank href=\"" + doctor.rddUrl + "\">" + doctor.rddUrl + "</A><BR><BR>"
  + "If you run into any problems, please call 1-844-ENDEAVR (363-3287).<BR><BR>"
  + htmlEmailSignature + "</P></BODY></HTML>";

  return output;
}

function sendTexts() {
  var pass = SpreadsheetApp.openById(secretsId).getSheetByName('Secrets').getRange('B4').getValue()
  if (pass == null) {
    console.error("Could not retrieve Service Password")
    return
  }
  console.log("Sending texts to operators")
  data = {
    'password': pass
  };
  token = ScriptApp.getOAuthToken()
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': {Authorization: 'Bearer ' + token},
    'payload': JSON.stringify(data)
  };
  try {
    var resp = UrlFetchApp.fetch("https://script.google.com/a/macros/endeavr.city/s/AKfycbwSO2DP4TLnSMlbX_QOWK8PuSbWBRKpnrbrJihd8tDUjF1UEXnrV3XeW0c80WfX4I2c/exec", options);
    // var resp = UrlFetchApp.fetch("https://script.google.com/a/macros/endeavr.city/s/AKfycbys5BcEbAY3bo6FVcHBwoYM3RcYeoujoJQzJfbM3t8/dev", options);
    console.log("Response from text service: " + resp)
  } catch(e) {
    console.error(e)
  } 
}








