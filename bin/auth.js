"use strict";

module.exports = function(db) {
    const bcrypt   = require('bcrypt')
    const passport = require("passport");
    const LocalStrategy = require("passport-local").Strategy;


// The local strategy require a `verify` function which receives the credentials
// (`username` and `password`) submitted by the user.  The function must verify
// that the password is correct and then invoke `cb` with a user object, which
// will be set at `req.user` in route handlers after authentication.
passport.use(new LocalStrategy({
                usernameField: 'tel',
        },
    function(tel, password, done) {
        if (tel.length == 0) {
            return done(null, false, { message: 'Введите номер телефона' });
        }
        db.GetUserByPhone(tel).then((user) => {
            if (!user) {
                return done(null, false, { message: 'Аккаунт не зарегистрирован' });
            }
            // Match password
            bcrypt.compare(password, user.pwd_hash, (err, isMatch) => {
            if (err) {
                throw err;
            }
            if (isMatch) {
                return done(null, user);
            } else {
                return done(null, false, { message: 'Неверный пароль' });
            }
        })
    })
}));


    // Configure Passport authenticated session persistence.
    //
    // In order to restore authentication state across HTTP requests, Passport needs
    // to serialize users into and deserialize users out of the session.  The
    // typical implementation of this is as simple as supplying the user ID when
    // serializing, and querying the user record by ID from the database when
    // deserializing.
    passport.serializeUser(function(user, cb) {
      cb(null, user.id);
    });

    passport.deserializeUser(function(id, cb) {
        db.ReturnUserInfo(id).then((user) => {
            cb(null, user);
        }).catch(err => {
            return cb(err)
        });
    });

// middleware helper functions
// send unauthenticated users to login; proceed otherwise
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

// redirect authenticated users to index page; proceed otherwise
function ensureNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect('/')
  }
  next()
}

return  {
    passport,
    ensureAuthenticated,
    ensureNotAuthenticated
  };

}
