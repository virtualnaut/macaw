const express = require('express');
//const bodyParser = require('body-parser');

//var urlencodedParser = bodyParser.urlencoded({ extended: false });
//const jsonParser = bodyParser.json();

const app = express();
const port = 8080

app.listen(port, () => {
    console.log(`Macaw Server connected on port ${port}.`);
})

/* --- Routes --- */
// Stop the Minecraft server
app.get('/stop', (req, res) => {
    //
})

// Start the Minecraft server
app.get('/start', (req, res) => {
    //
})

// Stop the AWS EC2 instance.
app.get('/kill', (req, res) => {
    //
})