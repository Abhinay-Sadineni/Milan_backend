const express = require('express');
var passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');
const cookieParser = require('cookie-parser');
const cors = require('cors')
const jwt = require('jsonwebtoken');
import { Socket } from "socket.io";
const http = require('http')

const { Pool } = require('pg');
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
const io  = Socket(server)

app.use(express.json())
app.use(cors())
app.use(cookieParser());

passport.use(
    new GoogleStrategy(
        {
            clientID: '579818176972-qhc2makbf4476fnltqenbdfk22er9p5r.apps.googleusercontent.com',
            clientSecret: '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',
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
        const query = `SELECT * FROM users WHERE email='${req.user.emails[0].value}'`
        const data = await pool.query(query)
        console.log(data.rows)
        if (data.rows.length > 0) {

        }
        else{
        const newquery = `INSERT INTO users (user_id, google_id, email, display_name, avatar_url, created_at, updated_at) VALUES (${Math.floor(Math.random() * 100000)},'${req.user._json.sub}', '${req.user._json.email}',' ${req.user._json.name}','${req.user._json.picture}','${(new Date).toISOString()}','${(new Date).toISOString()}')`
        console.log("Query is",JSON.stringify(newquery))
        pool.query(newquery, (error, results) => {
            if (error) throw error;
            console.log('New User Created')
        })
        console.log(req.user)
        console.log("Organisation", req.user._json.hd)
    }
        if (req.user._json.hd == undefined && req.user.hd !== 'iith.ac.in') {
            console.log("its not iith")
            res.json({ auth: 'false', message: 'use iith email to continue' })
        } else {
            console.log("both are defined")
            const jwttoken = jwt.sign(req.user.emails[0].value, 'milan_backend_secret')
            res.cookie('authtoken', jwttoken, { maxAge: 900000, httpOnly: true });
            console.log(req.user._json.picture)
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

app.get('/hello',async (req, res) => {
    res.send("Hello People")
})

app.use('/api/events', require('./events'))

module.exports = io

const port = process.env.PORT || 8000;

server.listen(port, () => {
    console.log('Server started on port ' + port);
});
