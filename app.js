const express = require('express')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const path = require('path')
const bcrypt = require('bcrypt')
const jwttoken = require('jsonwebtoken')

const app = express()
app.use(express.json())

let dataBase

const serverStart = async () => {
  try {
    dataBase = await open({
      filename: path.join(__dirname, 'photoDataBase.db'),
      driver: sqlite3.Database,
    })
    console.log('Server has started...')
  } catch (e) {
    console.log(e.message)
    process.exit(1)
  }
}

serverStart()

const check = (req, res, next) => {
  const jwt = req.headers.authorization.split(' ')[1]
  console.log(jwt)

  if (jwt === undefined) {
    res.status(401)
    res.send('Invalid JWT Token')
  } else {
    jwttoken.verify(jwt, 'encryptedKey', async (err, payload) => {
      if (err) {
        res.status(401)
        res.send('Invalid JWT Token')
      } else {
        req.username = payload.username
        console.log(payload.username)
        next()
      }
    })
  }
}

app.post('/register/', async (req, res) => {
  const {username, password} = req.body

  const checkUserNameInDb = await dataBase.get(
    `SELECT * FROM users WHERE username = '${username}';`,
  )
  console.log(checkUserNameInDb)
  if (checkUserNameInDb === undefined) {
    const hasedPassword = await bcrypt.hash(password, 10)
    await dataBase.run(
      `INSERT INTO users (username, password) VALUES ('${username}', '${hasedPassword}');`,
    )
    res.status(200).send({message: 'User Added'})
  } else {
    res.status(400).send({message: 'Username already Existing.'})
  }
})

//API - 1
app.post('/log-in/', async (req, res) => {
  const {username, password} = req.body
  const dbRes = await dataBase.get(
    `SELECT * FROM users WHERE username = '${username}';`,
  )

  if (dbRes === undefined) {
    res.status(400).send({message: 'Invalid user'})
  } else {
    const checkPassword = await bcrypt.compare(password, dbRes.password)
    if (checkPassword) {
      const jwtToken = jwttoken.sign({username}, 'encryptedKey')
      res.status(200).send({message: 'Sucess', jwtToken})
    } else {
      res.status(400).send({message: 'Invalid Password'})
    }
  }
})

//API - 2
app.get('/get-events/', check, async (req, res) => {
  const dbRes = await dataBase.all(`SELECT * FROM user_uploaded;`)
  res.status(200).send(dbRes)
})

//API - 3
app.post('/add-events/', check, async (req, res) => {
  const {eventId, eventTitle, fileUrls} = req.body
  const dbRes = await dataBase.run(
    `INSERT INTO user_uploaded (event_id, username, event_title, uploades) VALUES ('${eventId}', '${req.username}', '${eventTitle}', '${fileUrls}');`,
  )
  res.status(200).send({message: 'Event Details Added...'})
})

app.listen(3000)

module.exports = app
