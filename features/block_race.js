import { google } from 'googleapis';
import dotenv from 'dotenv';
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


const startServer = async (io) => {
  //create client instance for auth
  const client = await auth.getClient();
  //created instance of google sheets api
  const googlesheets = google.sheets({ version: 'v4', auth: client });



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
      const header =score_table[0];
      header[0] = 'Team';
      let score_table_formatted = [];
      score_table_formatted = score_table.map((column) => {
          const temp = {};
          for(let i=0;i<column.length;i++){
            temp[header[i]] = column[i];
          }
          return temp;        
        });
       
      return score_table_formatted;
    } catch (error) {
      console.error('error', error.message ,"inside get_live_score");
    }
  };


  io.on("connection", async (socket) => {
      //print in console when new user connected
      console.log('new user connected', socket.id);

   
    try {
      //get data from google sheets
     //get data from google sheets
     const data_title =['LEADERBOARD','TECHY','CULTY','SPORTS_BOYS','SPORTS_GIRLS']
     const range = ['LEADERBOARD!A1:M5','TECHY!A1:M22','CULTY!A1:M22','SPORTS_BOYS!A1:M22','SPORTS_GIRLS!A1:M22'];
     let score_table ={} ;
     for (let i = 0; i < range.length; i++) {
       score_table[data_title[i]] = 
    await get_live_score(process.env.Live_id, range[i]) || []
       ;
   }


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
      const data_title =['LEADERBOARD','TECHY','CULTY','SPORTS_BOYS','SPORTS_GIRLS']
      const range = ['LEADERBOARD!A1:M5','TECHY!A1:M22','CULTY!A1:M22','SPORTS_BOYS!A1:M22','SPORTS_GIRLS!A1:M22'];
      let score_table ={} ;
      for (let i = 2; i < range.length; i++) {
        score_table[data_title[i]] = {
            [data_title[i]]: await get_live_score(process.env.Live_id, range[i]) || []
        };
    }
    


      //send data to client
      console.log('sending data to client', socket.id);
      socket.emit('score_table', score_table);
    } 
    catch (error) {
      console.error('error', error.message);
    }
   } )

  });

    


};

export default startServer;