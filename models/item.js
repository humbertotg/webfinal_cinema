var {model, Schema, mongoose} = require("mongoose")

var itemSchema = Schema({
    username : String,
    name : String,
    year : String,
    runtime : String,
    release : String,
    priority : String,
    status : String,
    img_src : String,
    imdbID : String
});

module.exports = model('items', itemSchema)