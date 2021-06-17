const qs = require("querystring")
const express = require("express")
const app = express()
const PORT = process.env.PORT || 3000
const path = require("path")
const session = require('express-session')
const FileStore = require('session-file-store')(session)
var fileStoreOptions = {}
const Datastore = require('nedb')
const fs = require('fs')
var which = 0
var die = 0
var fields

fs.readFile('./static/json/fields.json', 'utf8', (err, jsonString) => {
    fields = JSON.parse(jsonString)
})

var tables = new Datastore({
    filename: 'tables.db',
    autoload: true
})

var docs = null

tables.find({}, function (err, docsq) { docs = docsq })

app.use(session({
    store: new FileStore(fileStoreOptions),
    secret: 'keyboard cat'
}))

app.get("/main.js", function (req, res) {
    res.sendFile(path.join(__dirname + "/static/js/main.js"))
})

app.get("/board.png", function (req, res) {
    res.sendFile(path.join(__dirname + "/static/img/board.png"))
})

app.get("/border.jpg", function (req, res) {
    res.sendFile(path.join(__dirname + "/static/img/border.jpg"))
})

app.get("/dc7238fd95ee501224b6.obj", function (req, res) {
    res.sendFile(path.join(__dirname + "/static/model/dc7238fd95ee501224b6.obj"))
})

app.get("/die/:number", function (req, res) {
    res.sendFile(path.join(__dirname + `/static/img/${req.params.number}.png`))
})

app.get("/", function (req, res) {
    tables.find({}, function (err, docsq) { docs = docsq })
    res.sendFile(path.join(__dirname + "/static/index.html"))
})

app.post("/ifuser", function (req, res) {
    if (req.session.player == undefined) {
        var allData = ""

        req.on("data", function (data) {
            allData += data
        })

        req.on("end", function () {
            player = { is: false, fields: fields }
            res.json(player)
        })
    } else {
        var allData = ""
        var playerTable = {}

        tables.findOne({ nicks: req.session.player.nick }, function (err, doc) {
            playerTable = doc
            playerTable.is = true
            playerTable.this = {
                nick: req.session.player.nick,
                color: req.session.player.color,
            }

            if (parseInt(playerTable.time) != 0) {
                playerTable.time = 10 - (Math.round(Date.now() / 1000 - playerTable.startTime))
            } else if (playerTable.time === undefined) {
                playerTable.time = 10
            }

            if (playerTable.time == 0) {
                playerTable.moveTime = 60 - (Math.round(Date.now() / 1000 - playerTable.startTime))
                if (doc.players[0].ready == 1 || doc.players[1].ready == 1) {
                    doc.players.forEach(element => {
                        element.ready = 2
                    })

                    doc.players[0].ready = 3
                    doc.startTime = Math.round(Date.now() / 1000)

                    tables.update({ _id: doc._id }, { $set: doc })

                } else if (playerTable.moveTime == 0) {
                    for (var i = 0; i < doc.players.length; i++) {
                        if (doc.players[i].ready == 3 || doc.players[i].ready == 4) {
                            which = i
                            doc.players[i].ready = 2
                        }
                    }

                    if (which == doc.players.length - 1) {
                        which = 0
                    } else {
                        which++
                    }

                    doc.players[which].ready = 3
                    doc.startTime = Math.round(Date.now() / 1000)

                    tables.update({ _id: doc._id }, { $set: doc })
                }
            }

            playerTable.die = die
        })



        req.on("data", function (data) { allData += data })

        req.on("end", function () {
            setTimeout(() => {
                playerTable.fields = fields
                res.json(playerTable)
            }, 100)
        })
    }
})

app.post("/ready", function (req, res) {
    var allData = ""
    var playerTable = {}
    var readyPlayers = []

    tables.findOne({ nicks: req.session.player.nick }, function (err, doc) {
        doc.players.forEach(element => {
            if (element.nick === req.session.player.nick) {
                element.ready = 1
            }
            readyPlayers.push(element.ready)
        })

        playerTable = doc
        playerTable.this = {
            nick: req.session.player.nick,
            color: req.session.player.color,
        }

        if (readyPlayers.includes(0) || readyPlayers.length < 2) {
            playerTable.allReady = false
        } else {
            playerTable.startTime = Math.round(Date.now() / 1000)
            playerTable.allReady = true
            doc.ingame = true
        }

        tables.update({ _id: doc._id }, { $set: doc })
    })

    req.on("data", function (data) { allData += data })

    req.on("end", function () {
        setTimeout(() => {
            res.json(playerTable)
        }, 100)
    })
})

app.post("/notready", function (req, res) {
    var allData = ""
    var playerTable = {}

    tables.findOne({ nicks: req.session.player.nick }, function (err, doc) {
        doc.players.forEach(element => {
            if (element.nick === req.session.player.nick) {
                element.ready = 0
            }
        })

        playerTable = doc
        playerTable.this = {
            nick: req.session.player.nick,
            color: req.session.player.color,
        }
        playerTable.allReady = false
        doc.ingame = false

        tables.update({ _id: doc._id }, { $set: doc })
    })

    req.on("data", function (data) { allData += data })

    req.on("end", function () {
        setTimeout(() => {
            res.json(playerTable)
        }, 100)
    })
})

app.post("/useradd", function (req, res) {
    var allData = "";

    req.on("data", function (data) { allData += data })

    req.on("end", function (data) {
        var finish = qs.parse(allData)
        const playerTable = addBase(req, res, finish)

        tables.find({}, function (err, docsq) { docs = docsq })
        res.json(playerTable)
    })
})

