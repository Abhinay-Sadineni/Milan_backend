import { google } from 'googleapis';
import dotenv from 'dotenv';
import * as url from 'url';

//add member to google group



//get environment variables
dotenv.config();
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: __dirname + '../.env' });


const keyfile = JSON.parse(process.env.google_sheet_credentials);
const auth = new google.auth.GoogleAuth({
    credentials: keyfile,
    scopes: "https://www.googleapis.com/auth/admin.directory.group"
});

  
const addMemberToGroup = async (email, team) => {
    try {
        //create client instance for auth
        const client = await auth.getClient();
        //created instance of google admin api
        const googleadmin = google.admin({ version: 'directory_v1', auth: client });
        
        const ans = await googleadmin.members.list({
            groupKey: 'charaka_milan'
        })
        console.log(ans);
        //add member to google group
        const key = team + '_milan@googlegroups.com'
        // const addMember = await googleadmin.members.insert({
        //     groupKey: key,
        //     requestBody: {
        //         email: email,
        //         role: 'MEMBER',
        //         delivery_settings: 'ALL_MAIL',
        //     },
        // });
        console.log('Added member to google group');
    } catch (error) {
        console.error('error', error.message, "inside addMemberToGroup");
    }
}

// remove member from google group
const removeMemberFromGroup = async (email, team) => {
    try {
        //create client instance for auth
        const client = await auth.getClient();
        //created instance of google admin api
        const googleadmin = google.admin({ version: 'directory_v1', auth: client });

        //remove member from google group
        const key = team + '_milan@googlegroups.com'
        const removeMember = await googleadmin.members.delete({
            groupKey: key,
            memberKey: email,
        });
        console.log('Removed member from google group');
    } catch (error) {
        console.error('error', error.message, "inside removeMemberFromGroup");
    }

}

const getListofGroups = async () => {
    try {
        //create client instance for auth
        const client = await auth.getClient();
        //created instance of google admin api
        const googleadmin = google.admin({ version: 'directory_v1', auth: client });
        
        const ans = await googleadmin.groups.list({
            
        })   
        
        
        console.log(ans);
    }
    catch (error) {
        console.error('error', error.message, "inside getListofGroups");
    }

}

export default {addMemberToGroup,removeMemberFromGroup,getListofGroups}
