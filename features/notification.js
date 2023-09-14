import schedule from 'node-schedule'
import sendMail from './mailer.js';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import * as url from 'url';
import pkg from 'pg';
import pgPromise from 'pg-promise';
import fs from 'fs';

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
const googlesheets = google.sheets({ version: 'v4', auth: client });

//create an auth client instance for gmail api
const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN });


//function to get events from the sheet
const getevents = async (spreadsheetId, range) => {

    try {
        const getRows = await googlesheets.spreadsheets.values.get({
            auth: auth,
            spreadsheetId: spreadsheetId,
            range: range
        })
        events = getRows.data.values;
        //convert event array into array of objects
        events = events.map((event) => {
            return {
                name: event[0],
                teamsParticipating: event[1].toLowerCase().split(',').map(team => team.trim()),
                start_time: new Date(event[2])
            }
        })

    }
    catch (error) {
        console.error('error', error.message)
    }
}

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
pool.connect()



// ...
const interval = 3
const job = schedule.scheduleJob(`*/${interval} * * * *`, async function () {
    console.log('running a task every 15 minutes');
    const range = 'Sheet1!A2:C';
    const spreadsheetId = process.env.SPREADSHEET_ID;

    await getevents(spreadsheetId, range);

    events.sort((a, b) => a.start_time - b.start_time);

    const now = new Date();
    const minTime = new Date(now.getTime() + interval * 60 * 1000);
    const maxTime = new Date(now.getTime() + (2 * interval) * 60 * 1000 - 1);

    events = events.filter((event) => {
        return event.start_time > minTime && event.start_time <= maxTime;
    });

    console.log(events);

    const emailPromises = events.map(async (event) => {
        // Create a parameterized query

        //if event team is ALL , then send email to all users
        if (event.teamsParticipating.includes('All')) {
            recipientsArray = [
                'BTech',
                'MTech',
                'PHD'
            ]
        }
        const queryText = `
        SELECT DISTINCT u.email
        FROM users u
        JOIN prefered_event pe ON u.user_id = pe.user_id
        JOIN events e ON pe.prefered_event_id = e.event_id
        JOIN supporting_teams st ON u.user_id = st.user_id
        WHERE e.event_name ILIKE $1
        AND st.supporting_team_name ILIKE ANY($2::text[]);
        `;
        const queryParams = [event.name, event.teamsParticipating];
        const completeQuery = pgPromise.as.format(queryText, queryParams);
        let recipientsArray = [];

        try {
            const result = await pool.query(completeQuery);
            const emails = result.rows.map((row) => row.email);
            recipientsArray.push(...emails);
            console.log('recipients: ', recipientsArray);

            const imagePath = __dirname + '/logocream.png';
            const imageData = fs.readFileSync(imagePath);
            const imageSrc = `https://drive.google.com/uc?export=view&id=1JZiD6fngGxj2NFwBrJrLjjxkuuW3WUp9`;

            const body = `
            <html>
        <head>
            <meta charset="UTF-8">
            <title>Join us in Milan!</title>
        </head>
        <body>
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                    <td align="center" bgcolor="#f4f4f4">
                        <table cellpadding="0" cellspacing="0" border="0" width="600" style="border-collapse:collapse;">
                            <tr>
                                <td align="center" bgcolor="#ffffff" style="padding: 40px 0 30px 0;">
                                    <img src="${imageSrc}" alt="Event Banner" width="300" height="150">
                                </td>
                            </tr>
                            <tr>
                                <td bgcolor="#ffffff" style="padding: 40px 30px 40px 30px;">
                                    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                                        <tr>
                                            <td style="color: #333333; font-family: Arial, sans-serif; font-size: 24px;">
                                                <strong>Join us in Milan!</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 20px 0 30px 0; color: #666666; font-family: Arial, sans-serif; font-size: 16px; line-height: 22px;">
                                                We're excited to invite you to our upcoming event in Milan. It's going to be a thrilling day filled with fun, games, and excitement!
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0 0 20px 0; color: #666666; font-family: Arial, sans-serif; font-size: 16px; line-height: 22px;">
                                                <strong>Event Details:</strong>
                                                <br>
                                                <strong>Name:${event.name}</strong> 
                                                <br>
                                                <strong>Time:${event.start_time}</strong> 
                                                <br>
                                                <strong>Participating teams:${event.teamsParticipating.join(',')}</strong>
                                                <br>
                                                <strong>Location:</strong>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="color: #666666; font-family: Arial, sans-serif; font-size: 16px; line-height: 22px;">
                                                Come and cheer for your team as they aim for victory. It's going to be an unforgettable experience!
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 30px 0 0 0; color: #666666; font-family: Arial, sans-serif; font-size: 16px; line-height: 22px;">
                                                <strong>RSVP:</strong>
                                                <br>
                                                We look forward to your participation. Please RSVP by [Insert RSVP Deadline].
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                            <tr>
                                <td bgcolor="#333333" style="padding: 20px 30px 20px 30px; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px; text-align: center;">
                                    © 2023 Milan Event. All rights reserved.
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>`

            if (recipientsArray.length > 0) {
                const mailDetails = {
                    from: 'abhinay.sadineni@gmail.com',
                    to: recipientsArray.join(', '),
                    subject: `Event Reminder MILAN 23: ${event.name} `,
                    html: body
                };

                console.log(mailDetails);

                const send_time = event.start_time;
                send_time.setMinutes(event.start_time.getMinutes() - interval);

                return schedule.scheduleJob(send_time, async function () {
                    const result = await sendMail(mailDetails, oAuth2Client);
                    console.log('email sent:', result.messageId);
                });
            }
        } catch (error) {
            console.error('Error executing query:', error);
        }
    });

    await Promise.all(emailPromises);
});


export default job;










