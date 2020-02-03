"use strict";

const express = require("express");
//const expressValidator = require("express-validator");
const path = require("path");
const hbs = require('express-handlebars')
const bcrypt   = require('bcrypt')
const socketio = require('socket.io')

require('dotenv').config()
const SESSION_TIMEOUT = parseInt(process.env.SESSION_TIMEOUT) || 60*60*1000 // one hour
const PASSWORD_SALT_HASH_ROUNDS = parseInt(process.env.PASSWORD_SALT_HASH_ROUNDS) || 10
const SECRET_KEY = process.env.SECRET || "secret"
const SQLITE_FILENAME = process.env.SQLITE_FILENAME || "db.sqlite3"


/* local imports */
const db = require('./bin/db')(SQLITE_FILENAME)
const auth = require("./bin/auth")(db);

var app = express();
//app.use(expressValidator());

const server = require('http').createServer(
    /*
    { // for https
    key: fs.readFileSync('./test_key.key'),
    cert: fs.readFileSync('./test_cert.crt'),
    ca: fs.readFileSync('./test_ca.crt'),
    requestCert: false,
    rejectUnauthorized: false
    },
    */
app);
const io = socketio.listen(server);

// used to parse out value fields from forms
app.use(require('body-parser').urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

// Configure view engine to render Handlebars templates.
app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'layout', layoutsDir: __dirname + '/views/layouts/'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Express and Passport Session
const session = require("express-session");
// set up session store at DB
const KnexSessionStore = require("connect-session-knex")(session);

const store = new KnexSessionStore({
knex: db.knex,
tablename: "sessions" // optional. Defaults to 'sessions'
});


app.use(session({
 secret: SECRET_KEY,
 resave: false,
 saveUninitialized: false,
 cookie: {
   maxAge: SESSION_TIMEOUT
 },
 store: store
 }))

app.use(auth.passport.initialize());
app.use(auth.passport.session());

const cookieParser = require('cookie-parser');
const passportSocketIo = require('passport.socketio');
io.use(
    passportSocketIo.authorize({
    key: 'connect.sid',
    secret: SECRET_KEY,
    store: store,
    passport: auth.passport,
    cookieParser: cookieParser
}));

const sockets = require("./bin/sockets")(io, db, passportSocketIo);

function validatePhoneNumber(tel) {
    var re = /^\+{0,2}([\-\. ])?(\(?\d{0,3}\))?([\-\. ])?\(?\d{0,3}\)?([\-\. ])?\d{3}([\-\. ])?\d{4}/;
    return re.test(tel);
};

// flash message middleware for redirects
app.use((req, res, next) => {
    res.locals.message = req.session.message;
    delete req.session.message;
    next()
})

// Define routes.
app.get('/', auth.ensureAuthenticated,
  function(req, res) {
    res.render('home', { user: req.user, css: ['chat.css'] });
  });

app.get('/login',  auth.ensureNotAuthenticated,
  function(req, res){
    res.render('login');
  });

app.post('/login',  auth.ensureNotAuthenticated, function(req, res, next) {
    const {tel, password} = req.body;
    //catch "Missing credentials" error
    if (!tel || !password ) {
        req.session.message = {'title': "Ошибка", 'text': "Заполните все поля"};
        return res.redirect('/login');
    }

    auth.passport.authenticate('local', function(err, user, info) {
    if (err) {
      return next(err);
    }
    if (!user) {
          //req.session.message = {'title': "Ошибка", 'text': info.message};
      let message = {'title': "Ошибка", 'text': info.message}
      return res.render('login', {message, tel, password});
    }
    req.logIn(user, function(err) {
    if (err) { return next(err); }
        return res.redirect('/');
    });
    })(req, res, next);
});


  // register route
  app.get('/register',  auth.ensureNotAuthenticated, (req, res) => {
      res.render('register')
  })

   app.post('/register',  auth.ensureNotAuthenticated, (req, res, next) => {
       var { tel, name, password } = req.body;
       var message = null;
       if (!name || !tel || !password) {
            message = {'title': "Ошибка", 'text': "Заполните все поля"}
       } else if (!validatePhoneNumber(tel)) {
           message = {'title': "Ошибка", 'text': "Некорректный номер телефона."}
       } else if (password.length < 6) {
           message = {'title': "Ошибка", 'text': "Пароль должен быть не короче шести символов"}
       }

       if (message) {
           return res.render('register', {message, tel, name, password});
       }

       db.GetUserByPhone(tel).first().then(id => {
           if (id) {
               let message = {'title': "Ошибка", 'text': 'Номер уже зарегистрирован'}
               return res.render('register', {message, tel, name, password});
           } else {
               bcrypt.hash(password, PASSWORD_SALT_HASH_ROUNDS, function(err, pwd_hash) {
                   if (err) {
                       return next(err);
                   }
                 // Store hashed password in the DB.
                   db.AddUser(tel, name, pwd_hash).then(id => {
                       // registration successful;
                       console.log('New user added', id);
                       // automatically subscribe user to common room
                       db.AddUserToRoom(id[0], 0)
                       // ... and redirect to login
                       req.session.message = {'title': "Регистрация завершена", 'text': "Вы можете войти в систему"};
                       res.redirect('/login');
                   })
               });
           }
       })
  })

app.get('/logout',  auth.ensureAuthenticated,
  function(req, res){
    req.logout();
    res.redirect('/');
  });

app.get('/profile',  auth.ensureAuthenticated,
  function(req, res){
    //  console.log(req)
    db.ReturnUser(req.user.id).then(user_info => {
        console.log(user_info)

        res.render('profile', { user: user_info });
    })

  });

  // error handlers
  // catch 404 and forward to error handler
  app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
  });

  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: {}
      });
  });


// run server
server.listen(3000);