app.post("/pawns", function (req, res) {
    var allData = ""
    var playerTable = {}

    tables.findOne({ nicks: req.session.player.nick }, function (err, doc) {
        playerTable = doc
        playerTable.is = true
        playerTable.this = {
            nick: req.session.player.nick,
            color: req.session.player.color,
        }
    })

    req.on("data", function (data) { allData += data })

    req.on("end", function () {
        setTimeout(() => {
            res.json(playerTable)
        }, 100)
    })
})

app.post("/die", function (req, res) {
    var allData = ""
    var playerTable = {}

    req.on("data", function (data) { allData += data })

    req.on("end", function () {
        tables.findOne({ nicks: req.session.player.nick }, function (err, doc) {
            playerTable = doc
            playerTable.is = true
            playerTable.this = {
                nick: req.session.player.nick,
                color: req.session.player.color,
            }

            for (var i = 0; i < doc.players.length; i++) {
                if (doc.players[i].ready == 3) {
                    doc.players[i].ready = 4
                }
            }

            tables.update({ _id: doc._id }, { $set: doc })
        })

        die = Math.floor(Math.random() * 6) + 1

        res.json(die)
    })
})

app.post("/move", function (req, res) {
    var allData = ""
    var playerTable = {}

    req.on("data", function (data) { allData += data })

    req.on("end", function () {
        tables.findOne({ nicks: req.session.player.nick }, function (err, doc) {
            var finish = qs.parse(allData)
            finish = JSON.parse(finish.pawns)
            playerTable = doc

            console.log(finish)

            doc.players.forEach(element => {
                switch (element.color) {
                    case 'red':
                        for (let i = 0; i < element.pawns.length; i++) {
                            element.pawns[i] = finish.red[i]
                        }
                        break;

                    case 'blue':
                        for (let i = 0; i < element.pawns.length; i++) {
                            element.pawns[i] = finish.blue[i]
                        }
                        break;

                    case 'yellow':
                        for (let i = 0; i < element.pawns.length; i++) {
                            element.pawns[i] = finish.yellow[i]
                        }
                        break;

                    case 'green':
                        for (let i = 0; i < element.pawns.length; i++) {
                            element.pawns[i] = finish.green[i]
                        }
                        break;
                }
            })

            for (var i = 0; i < doc.players.length; i++) {
                if (doc.players[i].ready == 3 || doc.players[i].ready == 4) {
                    which = i
                    doc.players[i].ready = 2
                }
            }

            if (which == doc.players.length - 1) {
                which = 0
            } else {
                which++
            }

            doc.players[which].ready = 3
            doc.startTime = Math.round(Date.now() / 1000)

            if (finish.win) {
                doc.winnerNick = req.session.player.nick
            }

            tables.update({ _id: doc._id }, { $set: doc })
        })

        res.json()
    })
})

app.post("/delete", function (req, res) {
    req.session.destroy()
})

function addBase(req, res, finish) {
    var playerTable = null

    if (docs.length == 0) {
        var player = { nick: finish.nick, color: setColor(), pawns: [] }

        player.pawns.push(0, 0, 0, 0)

        playerTable = [{ nick: player.nick, color: player.color, pawns: player.pawns, ready: 0, }]

        req.session.player = player

        var table = {
            id: Date.now(),
            players: [
                { nick: player.nick, color: player.color, pawns: player.pawns, }
            ],
            nicks: [player.nick],
            ingame: false,
            winnerNick: null,
        }

        tables.insert(table)

        return playerTable

    } else {
        var inserted = false
        docs.sort(function (a, b) { return b.id - a.id })

        var usedNicknames = []

        for (let i = 0; i < docs.length; i++) {
            if (docs[i].winnerNick != null) {
                tables.remove({ _id: docs[i]._id })
            } else if (Math.round(Date.now() / 1000) - parseInt(docs[i].id) > 10800) {
                tables.remove({ _id: docs[i]._id })
            } else {
                docs[i].players.forEach(element => {
                    usedNicknames.push(element.nick)
                })
            }
        }

        if (usedNicknames.includes(finish.nick)) {
            return false
        }

        for (let i = 0; i < docs.length; i++) {
            if (docs[i].players.length < 4 && !docs[i].ingame) {
                var randomColor = ''
                var usedColors = []
                var pawns = []

                docs[i].players.forEach(element => {
                    usedColors.push(element.color)
                })

                do {
                    randomColor = setColor()
                }
                while (usedColors.includes(randomColor))

                pawns.push(0, 0, 0, 0)

                var player = { nick: finish.nick, color: randomColor, pawns: pawns, ready: 0, }
                req.session.player = player

                docs[i].players.push(player)
                docs[i].nicks.push(finish.nick)

                playerTable = docs[i].players

                var table = {
                    id: docs[i].id,
                    players: docs[i].players,
                    nicks: docs[i].nicks,
                }

                tables.update({ _id: docs[i]._id }, { $set: table })

                inserted = true

                return playerTable
            }
        }

        if (!inserted) {
            var player = { nick: finish.nick, color: setColor(), pawns: [], }

            player.pawns.push(0, 0, 0, 0)

            req.session.player = player

            playerTable = [{ nick: player.nick, color: player.color, pawns: player.pawns, }]

            var table = {
                id: Date.now(),
                players: [
                    { nick: player.nick, color: player.color, pawns: player.pawns, ready: 0, }
                ],
                nicks: [player.nick],
                ingame: false,
                winnerNick: null,
            }

            tables.insert(table)

            return playerTable
        }
    }
}

function setColor() {
    var colors = {
        1: 'red',
        2: 'green',
        3: 'blue',
        4: 'yellow',
    }

    var color = Math.floor(Math.random() * (5 - 1)) + 1
    return colors[color]
}

app.listen(PORT, function () {
    console.log("start serwera na porcie " + PORT)
})