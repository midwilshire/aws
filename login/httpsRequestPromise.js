const https = require('https');

// Simple promise wrapper around node's https.request
// This does not aim to be complete.
// It just serves our purpose to fire a simple GET or PUT call.

function httpsRequest(options, body) {
    return new Promise(function (resolve, reject) {
        const req = https.request(options, res => {

            const buffer = []

            res.on('data', data => {
                buffer.push(data);
            });

            res.on('end', () => {

                // Generally this needs to be more sophisticated.
                // But for our use case only 200 is expected.
                // So everything else is an error.
                if (res.statusCode != 200) {
                    console.error("Status code: " + res.statusCode)
                    console.error("Status message: " + Buffer.concat(buffer).toString())
                    reject(res)
                }

                resolve(Buffer.concat(buffer).toString())
            })
        })
        req.on('error', (e) => {
            console.error(e);
            reject(e)
        });

        if (body) req.write(body)
        req.end();
    });
}

module.exports = httpsRequest
