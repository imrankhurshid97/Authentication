//jshint esversion:6
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');


const app = express();

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://localhost:27017/userDB",
{   useNewUrlParser : true, useUnifiedTopology: true },() =>{
    console.log("Connected with DB");
});

const userSchema = new mongoose.Schema({
    email : String,
    password : String
});
console.log(process.env.API_KEY);
var secret = "Thisthesecret";
userSchema.plugin(encrypt,{secret : process.env.SECRET, encryptedFields : ["password"]});

const User = mongoose.model("User",userSchema);


app.get("/",(req,res) =>{

    res.render("home");
});
app.get("/login",(req,res) =>{

    res.render("login");
});

app.get("/register",(req,res) =>{
    res.render("register");
});
app.post("/register",(req,res) => {
    

    const newUser = new User({
        email : req.body.username,
        password : req.body.password
    }); 

    newUser.save((err) =>{
        if(err)
        {
            res.send(err);
        }
        else
            res.render("secrets");
    })

});

app.post("/login",(req,res) => {
    const email = req.body.username;
    const password = req.body.password;
    User.findOne({email : email},(err,result) =>{
        if(err)
            res.send(err);
        else
        {
            if(result)
            {
                if(result.password === password)
                    res.render("secrets");
                else
                    res.send("wrong password");
            }
        }
    });

});

app.listen(process.env.PORT || 3000, () => console.log("Server Started"));