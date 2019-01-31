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

const replaceHeaders = inputHeaders => {
    const headersList = Object.keys(inputHeaders)
    .filter(header => header.substr(0, 4) === 'fwd-')
    .map(header => ({ name: header.substr(4, header.length - 4), value: inputHeaders[header] }) );

    const headers = {};

    for (header of headersList) {
        headers[header.name] = header.value;
    }

    return headers;
}

const sendRequest = async request => {

    const success = false;
    try {
        await axios(request);
        success = true;
    } catch (error) {
        if (!error.message.includes('ETIMEDOUT')) {
            throw error;
        }
    }
    return success;

}

const TIMEOUT_LIMIT = 100;

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

    const headers = replaceHeaders(req.headers);
    let timeoutCount = 0;

    try {
        
        const request = {
            method: req.method,
            url: req.headers.to,
            headers,
            data: req.body && JSON.parse(req.body),
        };

        while (true) {
            console.log(`Sending request - ${fromTo}`);
            timeoutCount++;
            if (timeoutCount >= TIMEOUT_LIMIT) {
                throw new Error('Timeout limit reached.');
            }
            if (await sendRequest(request)) {
                break;
            }
        }

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
