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

job.schedule();

const { Pool } = pkg;
const pool = new Pool({
    user: 'postgres',
    password: 'root',
    host: 'localhost',
    database: 'milan',
    port: 5432,
});
pool.connect()

const app = express();
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const data = [];

//Socket code goes here
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);
    
    socket.on("setup", (data) => {
        console.log(data);
    })

    socket.on("recieve_data", (data) => {
        console.log(data);
    });

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
            clientID: process.env.GAUTH_CLIENT_ID,
            clientSecret: process.env.GAUTH_SECRET,
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
            console.log(req.user)
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
    res.json({ email: res.locals.email })
})

app.get('/hello', async (req, res) => {
    res.send("Hello People")
})

// app.use('/api/events', require('./events'))
// module.exports = io

const port = process.env.PORT || 8000;

server.listen(port, () => {
    console.log('Server started on port ' + port);
});
