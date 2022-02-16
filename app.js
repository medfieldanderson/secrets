//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const port = process.env.PORT || 3000;
const app = express();


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

mongoose.connect("mongodb://localhost:27017/userDB");

// use internal mongoose Schema (not just javascript object)
const userSchema = new mongoose.Schema ({
  email: String,
  password: String
});

const User = new mongoose.model("User", userSchema);

app.get("/", (req, res)=> {
  res.render("home");
});

app.get("/login", (req, res)=> {
  res.render("login");
});

app.get("/register", (req, res)=> {
  res.render("register");
});

app.post("/register", async (req, res) => {

  bcrypt.hash(req.body.password, saltRounds, async (err, hash) =>{

    const newUser = new User({
      email: req.body.username,
      password: hash
    });
    try{
      const savedUser = await newUser.save();
      if(savedUser) {
        console.log(`Successfully saved ${savedUser}`);
      }
      res.render("secrets");
    } catch (error) {
      console.log(error);
    }
  });
});

app.post("/login", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  try {
    const foundUser = await User.findOne({email: username});
    if(foundUser) {
      console.log(`Successfully found user ${foundUser} ...`);
      bcrypt.compare(password, foundUser.password, async (err, result) => {
        if(result === true) {
          console.log(`... and successfully Logged In`);
          res.render("secrets");
        } else {
          console.log(`WRONG PASSWORD!`);
        }
      });
    } else {
      console.log(`${username} NOT FOUND`);
    }
  } catch (error) {
    console.log(error);
  }
})

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
})
