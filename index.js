import sendMail from './features/mailer.js'
import { google } from 'googleapis';
import dotenv from 'dotenv';
import * as url from 'url';

//get environment variables
dotenv.config();
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
dotenv.config({path: __dirname+'./.env' });

//create an auth client instance for google api
const oAuth2Client = new google.auth.OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, process.env.REDIRECT_URI);
oAuth2Client.setCredentials({ refresh_token: process.env.REFRESH_TOKEN }); 



const mailingList=['cs21btech11055@iith.ac.in']

const to_list= mailingList.join(',')

const mailDetails = {
    from: 'ABHINAY SADINENI <abhinay.sadineni@gmail.com>',
    to:to_list,
    subject: 'Test mail',
    text: 'Node.js testing mail for localhost',
    html: '<h1>Node.js testing mail for localhost inside index js</h1>'
}


sendMail(mailDetails,oAuth2Client)
.then((result) => console.log('Email sent...', result))
.catch((error) => console.log(error.message));





