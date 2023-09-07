import nodemailer from 'nodemailer';

async function sendMail(mailDetails, oAuth2Client){
        try{
            const accessToken = await oAuth2Client.getAccessToken();
            const mailTransporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.EMAIL,
                    clientId: process.env.CLIENT_ID,
                    clientSecret: process.env.CLIENT_SECRET,
                    refreshToken: process.env.REFRESH_TOKEN,
                    accessToken: accessToken
                }
            
            })

            const result = await mailTransporter.sendMail(mailDetails);
            return result;

        }   
        catch(error){
            console.log(error)
            return error;
        }
        
    }



export default sendMail;