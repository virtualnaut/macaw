const express = require('express');
//const bodyParser = require('body-parser');
var spawn = require('child_process').spawn;

//var urlencodedParser = bodyParser.urlencoded({ extended: false });
//const jsonParser = bodyParser.json();

// Number of GB to allocate to the Minecraft server.
const MC_SERVER_MEMORY = 4;

// Name of the Minecraft server JAR file.
const MC_JARFILE_NAME = 'mc_server_paper_1_16_5.jar'

const app = express();
const port = 8080

let mc_server = null;

app.listen(port, () => {
    console.log(`[MACAW ${new Date().toLocaleTimeString()} INFO]: Macaw Server connected on port ${port}.`);

    // Start the Minecraft server.
    mc_server = spawn('java', [`-Xmx${MC_SERVER_MEMORY}G`, '-jar', MC_JARFILE_NAME, 'nogui']);
    console.log(`[MACAW ${new Date().toLocaleTimeString()} INFO]: Minecraft server process spawned.`);
});

/* --- Routes --- */
// Stop the Minecraft server
app.get('/stop', (req, res) => {
    //
});

// Start the Minecraft server
app.get('/start', (req, res) => {
    //
});

// Stop the AWS EC2 instance.
app.get('/kill', (req, res) => {
    //
});

var spawn = require('child_process').spawn,
    child = spawn('phantomjs');

child.stdin.setEncoding('utf-8');
child.stdout.pipe(process.stdout);

child.stdin.write("console.log('Hello from PhantomJS')\n");

child.stdin.end();