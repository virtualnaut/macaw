const express = require('express');
//const bodyParser = require('body-parser');
var spawn = require('child_process').spawn;

//var urlencodedParser = bodyParser.urlencoded({ extended: false });
//const jsonParser = bodyParser.json();

// Number of GB to allocate to the Minecraft server.
const MC_SERVER_MEMORY = 4;

// Name of the Minecraft server JAR file.
const MC_JARFILE_NAME = 'mc_server_paper_1_16_5.jar'

const ACTION = {
    leaving: 0,
    joining: 1
};

const app = express();
const port = 8080

let mc_server = null;
let players = [];

app.listen(port, () => {
    console.log(`[MACAW ${new Date().toLocaleTimeString()} INFO]: Macaw Server connected on port ${port}.`);

    // Start the Minecraft server.
    mc_server = spawn('sudo', ['java', `-Xmx${MC_SERVER_MEMORY}G`, '-jar', MC_JARFILE_NAME, 'nogui']);

    // Echo the server output
    mc_server.stdout.on('data', data => {
        line = String(data).slice(0, -1);
        console.log(line);
        gotLogLine(line);
    });

    console.log(`[MACAW ${new Date().toLocaleTimeString()} INFO]: Minecraft server process spawned.`);
});

/* --- Routes --- */
// Stop the Minecraft server
app.get('/stop', (req, res) => {
    mc_server.stdin.write('stop\n');
});

// Start the Minecraft server
app.get('/start', (req, res) => {
    //
});

// Stop the AWS EC2 instance.
app.get('/kill', (req, res) => {
    //
});

/* --- Callbacks --- */
function gotLogLine(data) {
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

    if (player !== null) {
        console.log(`[MACAW ${new Date().toLocaleTimeString()} INFO]: Player Event: ${player}`);
        const player_index = players.indexOf(player);

        switch (action) {
            case ACTION.leaving: {
                if (player_index >= -1) {
                    players.splice(player_index, 1);
                }

                break;
            }
            case ACTION.joining: {
                if (player_index === -1) {
                    players.push(player);
                }
                break;
            }
        }

        console.log(`[MACAW ${new Date().toLocaleTimeString()} INFO]: Players: ${players}`);
    }
}

/*
var spawn = require('child_process').spawn,
    child = spawn('phantomjs');

child.stdin.setEncoding('utf-8');
child.stdout.pipe(process.stdout);

child.stdin.write("console.log('Hello from PhantomJS')\n");

child.stdin.end();
*/
