// Helper to create a random string of length l

function randString(l) {
    const valid = "0123456789@ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz"

    var res = ""
    for (i = 0; i < l; i++) {
        res += valid[Math.floor(Math.random() * (valid.length + 1))]
    }

    return res
}

module.exports = randString
