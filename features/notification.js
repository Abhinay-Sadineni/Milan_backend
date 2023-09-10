import schedule from 'node-schedule'
import sendMail from './mailer.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import * as url from 'url';
import pkg from 'pg';


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
                    supporting_teams: event[1].toLowerCase().split(','),
                    start_time: new Date(event[2])
                }
        })

    } 
    catch (error) {
        console.error('error',error.message)
    }
    

}

const { Pool } = pkg;
const pool = new Pool({
    user: 'postgres',
    password: 'root',
    host: 'localhost',
    database: 'milan',
    port: 5432,
});
pool.connect()



// ...

const job = schedule.scheduleJob('*/15 * * * *', async function () {
    const range = 'Sheet1!A2:C';
    const spreadsheetId = process.env.SPREADSHEET_ID;

    await getevents(spreadsheetId, range);

    events.sort((a, b) => a.start_time - b.start_time);

    const now = new Date();
    const minTime = new Date(now.getTime() + 15 * 60 * 1000);
    const maxTime = new Date(now.getTime() + 29 * 60 * 1000);

    events = events.filter((event) => {
        return event.start_time > minTime && event.start_time <= maxTime;
    });

    console.log(events);

    const emailPromises = events.map(async (event) => {
        let recipientsArray = [];
        // Create a parameterized query
        const queryText = `
            SELECT DISTINCT u.email
            FROM users u
            JOIN prefered_event pe ON u.user_id = pe.user_id
            JOIN events e ON pe.prefered_event_id = e.event_id
            JOIN supporting_teams st ON u.user_id = st.user_id
            WHERE e.event_name = $1
            AND st.supporting_team_name = ANY($2::text[])
        `;
        
        // Execute the query
        pool.query(queryText, [event, teamsParticipating], (error, result) => {
            if (error) {
                console.error('Error executing query:', error);
            } else {
                const emails = result.rows.map((row) => row.email);
                recipientsArray.push(...emails);
            }
        });
        


        if (recipientsArray.length > 0) {
            console.log(recipientsArray);

            const mailDetails = {
                from: 'abhinay.sadineni@gmail.com',
                to: recipientsArray.join(', '),
                subject: 'Event Reminder',
                text: `Event ${event.name} is scheduled at ${event.start_time}`,
                html: `<h1>Event ${event.name} is scheduled at ${event.start_time} </h1>`
            };

            const send_time = event.start_time;
            send_time.setMinutes(event.start_time.getMinutes() - 15);

            return schedule.scheduleJob(send_time, async function () {
                const result = await sendMail(mailDetails, oAuth2Client);
                console.log('email sent:', result.messageId);
            });
        }
    });

    await Promise.all(emailPromises);
});


export default job;










