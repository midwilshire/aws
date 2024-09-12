const fs = require('fs')

// Function to logout:
// Remove AWS web-identity token-file if one is declared in the environment

function logoutAWS() {
    try {

        if (process.env['AWS_WEB_IDENTITY_TOKEN_FILE']) {
            console.log("Removing AWS web-identity token-file:", process.env['AWS_WEB_IDENTITY_TOKEN_FILE'])
    
            try {
                fs.unlinkSync(process.env['AWS_WEB_IDENTITY_TOKEN_FILE'])
            } catch (e) {
                if (e.code && e.code=="ENOENT" ) {
                    console.log("File vanished:", process.env['AWS_WEB_IDENTITY_TOKEN_FILE'])
                } else {
                    throw e
                }
            }
        } else {
            console.log("No AWS web-identity token-file declared.")
        }
    
    } catch (e) {
        console.log('Logout failed:', e)
        process.exit(1)
    }
}


module.exports = logoutAWS
