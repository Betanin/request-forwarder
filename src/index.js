const http = require('http');
const express = require('express');
const axios = require('axios');

const app = express();

const port = process.env.APP_PORT || process.env.PORT || 3000;

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.header('Access-Control-Allow-Credentials', true);
    next();
});

app.all('/forward', async (req, res, next) => {
    const initialTime = new Date();
    const fromTo = `From: ${req.ip} - To: ${req.headers.to}`;
    console.log(`Incoming request - ${fromTo}`);

    if (req.headers.forwardtoken !== process.env.TOKEN) {
        console.log(`Request rejected in - ${new Date() - initialTime} ms`);
        res.status(401).send();
        next();
        return;
    }

    const headers = { ...req.headers };
    delete headers.to;
    delete headers.forwardtoken;

    try {
        await axios({
            method: req.method,
            url: req.headers.to,
            headers,
            data: req.body && JSON.parse(req.body),
        });

        console.log(`Response in ${new Date() - initialTime} ms - ${fromTo}`);
        res.status(200).send();
    } catch (error) {
        console.log(`Error in ${new Date() - initialTime} ms - ${fromTo} - Message: ${error.message}`);
        res.status(502).send();
    }

    next();
});

app.listen(port, () => {
    console.log(`Worker listening at port ${port}`);
});
