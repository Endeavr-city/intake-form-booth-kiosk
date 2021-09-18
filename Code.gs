/*
These scripts were created by Kunal Gupta for ENDEAVR and its subsidiary ENDEAVRide,
to automate the telemedicine process for users of the autonomous telemedicine van
and telemedicine booth located in Nolanville, TX.
*/

/*
Form responses:
B: Patient name
C: Birth date
D-G: Patient address/contact
H: Doctor
I-O: Vitals
P-R: Medications and Kidney/Liver
S-AA: Problems
*/

let doctorSelectionColumn = 7; // Column H contains the name of the selected doctor

class Doctor {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }

  getName() {
    // Returns doctor's last name with "Dr. " prefix
    var words = this.name.split(' ');
    return "Dr. " + words[words.length-1];
  }
}
class EndeavrDoctor extends Doctor {
  constructor(obj) {
    super(obj.name, obj.email);
    Object.assign(this, obj);
    /*
    destinationUrl,
    rddUrl,
    destinationId,
    rddId
    */
  }
}

// Doctor objects - defined in Doctors.gs
// const drwong
// const drcolon
// const kunal
// var admin = engineers;
// var doctor = admin;
// doctor is a global variable used to store the selected doctor
// admin is used to store the admin for script testing

let endeavrEmail = 'ride@endeavr.city';
let endeavrPatient = 'patient@endeavr.city';

// email signature used in emails sent to doctors, containing HTML formatting for logo image
var htmlEmailSignature = "Thank you for your service!<BR>ENDEAVR Telemedicine Team<BR>" + '<A href="https://endeavr.city" target="_blank"><img src="cid:image" style=\'width:280px\'></A><BR>'

var ss = SpreadsheetApp.getActiveSpreadsheet(); // Patient Intake - Master

function onFormSubmit(e){
  Utilities.sleep(1000);
  console.log("onFormSubmit called");
  /*
  When a form is submitted:
    1. Determine which doctor they selected
    2. Copy the form responses (containing PHI) into the sheet that is shared with that doctor
    3. Determine whether the patient is in the van or the booth
      a. If in van, create a new Google Meet and send a formatted email to the doctor
      b. If in booth, create a Calendar event with existing Booth Meet call, and send a formatted email to them
  */
  
  var values = e.values;
  
  chooseDoctor(values[doctorSelectionColumn]);
  if (!doctor) {
    throw "No doctor selected";
  }
  
  copyData();

  var sheetName = ss.getActiveSheet().getName(); // Active sheet is the sheet that form responses were sent to
  var meetingUrl;
  if (sheetName == 'Van Patients') {
    meetingUrl = createMeeting(values);   // create new Meet and share with doctor
    sendVanMail(meetingUrl, values);
  }
  else if (sheetName == 'Booth Patients') {
    createBoothMeetingForDoctor(values);  // create new event with existing Meet link and share with doctor
    sendBoothMail(values);
  }
  else {
    throw 'No active sheet found';
  }

  console.log("onFormSubmit complete");
}

function chooseDoctor(selection) {
  // sets global doctor variable to appropriate doctor depending on selection made in values[doctorSelectionColumn]

  if (selection) {
    if (selection.includes('Wong')) {
      doctor = drwong;
    } else if (selection.includes('Colon')) {
      doctor = drcolon;    
    } else if (selection.includes('Admin')){
      doctor = admin;
      boothStaffGroup = "";
    } else {
      doctor = null;
    }
  }

  console.log(doctor.getName() + ' was selected');
}

function copyData() {
  // Copies the most recently submitted form data into separate spreadsheet shared with appropriate doctor

  var sourceRange = ss.getActiveSheet().getActiveRange();
  var sourceValues = sourceRange.getValues();

  let destination = SpreadsheetApp.openByUrl(doctor.destinationUrl).getActiveSheet();

  destination.appendRow(sourceValues[0]);

  console.log('Data copied into sheet shared with ' + doctor.getName());
}





