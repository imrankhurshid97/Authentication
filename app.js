//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');
// const e = require('express');

// const encrypt = require('mongoose-encryption');
// const bcrypt = require('bcrypt');

// const saltRounds = 10;


const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: true,
  }));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB",
{   useNewUrlParser : true, useUnifiedTopology: true },() =>{
    console.log("Connected with DB");
});
mongoose.set("useCreateIndex",true); 

const userSchema = new mongoose.Schema({
    username : String,
    password : String,
    googleId : String,
    facebookId : String,
    secret : String
});
// console.log(process.env.API_KEY);
// var secret = "Thisthesecret";
// userSchema.plugin(encrypt,{secret : process.env.SECRET, encryptedFields : ["password"]});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });

  
//Strategy for FaceBook  
passport.use(new FacebookStrategy({
    clientID: process.env.FB_CLIENT_ID,
    clientSecret: process.env.FB_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//Strategy for Google
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL : "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));




app.get("/",(req,res) =>{
    res.render("home");
});

//oAuth for FACEBOOK

app.get('/auth/facebook',
  passport.authenticate('facebook',{ scope: ['email','user_likes']}));

app.get('/auth/facebook/secrets',passport.authenticate('facebook', { failureRedirect: '/login' }),function(req, res) {
    
    res.redirect('/secrets');
});

//OAUTH for GOOGLE

app.get("/auth/google",passport.authenticate("google", { scope : ["profile"] } ) );

app.get("/auth/google/secrets",passport.authenticate("google",{failureRedirect : "/login"}),function(req,res){

    res.redirect("/secrets");
});

app.get("/login",(req,res) =>{

    res.render("login");
});

app.post("/login",(req,res) => {

    const user = new User({
        username : req.body.username,
        password : req.body.password 
    });
    req.login(user,function(err){
        if(err)
            console.log(err);
        else
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
        });
    });

});

app.get("/logout",(req,res) =>{

    req.logout();
    res.redirect("/");
});


app.get("/register",(req,res) =>{
    res.render("register");
});

app.post("/register",(req,res) => {

    
    User.register({username : req.body.username},req.body.password,(err,user) =>{
            if(err)
            {
                console.log(err);
                res.redirect("/register");
            }
            else
            {
                passport.authenticate("local")(req,res,function(){
                    res.redirect("/secrets");
                });
            }
                    
    });

});

app.get("/secrets",(req,res) =>{
    User.find({"secret" : {$exists : true, $ne : null}},function(err,result){

        if(err)
            console.log(err);
        else
        {
            if(result)
            {
                res.render("secrets",{userWithSecret : result});
            }         
        }
    });

});

app.get("/submit",function(req,res){
    if(req.isAuthenticated())
        res.render("submit");
    else
        res.redirect("/login");
});

app.post("/submit",(req,res) =>{

    const newSecret = req.body.secret;
    // res.send(req.user.id);
    User.findById(req.user.id,function(err,result){

        if(err)
            console.log(err);
        else
        {
            if(result)
            {
                result.secret = newSecret;
                result.save(function(err){
                    if(err)
                        console.log(err);
                    else
                        res.redirect("/secrets");
                });
            }
        }
    });
});

app.listen(process.env.PORT || 3000, () => console.log("Server Started"));