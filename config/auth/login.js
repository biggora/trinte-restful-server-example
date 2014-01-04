/**
 * Created by Alex on 12/27/13.
 */
var auth = require( 'trinte-auth' )
    , config = require( '../configuration' )
    , passport = require( 'passport' )
    , LocalStrategy = require( 'passport-local' ).Strategy
    , BasicStrategy = require( 'passport-http' ).BasicStrategy
    , ClientPasswordStrategy = require( 'passport-oauth2-client-password' ).Strategy
    , BearerStrategy = require( 'passport-http-bearer' ).Strategy;

/*  LocalStrategy */
passport.use( new LocalStrategy( {
        usernameField: 'sign_login',
        passwordField: 'sign_password'
    },
    function(username, password, done) {
        User.findOne( {
            username: username
        }, function(err, user) {
            if( err ) {
                return done( err );
            }
            if( !user ) {
                return done( null, false, { message: 'Incorrect username.' } );
            }
            if( !user.validPassword( password ) ) {
                return done( null, false, { message: 'Incorrect password.' } );
            }
            return done( null, user );
        } );
    }
) );

/*  BasicStrategy */
passport.use( new BasicStrategy(
    function(client_id, client_secret, done) {
        console.log( 'BasicStrategy Start!' );
        Client.findOne( { id: client_id }, function(err, client) {
            if( err ) {
                return done( err );
            }
            if( client === null ) {
                return done( null, false );
            }
            if( !client.validSecret( client_secret ) ) {
                return done( null, false );
            }
            console.log( 'BasicStrategy completed!' );
            return done( null, client );
        } );
    }
) );

/*  ClientPasswordStrategy */
passport.use( new ClientPasswordStrategy(
    function(client_id, client_secret, done) {
        console.log( 'ClientPasswordStrategy Start!' );
        Client.findOne( {
            active: 1,
            id: client_id
        }, function(err, client) {
            if( err ) {
                return done( err );
            }
            if( client === null ) {
                return done( null, false );
            }
            if( !client.validSecret( client_secret ) ) {
                return done( null, false );
            }
            console.log( 'ClientPasswordStrategy completed! ' );
            return done( null, client );
        } );
    }
) );

/*  BearerStrategy */
passport.use( new BearerStrategy(
    function(accessToken, done) {
        console.log( "BearerStrategy: ", accessToken )
        Token.findOne( {
            access_token: accessToken
        } ).exec( function(err, token) {
                if( err ) {
                    return done( err );
                }
                if( token === null ) {
                    return done( { message: 'Token not found' } );
                }
                if( Math.round( (Date.now() - token.created) / 1000 ) > config.oauth.token_live ) {
                    token.destroy( function(err) {
                        if( err ) return done( err );
                    } );
                    return done( { message: 'Token expired' } );
                }

                User.findById( token.user_id, function(err, user) {
                    if( err ) {
                        return done( err );
                    }
                    if( !user ) {
                        return done( { message: 'Unknown user' } );
                    }
                    var info = { scope: '*' }
                    done( null, user, info );
                } );
            } );
    }
) );

passport.serializeUser( function(user, done) {
    done( null, user.id );
} );

passport.deserializeUser( function(id, done) {
    User.findById( id, function(err, user) {
        done( err, user );
    } );
} );

auth.localAuth = function localAuth(path) {
    return passport.authenticate( 'local', {
        successReturnToOrRedirect: '/',
        failureRedirect: path || '/login',
        failureFlash: true,
        successFlash: 'Welcome!'
    } );
};

auth.bearerAuth = function bearerAuth() {
    return passport.authenticate( 'bearer', {
        session: false
    } );
};

auth.validateCSRF = function validateCSRF() {
    return  function(req, res, next){
        if (req.session._csrf !== req.csrfToken()) return next(403);
        next();
    };
};

auth.passport = passport;

module.exports = auth;