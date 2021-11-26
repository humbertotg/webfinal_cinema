var express = require("express");
var path = require("path");
var env = require('dotenv').config();
var cookieParser = require("cookie-parser");
var sessions = require('express-session');
var mongoose = require('mongoose');
var bcrypt = require('bcryptjs')
var path = require('path')
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
var example = "https://www.omdbapi.com/?apikey=" + process.env.APIKEY + "&"


var app = express();
var PORT = process.env.PORT || 3000;
var session


mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/crud-mongo');
var User = require("./models/user")
var Item = require("./models/item");
const { nextTick } = require("process");


app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs')
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(cookieParser());


const oneDay = 1000 * 60 * 60 * 2;
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));

app.use("/", function(req, res, next){
    if(req.path != "/" && req.path != "/login" && req.path != "/register"){
        if(!req.session.userid){
            return res.sendStatus(400)
        }
    }
    next()
});

app.get("/", function(req,res){
    if(req.session.userid){
        res.redirect("/welcome")
    } else{
        res.render("pages/index")
    }
});

app.post("/login", async (req,res) =>{
    var userSearch = await User.findOne({username: req.body.username})
    if(req.body.op === 'login'){
        if (userSearch) {
            if(await bcrypt.compare(req.body.password,userSearch.password)){
                session = req.session
                session.userid = req.body.username
                res.redirect("/welcome")
            } else{
                console.log("wrong password")
                res.redirect("/")
            }
        } else{
            console.log("no user")
            res.redirect("/")
        }
    } else if (req.body.op === 'register'){
        res.render("pages/register")
    }
});

app.post("/register", async (req,res) => {
    if(req.body.op === 'register'){
        if(req.body.name != '' && req.body.email != '' && req.body.username != '' && req.body.password != '' && req.body.repeatpassword != '' && (req.body.password === req.body.repeatpassword)){
            var userSearch = await User.findOne({name : req.body.username})
            var emailSearch = await User.findOne({email : req.body.email})
            if(!userSearch && !emailSearch){
                encryptedPassword = await bcrypt.hash(req.body.password, 10);
                var newUser = User({
                    name : req.body.name,
                    username : req.body.username,
                    password : encryptedPassword,
                    email : req.body.email
                })
                await newUser.save()
                console.log("registered")
                res.redirect("/")
            } else{
                console.log("already registered")
                res.render("pages/register")
            }
        } else{
            console.log("input error")
            res.render("pages/register")
        }
    } else if(req.body.op === 'login'){
        res.redirect("/")
    }

});
app.get("/welcome", async (req,res) => {
    var itemsSearch = await Item.find({username : req.session.userid})
    var userSearch = await User.findOne({username : req.session.userid})
    res.render("pages/welcome", {items : itemsSearch , name : userSearch.name})
});

app.get("/add", function(req, res){
    res.render("pages/add",{search : {}})
});

app.get("/add/:movieID", async (req, res) => {
    const response = await fetch(example + "i=" + req.params.movieID)
    const data = await response.json()
    var itemsSearch = await Item.find({username : req.session.userid})
    var found = false
    console.log(data)
    if(itemsSearch){
        for(var i = 0; i < itemsSearch.length;i++){
            if(itemsSearch[i].imdbID === req.params.movieID){
                found = true
                console.log("duplicate")
            }
        }
    }
    if(!found){
        var newItem = Item ({
            username : req.session.userid,
            name : data.Title,
            year : data.Year,
            runtime : data.Runtime,
            release : data.Released,
            priority : "Medium",
            status : "Not started",
            img_src : data.Poster,
            imdbID : data.imdbID
        })
        if(req.session.userid){
            await newItem.save()
            console.log("Item saved!")
        }
        res.redirect("/welcome")
    } else{
        res.redirect("/add")
    }
});


app.post("/search", async (req,res) => {
    const response = await fetch(example + "s=" + req.body.title)
    const data = await response.json()
    cache = data.Search
    res.render("pages/add", {search : data.Search})
});

app.get("/edit/:imdbID", async (req, res) => {
    var itemsSearch = await Item.find({username : req.session.userid})
    var itemFound
    for(var i = 0; i < itemsSearch.length;i++){
        if(itemsSearch[i].imdbID === req.params.imdbID){
            itemFound = itemsSearch[i]
        }
    }
    res.render("pages/edit", {item : itemFound})
});

app.post("/update/:itemID", async (req,res) =>{
    if(req.body.op === "update") {
        await Item.findByIdAndUpdate(req.params.itemID, {priority : req.body.priority, status : req.body.status})
    } else if(req.body.op === "remove"){
        await Item.findOneAndRemove({_id : req.params.itemID})
    }
    res.redirect("/welcome")
});

app.get("/share", function(req,res){
    res.render("pages/share", {search : {}})
});

app.post("/share/search", async (req,res) =>{
    var items = await Item.find({username : req.body.usersearch})
    res.render("pages/share", {search : items})
});

app.get("/logout", function(req,res){
    req.session.destroy()
    res.redirect("/")
});

app.get("/profile", async (req,res) =>{
    userSearch = await User.findOne({username : req.session.userid})
    itemSearch = await Item.find({username : req.session.userid})
    var stats = {total : 0, completed : 0, watching : 0, nstarted : 0}
    stats.total = itemSearch.length
    for(var i = 0; i < itemSearch.length; i++){
        if(itemSearch[i].status === "Completed"){
            stats.completed += 1
        } else if (itemSearch[i].status === "Watching"){
            stats.watching += 1
        } else if (itemSearch[i].status === "Not started"){
            stats.nstarted += 1
        }
    }
    res.render("pages/profile", {user : userSearch, stats : stats})
});


app.listen(PORT, function() {
    console.log("App listening on PORT " + PORT);
});
  
