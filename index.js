const express = require('express');
//const bodyParser = require('body-parser');
var spawn = require('child_process').spawn;

//var urlencodedParser = bodyParser.urlencoded({ extended: false });
//const jsonParser = bodyParser.json();

// Number of GB to allocate to the Minecraft server.
const MC_SERVER_MEMORY = 4;

// Name of the Minecraft server JAR file.
const MC_JARFILE_NAME = 'mc_server_paper_1_16_5.jar'

// Timeout to stop the instance after.
const TIMEOUT = 20000

const ACTION = {
    leaving: 0,
    joining: 1
};

class MacawServer {
    constructor() {
        this._app = express();
        this._port = 8080

        this._mc_server = null;
        this._players = [];
        this._timer = null;

        this._app.listen(this._port, () => {
            this._log(`Macaw Server connected on port ${this._port}.`);
        
            // Start the Minecraft server.
            this._mc_server = spawn('sudo', ['java', `-Xmx${MC_SERVER_MEMORY}G`, '-jar', MC_JARFILE_NAME, 'nogui']);
        
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
            this._MCShutdown();
        });
        
        // Start the Minecraft server
        this._app.get('/start', (req, res) => {
            //
        });
        
        // Stop the AWS EC2 instance.
        this._app.get('/kill', (req, res) => {
            this._fullShutdown();
        });
    }

    _gotLogLine(data) {
        const line = String(data);
    
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
            this._startShutdownTimer();
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
    }
    
    
    _fullShutdown() {
        this._MCShutdown();
    }
    
    _startShutdownTimer() {
        this._log(`Instance will shutdown in ${TIMEOUT / 1000} seconds.`);
        this._timer = setTimeout(() => {
            this._log('Instance stopping...')
            this._MCShutdown()
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
