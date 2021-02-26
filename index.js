const express = require('express');
const bodyParser = require('body-parser');
var spawn = require('child_process').spawn;

const fs = require('fs');
const https = require('https');

const CONFIG = require('./config.json');

var urlencodedParser = bodyParser.urlencoded({ extended: false });
const jsonParser = bodyParser.json();

// Number of GB to allocate to the Minecraft server.
const MC_SERVER_MEMORY = 4;

// Name of the Minecraft server JAR file.
const MC_JARFILE_NAME = '/home/ec2-user/mc-serv-paper/mc_server_paper_1_16_5.jar'

// Timeout to stop the instance after.
const TIMEOUT = CONFIG.timeout;
const KEY = CONFIG.key;

const ACTION = {
    leaving: 0,
    joining: 1
};

const STATUS = {
    NOT_RUNNING: 'not running',
    RUNNING: 'running',
    STARTING: 'starting',
    STOPPING: 'stopping'
}

class MacawServer {
    constructor() {
        this._app = express();
        this._app.use(bodyParser.urlencoded({extended: false}));
        this._app.use(bodyParser.json());

        this._port = 8080

        this._mc_server = null;
        this._players = [];
        this._timer = null;
        this._mc_status = STATUS.NOT_RUNNING;

        this._stop_instance = false;
        
        https.createServer({
            key: fs.readFileSync('/home/ec2-user/macaw/cert/server.key'),
            cert: fs.readFileSync('/home/ec2-user/macaw/cert/server.cert')
        }, this._app).listen(this._port, () => {

            this._log(`Macaw Server connected on port ${this._port}.`);

            // Start the Minecraft server.
            this._mc_server = spawn('sudo', ['/usr/bin/java', `-Xmx${MC_SERVER_MEMORY}G`, '-jar', MC_JARFILE_NAME, 'nogui']);
            this._mc_status = STATUS.STARTING;

            // Echo the server output
            this._mc_server.stdout.on('data', data => {
                let line = String(data).slice(0, -1);
                console.log(line);
                this._gotLogLine(line);
            });
        
            this._log('Minecraft server process spawned.');
        });
        
        /* --- Routes --- */

        // Stop the Minecraft server
        this._app.get('/stop', (req, res) => {
            if (req.query.key === KEY) {
                this._MCShutdown();
                res.status(200).end();
            }
            else {
                res.status(401).end();
            }
        });
        
        // Start the Minecraft server
        this._app.get('/start', (req, res) => {
            //
        });
        
        // Stop the AWS EC2 instance.
        this._app.get('/kill', (req, res) => {
            if (req.query.key === KEY) {
                this._fullShutdown();
                res.status(200).end();
            }
            else {
                res.status(401).end();
            }
        });

        // Get the Minecraft server status.
        this._app.get('/status', (req, res) => {
            if (req.query.key === KEY) {
                const status = {
                    status: this._mc_status,
                    players: this._players
                }

                res.json(status);
            }
            else {
                res.status(401).end();
            }
        });

        // Issue a command to the Minecraft server.
        this._app.post('/issue', urlencodedParser, jsonParser, (req, res) => {

            if (req.query.key !== KEY) {
                res.status(401).end();
                return;
            }

            if (this._mc_status !== STATUS.RUNNING) {
                res.status(503).send('Minecraft server not running');
                return;
            }

            if (!req.body.hasOwnProperty('command')) {
                res.status(400).send('No command specified');
                return
            }

            const command = req.body.command;

            this._log(`Command issued by ${req.socket.remoteAddress}: ${command}`);
            this._mc_server.stdin.write(`${command}\n`);

            res.status(200).end();
        });
    }

    _gotLogLine(data) {
        const line = String(data);

        fs.appendFile('./log.txt', line, err => {if (err) throw err;});
    
        let player = null;
        let action = null;
    
        if (line.includes('joined the game')) {
            // Player connected.
            player = line.slice(17, line.indexOf(' joined the game'));
            action = ACTION.joining;
        }

        else if (line.includes('left the game')) {
            // Player disconnected.
            player = line.slice(17, line.indexOf(' left the game'));
            action = ACTION.leaving;
        }

        else if (line.includes('For help, type "help"')) {
            this._mc_status = STATUS.RUNNING;
            this._startShutdownTimer();
        }

        else if (line.includes('Closing Server') && (this._stop_instance)) {
            this._mc_status = STATUS.NOT_RUNNING;
            if (this._stop_instance) {
                spawn('sudo', ['shutdown', 'now']);
            }
        }
    
        if (player !== null) {
            const player_index = this._players.indexOf(player);
    
            switch (action) {
                case ACTION.leaving: {
                    if (player_index >= -1) {
                        this._players.splice(player_index, 1);
                    }
    
                    break;
                }
                case ACTION.joining: {
                    if (player_index === -1) {
                        this._players.push(player);
                    }
                    break;
                }
            }
    
            this._log(`Players: ${this._players}`);
    
            if (this._players.length === 0) {
                this._startShutdownTimer();
            }
            else {
                this._clearShutdownTimer();
            }
        }
    }
    
    _MCShutdown() {
        this._mc_server.stdin.write('stop\n');
        this._mc_status = STATUS.STOPPING;
    }
    
    
    _fullShutdown() {
        this._MCShutdown();
        this._stop_instance = true;
    }
    
    _startShutdownTimer() {
        this._log(`Instance will shutdown in ${TIMEOUT / 1000} seconds.`);
        this._timer = setTimeout(() => {
            this._log('Instance stopping...')
            this._fullShutdown()
        }, TIMEOUT);
    }
    
    _clearShutdownTimer() {
        clearTimeout(this._timer);
        this._log('Instance shutdown aborted.');
    }
    
    _log(message) {
        console.log(`[${new Date().toLocaleTimeString().slice(0, -3)} INFO]: <MACAW> ${message}`);
    }
}

server = new MacawServer();

/*
var spawn = require('child_process').spawn,
    child = spawn('phantomjs');

child.stdin.setEncoding('utf-8');
child.stdout.pipe(process.stdout);

child.stdin.write("console.log('Hello from PhantomJS')\n");

child.stdin.end();
*/
