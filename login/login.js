const fs = require('fs')
const path = require('path')
const logoutAWS = require('./logout')
const randString = require('./randstring')
const httpsRequest = require('./httpsRequestPromise')

// Function to log in to an AWS role
//
// Step 1: Remove any credentials from previous steps.
// Step 2: Fetch Action Inputs and validate that they are set.
// Step 3: Fetch a GitHub issued token for token-exchange-audience, based on ACTIONS_RUNTIME_TOKEN and ACTIONS_ID_TOKEN_REQUEST_URL.
// Step 4: Exchange the token against an AAD issued access token for audience.
// Step 5: Store the access token and declare required environment variables.

async function loginAWS() {
    try {
        // 1. if logged in, log out first:
        logoutAWS()



        // 2. Fetch Action Inputs
        //        
        // https://docs.github.com/en/enterprise-server@3.8/actions/using-workflows/workflow-commands-for-github-actions#example-creating-an-annotation-for-an-error
        const clientId = process.env['INPUT_CLIENT-ID']
        const audience = process.env['INPUT_AUDIENCE']
        const arn = process.env['INPUT_ARN']
        const tenant = process.env['INPUT_TENANT']
        const tokenExchangeAudience = process.env['INPUT_TOKEN-EXCHANGE-AUDIENCE']
        const tokenfile = path.join(process.env['GITHUB_WORKSPACE'], "tokenfile-" + randString(10))

        // ensure values are set (this is done by the core library if used. It must be done manually if core is not being used)
        if (!clientId) { console.error("Input clientId must be set."); process.exit(1) }
        if (!audience) { console.error("Input audience must be set."); process.exit(1) }
        if (!arn) { console.error("Input arn must be set."); process.exit(1) }
        if (!tenant) { console.error("Input tenant must be set."); process.exit(1) }
        if (!tokenExchangeAudience) { console.error("Input tokenExchangeAudience must be set."); process.exit(1) }



        // 3. Fetch GitHub Token for the client
        //
        // https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect#updating-your-actions-for-oidc

        GitHubUrl = new URL(process.env["ACTIONS_ID_TOKEN_REQUEST_URL"])

        const gitHubBody="{}"
        const gitHubOptions = {
            host: GitHubUrl.hostname,
            path: GitHubUrl.pathname + GitHubUrl.search + "&audience=" + encodeURIComponent(tokenExchangeAudience),
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'bearer '+process.env["ACTIONS_RUNTIME_TOKEN"],
                'Accept': 'application/json; api-version=2.0',
                'Content-Length': gitHubBody.length,
            },  
        }

        const ghToken = JSON.parse(await httpsRequest(gitHubOptions, gitHubBody)).value



        // 4. Fetch "AAD access token" for the client with audience "AWS role principal" using federated GitHub Token
        //
        // https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow#third-case-access-token-request-with-a-federated-credential        
        const aadBody = 'grant_type=client_credentials' +
            '&client_id=' + encodeURIComponent(clientId) +
            '&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer' +
            '&client_assertion=' + ghToken +
            '&audience=' + encodeURIComponent(audience) +
            '&scope=' + encodeURIComponent(audience + '/.default')

        const aadOptions = {
            host: 'login.microsoftonline.com',
            path: '/' + tenant + '/oauth2/v2.0/token',
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'Content-Length': aadBody.length,
            },
        }

        const accessToken = JSON.parse(await httpsRequest(aadOptions, aadBody)).access_token;



        try {

            // 5. Store credential in AWS token file
            //
            // important: do not write to an existing file owned by someone else.
            // So this call MUST fail if the file already exists.
            // This ensures the flag 'wx', from the docs: Like 'w' but fails if the path exists.

            fs.writeFileSync(tokenfile, accessToken, { flag: 'wx', mode: 0o500 })


            // Declare location of credential file and ARN authorized by this credential file
            //
            // AWS variables: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html
            // GitHub set variables API: https://docs.github.com/en/enterprise-server@3.8/actions/using-workflows/workflow-commands-for-github-actions#setting-an-environment-variable

            const delim1 = randString(30)
            const delim2 = randString(30)
            fs.writeFileSync(process.env["GITHUB_ENV"], "AWS_WEB_IDENTITY_TOKEN_FILE<<" + delim1 + "\n" + tokenfile + "\n" + delim1 + "\n", { flag: 'a' })
            fs.writeFileSync(process.env["GITHUB_ENV"], "AWS_ROLE_ARN<<" + delim2 + "\n" + arn + "\n" + delim2 + "\n", { flag: 'a' })

            console.log("Created AWS web-identity token-file:", tokenfile)
            process.exit(0)

        } catch (e) {
            console.log('Token-file failed:', e)
            console.error(e.message)
            process.exit(1)
        }

    } catch (e) {
        console.error('Main failed:', e.message || e.statusMessage)
        process.exit(1)
    }
}


module.exports = loginAWS
