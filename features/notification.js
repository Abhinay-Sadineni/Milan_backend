import schedule from 'node-schedule'
import sendMail from './mailer.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import * as url from 'url';


//intialize an events array to store the events from the sheet
let events = []

//get environment variables
dotenv.config();
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: __dirname + '../.env' });

const keyfile = JSON.parse(process.env.google_sheet_credentials);


const auth = new google.auth.GoogleAuth({
  credentials: keyfile,
  scopes: "https://www.googleapis.com/auth/spreadsheets"
});


//create client instance for auth 
const client = await auth.getClient();
//created instance of google sheets api
const googlesheets = google.sheets({version : 'v4' ,auth: client});

//create an auth client instance for gmail api
const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN }); 


//function to get events from the sheet
const getevents = async (spreadsheetId,range) => {

    try {
        const getRows =await googlesheets.spreadsheets.values.get({
            auth :auth,
            spreadsheetId:spreadsheetId,
            range: range
            })
         events = getRows.data.values;
         //convert event array into array of objects
         events = events.map((event) => {
                return {
                    name: event[0],
                    supporting_teams:event[1].split(','),
                    start_time: new Date(event[2])
                }
        })

    } 
    catch (error) {
        console.error('error',error.message)
    }
    

}



//for every update one hour the events array  
const job = schedule.scheduleJob('0 * * * *', async function (pool) {

    //fetch the events from the sheet and update the events array
    const range = 'Sheet1!A2:C';
    const spreadsheetId = process.env.SPREADSHEET_ID;
    await getevents(spreadsheetId,range)

    events.sort((a,b) => a.start_time - b.start_time)

          //write the remaining code here
          const now = new Date();
          const minTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
          const maxTime = new Date(now.getTime() + 75 * 60 * 1000); // 1 hour from now

          //get tevents which are within onw hour from now
          events=events.filter((event) => {
            return event.start_time > minTime && event.start_time <= maxTime;
          }

          )
          
            
          //send mail to all the supporting teams of the each event with the event details and at 15 minutes before the event
           events.forEach((event) => {
                    
            let recipients = new Set(); // Use a Set to store unique email addresses

            event.supporting_teams.forEach((team) => {
                const email_query = 'SELECT email FROM ' + team + '_supporters';
                const data = pool.query(email_query);
                const emails = data.rows.map((row) => row.email);
                
                // Add the retrieved emails to the Set
                emails.forEach((email) => {
                    recipients.add(email);
                });
            });
            
            // Convert the Set back to an array if needed
            recipients = Array.from(recipients);
               
            const mailDetails = {
                    from: 'abhinay.sadineni@gmail.com',
                    to: recipients.join(', '),
                    subject: 'Event Reminder',
                    text: `Event ${event.name} is scheduled at ${event.start_time}`,
                    html: `<h1>Event ${event.name} is scheduled at ${event.start_time} </h1>`
                    
                }
                //schedule the mail to be sent at the time of event befor 15 minutes
                const send_time = event.start_time;
                send_time.setMinutes(event.start_time.getMinutes() - 15)

                const job=  schedule.scheduleJob(send_time,  async function () {
                        const result = await sendMail(mailDetails, oAuth2Client)
                        console.log('email sent:',result.messageId)
                        
                })
            })


})



export default job;










