//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const port = process.env.PORT || 3000;

const app = express();

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

// SETUP SESSION - https://www.npmjs.com/package/express-session
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

// INITIALIZE PASSPORT - https://www.passportjs.org/docs/
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB");

// use internal mongoose Schema (not just javascript object)
const userSchema = new mongoose.Schema({
  email: String,
  googleId: String,
  password: String
});

// MONGOOSE PASSPORT PLUGIN
userSchema.plugin(passportLocalMongoose);
// FROM NPM PACKAGE mongoose-findorcreate - see require above;
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// see Usage
// Simplified Passport/Passport-Local Configuration
// - https://www.npmjs.com/package/passport-local-mongoose
passport.use(User.createStrategy());

// WRITES COOKIE
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
    // ,
    // userProfileURL was a fix for Google +; NOT NEEDED ANYMORE
    // userProfileURL: "https://www.googleapis.com/oauth2/v3/userInfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(`GOOGLE PROFILE ID:  ${profile.id} for ${profile.displayName}`);
    console.log(JSON.stringify(profile));
    // THIS IS NOT WORKING TO CREATE A RECORD IN MONGODB.
    User.findOrCreate({
      googleId: profile.id,
      email: profile.emails[0].value
    }, function(err, user) {
      return cb(err, user);
    });
    console.log(`PROFILE:  ${profile}`);
  }
));

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

// URI setup in google = THIS IS WHERE GOOGLE CALLS US BACK
app.get("/auth/google/secrets",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    console.log(`Secrets route - Authenticated`);
    res.render("secrets");
  } else {
    res.redirect("login");
  }
});

app.get("/logout", (req, res) => {
  // see https://www.passportjs.org/concepts/authentication/logout/
  req.logout();
  res.redirect("/");
});

app.post("/register", async (req, res) => {
  console.log(req.body.username);
  console.log(req.body.password);
  try {
    console.log(`Register`);
    const user = await User.register({
      username: req.body.username
    }, req.body.password);
    console.log(`Authenticate: ${user}`);
    // req & res are same as passed in from route
    await passport.authenticate("local")(req, res, function() {
      console.log(`Authenticated`);
      res.redirect("secrets");
    });
  } catch (error) {
    console.log(error);
    res.redirect("/register");
  }
});

app.post("/login", async (req, res) => {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  console.log(`Login...`);
  req.login(user, async function(err) {
    if (err) {
      console.log(err);
    } else {
      try {
        // login comes from passport
        await passport.authenticate("local")(req, res, function() {
          console.log(`Login Authenticated`);
          res.redirect("/secrets");
        })
      } catch (error) {
        console.log(`Login FAILED:  ${error}`);
      }
    }
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
})
