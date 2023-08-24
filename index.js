const express = require('express');
const app = express();
const port = process.env.PORT || 8080;
const { v4: uuidv4 } = require('uuid');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const session = require('express-session');
const cookieParser = require("cookie-parser");

const oneDay = 1000 * 60 * 60 * 24;
app.use(session({
    secret: "supersecretkey",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));

app.use(cookieParser());

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }))
app.use(methodOverride('_method'));

session.currentUser = null;
session.currentWarning = null;
//let currentUser;
//let currentWarning;

const uri = "mongodb+srv://anton:Tqbfjotld16.@cluster0.ihrpfrg.mongodb.net/?retryWrites=true&w=majority";
mongoose.connect(uri);
// .then(() => {
//     console.log("YES!")
// })
// .catch(error => {
//     console.log("YIKES!" + error)
// });

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});

const User = mongoose.model('User', userSchema);

const commentSchema = new mongoose.Schema({
    comment: String,
    username: String,
    id: String
});

const Comment = mongoose.model('Comment', commentSchema);

app.listen(port, () => {
    console.log("LISTENING ON PORT " + port);
});

//home
app.get('/', (req, res) => {
    let warning = req.session.currentWarning;
    req.session.currentWarning = "";
    res.render('index', { currentUser:req.session.currentUser, warning });
});

//login
app.get('/login', (req, res) => {
    let warning = req.session.currentWarning;
    req.session.currentWarning = "";
    if (!req.session.currentUser) {
        res.render('login', { currentUser:req.session.currentUser, warning });
    } else {
        warning = "Already logged in, redirected to logout";
        res.redirect('/logout');
    }
});

app.post('/login', (req, res) => {
    const tryUser = new User({
        username: req.body.username,
        password: req.body.password
    });
    User.findOne({ username: tryUser.username }).then(data => {
        if (data.password == tryUser.password) {
            req.session.currentUser = tryUser;
            req.session.currentWarning = "Successfully logged in!";
            res.redirect('/');
        } else {
            req.session.currentWarning = "Incorrect username or password";
            res.redirect('/login');
        }
    });
});

//logout
app.get('/logout', (req, res) => {
    let warning = req.session.currentWarning;
    req.session.currentWarning = "";
    if (req.session.currentUser) {
        res.render('logout', { currentUser:req.session.currentUser, warning });
    } else {
        warning = "Not logged in, redirecting to login";
        res.render('login', { currentUser:req.session.currentUser, warning });
    }
});

app.post('/logout', (req, res) => {
    if (req.session.currentUser) {
        req.session.currentUser = null;
    }
    res.redirect('/login');
});

//register
app.get('/register', (req, res) => {
    let warning = req.session.currentWarning;
    req.session.currentWarning = "";
    if (req.session.currentUser) {
        req.session.currentWarning = "Already logged in, redirecting to user page";
        res.redirect('/user');
    } else {
        res.render('register', { currentUser:req.session.currentUser, warning });
    }
});

app.post('/register', (req, res) => {
    const newUser = new User({
        username: req.body.username,
        password: req.body.password
    });
    User.findOne({ username: newUser.username }).then(data => {
        if (data) {
            req.session.currentWarning = "User " + newUser.username + " already exists!";
            res.redirect('/register')
        } else {
            req.session.currentWarning = "User successfully created!";
            User.create(newUser).then(res.redirect('/login'));
        }
    });
    //res.redirect('/login');
});

//all comments
app.get('/comments', (req, res) => {
    let warning = req.session.currentWarning;
    req.session.currentWarning = "";
    Comment.find({}).then(data => {
        res.render('comments', { currentUser:req.session.currentUser, warning, posts: data })
    });
});

//new comment
app.get('/comments/new', (req, res) => {
    let warning = req.session.currentWarning;
    req.session.currentWarning = "";
    res.render('new', { currentUser:req.session.currentUser, warning });
});

app.post('/comments/new', (req, res) => {
    if (req.session.currentUser) {
        const newComment = new Comment({
            comment: req.body.comment,
            username: req.session.currentUser.username,
            id: uuidv4()
        });
        req.session.urrentWarning = "Posted new comment!"
        Comment.create(newComment).then(res.redirect('/comments'));
    } else {
        req.session.currentWarning = 'Please log in before posting!';
        res.redirect('/login')
    }
});

//per comment
app.get('/comments/:id', (req, res) => {
    let warning = req.session.currentWarning;
    req.session.currentWarning = "";
    Comment.findOne({ id: req.params.id }).then(data => {
        if (data) {
            const post = data;
            res.render('commentpage', { currentUser:req.session.currentUser, warning, post });
        } else {
            req.session.currentWarning = "Could not find comment";
            res.redirect('/comments');
        }
    });
});

app.patch('/comments/:id', (req, res) => {
    let warning = req.session.currentWarning;
    req.session.currentWarning = "";
    Comment.findOne({ id: req.params.id }).then(data => {
        if (data && data.username == req.session.currentUser.username) {
            const updatedComment = data;
            updatedComment.comment = req.body.comment;
            updatedComment.save();
            req.session.currentWarning = "Successfully edited comment!";
            res.redirect('/comments/' + req.params.id);
        } else {
            req.session.currentWarning = "Could not find comment";
            res.redirect('/comments');
        }
    });
});

app.delete('/comments/:id', (req, res) => {
    req.session.currentWarning = "Successfully deleted comment!";
    Comment.deleteOne({ id: req.params.id }).then(res.redirect('/comments'));
});

app.get('/user', (req, res) => {
    let warning = req.session.currentWarning;
    req.session.currentWarning = "";
    if (req.session.currentUser) {
        Comment.find({ username: req.session.currentUser.username }).then(data => {
            res.render('user', { currentUser:req.session.currentUser, warning, posts: data })
        });
    } else {
        req.session.currentWarning = "Not logged in, redirected to login";
        res.redirect('/login');
    }
});

app.get('', (req, res) => {
    res.send("ERROR 404");
});