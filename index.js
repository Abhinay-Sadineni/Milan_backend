import job from './features/notification.js'
import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { v4 as uuidv4 } from 'uuid';
import cookieParser from 'cookie-parser';
import cors from "cors";
import jwt from "jsonwebtoken";
import { Server } from 'socket.io'; import http from "http";
import dotenv from 'dotenv';
import pkg from 'pg';
import url from 'url';





//get environment variables
dotenv.config();
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
dotenv.config({ path: __dirname + '.env' });


const { Pool } = pkg;
const pool = new Pool({
    user: 'postgres',
    password: 'root',
    host: 'localhost',
    database: 'milan',
    port: 5432,
});
pool.connect()

//start the job
job.schedule();

const app = express();
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const eventdata =  [{
    id: "adfasd",
    sport: "Football",
    name: "Football Finals",
    score1: 2,
    score2: 3,
    team1: "Charaka",
    team2: "Bhabha",
    data: "myran"
}];

//Socket code goes here
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("setup", (data) => {
        socket.emit("setupdata", eventdata)
        console.log(data);
    })

    socket.on("recieve_data", (data) => {
        console.log(data);
    });

    socket.on("update_score", (data) => {
        const id = data.id;
        const index = eventdata.findIndex((event) => event.id === id);
        // eventdata[index]
        if(data.score1){
            eventdata[index].score1 = data.score1;
        }       
         if(data.score2){
            eventdata[index].score2 = data.score2;
        }
        socket.broadcast.emit("admin_update", data)
    })
    // Handle socket events here...

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

app.use(express.json())
app.use(cors())
app.use(cookieParser());

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: '/auth/google/callback',
            scope: ['profile', 'email'],
        },
        (accessToken, refreshToken, profile, done) => {
            console.log(profile)
            return done(null, profile);
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

app.get('/', (req, res) => {
    res.send('Milan Backend Code here');
});

app.get(
    '/auth/google',
    passport.authenticate('google')
);

app.get('/auth/google/callback',
    passport.authenticate('google', {
        failureRedirect: '/login',
        session: false
    }),
    async function (req, res) {
        //SQL stuff here
        const query = 'SELECT * FROM users WHERE email=$1'
        const data = await pool.query(query, [req.user.emails[0].value])
        if (data.rows.length > 0) {

        }
        else {
            const newquery = `INSERT INTO users (user_id, google_id, email, display_name, avatar_url, created_at, updated_at) VALUES (${Math.floor(Math.random() * 100000)},'${req.user._json.sub}', '${req.user._json.email}',' ${req.user._json.name}','${req.user._json.picture}','${(new Date).toISOString()}','${(new Date).toISOString()}')`
            pool.query(newquery, (error, results) => {
                if (error) throw error;
                console.log('New User Created')
            })
            //console.log(req.user)
        }
        if (req.user._json.hd == undefined && req.user.hd !== 'iith.ac.in') {
            res.json({ auth: 'false', message: 'use iith email to continue' })
        } else {
            const jwttoken = jwt.sign(req.user.emails[0].value, 'milan_backend_secret')
            res.cookie('authtoken', jwttoken, { maxAge: 432000, httpOnly: true });
            res.redirect('/profile')
        }
    }
);


const verifyUser = (req, res, next) => {
    const cookie = req.cookies.authtoken;
    if (!cookie) {
        res.json({ auth: false })
    }
    else {
        jwt.verify(cookie, "milan_backend_secret", (err, email) => {
            if (err) {
                res.json({ auth: false, message: "Invalid Token" });
            }
            else {
                res.locals.email = email;
                next();
            }
        });
    }
}

app.get('/profile', verifyUser, async (req, res) => {
    console.log(res)
    res.json({ email: res.locals.email })
})

app.get('/hello', async (req, res) => {
    res.send("Hello People")
})





//update supporting teams
app.get('/profile/update', verifyUser, async (req, res) => {
    const { supportedTeams } = req.body; // Assuming supportedTeams is an array of team names or IDs.
    const userEmail = res.locals.email;
    console.log(userEmail)
    try {
        // Update the user's profile in the database with the supported teams.
        const updateQuery = 'UPDATE users SET supported_teams = $1 WHERE email = $2';
        await pool.query(updateQuery, [supportedTeams, userEmail]);
        res.json({ success: true, message: 'Profile updated successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Profile update failed' });
    }
});

// app.use('/api/events', require('./events'))
// module.exports = io

const port = process.env.PORT || 8000;

server.listen(port, () => {
    console.log('Server started on port ' + port);
});
