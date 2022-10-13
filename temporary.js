const bcrypt = require("bcrypt")

const saltRounds = 8;
const password = "weronika2305"

let hash = bcrypt.hashSync(password,8)




console.log('/n/n' + hash + '/n/n')



















