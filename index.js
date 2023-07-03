import sendMail from './features/mailer.js'


const mailingList=['cs21btech11055@iith.ac.in','ma22btech11003@iith.ac.in']

const to_list= mailingList.join(',')

const mailDetails = {
    from: 'ABHINAY SADINENI <abhinay.sadineni@gmail.com>',
    to:to_list,
    subject: 'Test mail',
    text: 'Node.js testing mail for localhost',
    html: '<h1>Node.js testing mail for localhost inside index js</h1>'
}


sendMail(mailDetails)
.then((result) => console.log('Email sent...', result))
.catch((error) => console.log(error.message));





