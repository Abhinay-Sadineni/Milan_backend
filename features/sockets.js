import { createServer } from "http";
import { google } from 'googleapis';
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import bodyParser from "body-parser";
import { Server } from "socket.io";
import url from 'url';
//get environment variables
dotenv.config();

// Use path module for __dirname
dotenv.config();
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: __dirname + '../.env' });


const keyfile = JSON.parse(process.env.google_sheet_credentials);


const auth = new google.auth.GoogleAuth({
  credentials: keyfile,
  scopes: "https://www.googleapis.com/auth/spreadsheets"
});


const startServer = async () => {
  //create client instance for auth
  const client = await auth.getClient();
  //created instance of google sheets api
  const googlesheets = google.sheets({ version: 'v4', auth: client });

  //create an express app
  const app = express();
  app.use(express.json());
  const httpServer = createServer(app);

  //declarations and google api instances completed

  //get request to get data from google sheets


  //read sheets function
  //get data from google sheets
  const get_live_score = async (spreadsheetId, trange) => {
    console.log('getting data from google sheets')
    try {
      let score_table = [];

      const getRows = await googlesheets.spreadsheets.values.get({
        auth: auth,
        spreadsheetId: spreadsheetId,
        range: trange,
        majorDimension: 'COLUMNS'
      });



      score_table = getRows.data.values;
      //convert event array into array of objects
      score_table = score_table.map((row) => {
        return {
            team_name : row[0],
            sports_score : row[1],
            culty_score :row[2],
            tech_score : row[3],
            total_score : row[4]
        };
      });

      return score_table;
    } catch (error) {
      console.error('error', error.message ,"inside get_live_score");
    }
  };

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    }
  });

  io.on("connection", async (socket) => {
      //print in console when new user connected
      console.log('new user connected', socket.id);

   
    try {
      //get data from google sheets
      const range = 'LEADERBOARD!A1:M5';
      const score_table = await get_live_score(process.env.Live_id, range) || [];


      //send data to client
      console.log('sending data to client', socket.id);
      socket.emit('score_table', score_table);
    } 
     catch (error) {
      console.error('error', error.message);
     }

     //listen to events
     //IF THERE IS A UPDATE IN GOOGLE SHEETS
    //update the data in the client side
   socket.on('update_score', async () =>{
    console.log('update occured', socket.id);
    try {
      //get data from google sheets
      const range = 'LEADERBOARD!A1:M5';
      const score_table = await get_live_score(process.env.Live_id, range) || [];


      //send data to client
      console.log('sending data to client', socket.id);
      socket.emit('score_table', score_table);
    } 
    catch (error) {
      console.error('error', error.message);
    }
   } )

  });

    

  httpServer.listen(3000, () => {
    console.log("Server is running on port 3000");
  });
};

// Start the server
startServer();
