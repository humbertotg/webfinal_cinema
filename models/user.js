var {model, Schema, mongoose} = require("mongoose")

var userSchema = Schema({
    name : String,
    username : String,
    password : String,
    email : String
});

module.exports = model('users', userSchema)