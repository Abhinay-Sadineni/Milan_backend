const express = require("express");
const app = express();
const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    password: 'root',
    host: 'localhost',
    database: 'milan',
    port: 5432,
});
pool.connect()

const io = require('./index')

function sendsocket({ id, data }) {
    io.to(id).emit(data)
}

app.get('/all', async (req, res) => {
    const events = ['Football', 'Cricket']
    const list_of_events = []

    const fetchEventData = async (eventName) => {
        const query = `SELECT *, '${eventName}' as name FROM ${eventName} WHERE gameover = false`;
        const { rows } = await pool.query(query);
        return rows;
    };

    const fetchAllEventData = async () => {
        const promises = events.map(fetchEventData);
        return Promise.all(promises);
    };

    fetchAllEventData()
        .then(eventDataArrays => {
            eventDataArrays.forEach(eventDataArray => {
                list_of_events.push(...eventDataArray);
            });
            console.log("Events:", list_of_events);
            res.json({ events: list_of_events })
        })
        .catch(error => {
            console.error('Error fetching event data:', error);
        });
})

app.post('/create', async (req, res) => {
    try {
        const event = req.body.event
        const team1 = req.body.team1
        const team2 = req.body.team2

        console.log(event, team1, team2)

        const createquery = "INSERT INTO " + event + "(id, team1, team2, gameover) VALUES ($1, $2, $3, $4)"
        console.log(createquery)
        const response = pool.query(createquery, [req.body.id, team1, team2, false])
        console.log("response", response)
        res.json({ response: response, success: true })
    }
    catch (e) {
        res.send("unexpected error had occured")
    }
})

app.post('/football', async (req, res) => {
    try {
        const id = req.body.id
        const goal1 = req.body.goal1
        const goal2 = req.body.goal2
        console.log(id, goal1, goal2)
        const updatequery = 'UPDATE football SET goal1 = $1, goal2 = $2 WHERE id = $3'
        pool.query(updatequery, [goal1, goal2, id])
        const getquery = 'SELECT * from football where id = $1'
        const { rows } = pool.query(getquery, [id])
        sendsocket(id, rows)
        res.json({ success: true })
    }
    catch (e) {
        res.send('unexpected error occured')
    }
})

app.post('/cricket', async (req, res) => {
    try {
        const id = req.body.id
        const score1 = req.body.score1
        const score2 = req.body.score2
        const wicket1 = req.body.wicket1
        const wicket2 = req.body.wicket2
        const over1 = req.body.over1
        const over2 = req.body.over2
        console.log(id, score1, score2, wicket1, wicket2, over1, over2)
        const updatequery = 'UPDATE cricket SET score1 = $1, score2 = $2, wicket1 = $3, wicket2 = $4, over1 = $5, over2 = $6 WHERE id = $7'
        pool.query(updatequery, [score1, score2, wicket1, wicket2, over1, over2, id])
        const getquery = 'SELECT * from cricket where id = $1'
        
        const { rows } = pool.query(getquery, [id])
        sendsocket(id, rows)
        res.json({ success: true })
    }
    catch (e) {
        res.send('unexpected error occured')
    }
})


app.get('/hej', (req, res) => {
    res.send("updated successfully")
})

module.exports = app