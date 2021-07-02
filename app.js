const express = require('express');
const app = express();
const ejsMate = require('ejs-mate');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const Joi = require('joi');
const path = require('path');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const Dish = require('./models/dish');
const Review = require('./models/review');
const review = require('./models/review');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const user = require('./models/user');


mongoose.connect('mongodb://localhost:27017/masterchef2', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(() => {
        console.log("MONGO CONNECTION OPEN!!!")
    })
    .catch(err => {
        console.log("OH NO MONGO CONNECTION ERROR!!!!")
        console.log(err)
    })

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(require("express-session")({
    secret: "SECRET",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
})

const validatedish = (req, res, next) => {
    const dishSchema = Joi.object({
        dish: Joi.object({
            title: Joi.string().required().min(5),
            steps: Joi.string().required().min(5)

        }).required()
    })
    const { error } = dishSchema.validate(req.body);
    if (error) {
        const msg = error.details.map(el => el.message).join(',')
        throw new ExpressError(msg, 400)
    }
    else {
        next()
    }
}
const isAuthor = async (req, res, next) => {
    const { id } = req.params;
    const dish = await Dish.findById(id);
    if (!dish.author.equals(req.user._id)) {
        return res.redirect('/dishes/' + dish._id);
    }
    next();
}
// ============================================================================
app.get('/register', (req, res) => {
    res.render('user/register');
})
app.post('/register', catchAsync(async (req, res, next) => {
    try {
        const { email, username, password } = req.body;
        const user = new User({ email, username });
        const regiteredUser = await User.register(user, password);
        req.login(regiteredUser, err => {
            if (err) return next(err);
            res.redirect('/dishes')
        })
    } catch (e) {
        res.redirect('register')
    }
}))
app.get('/login', (req, res) => {
    res.render('user/login');
})
app.post('/login', passport.authenticate('local', { successRedirect: '/dishes', failureRedirect: '/login/error' }), (req, res) => {
})
app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/dishes')
})
app.get('/login/error', (req, res) => {
    const text = "Invalid Credentials";
    res.render('error', { text });
})
// ============================================================================
app.get('/', (req, res) => {
    res.render('home');
})
app.get('/dishes/:id/report', isLoggedIn, catchAsync(async (req, res) => {
    const dish = await Dish.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    res.render('dish/report', { dish });
}))
app.get('/dishes', async (req, res) => {
    const dishs = await Dish.find({});
    res.render('dish/index', { dishs });
})
app.get('/dishes/italian', async (req, res) => {
    const dishs = await Dish.find({});
    res.render('dish/italian', { dishs });
})
app.get('/dishes/chinese', async (req, res) => {
    const dishs = await Dish.find({});
    res.render('dish/chinese', { dishs });
})
app.get('/dishes/asian', async (req, res) => {
    const dishs = await Dish.find({});
    res.render('dish/asian', { dishs });
})
app.get('/dishes/american', async (req, res) => {
    const dishs = await Dish.find({});
    res.render('dish/american', { dishs });
})
app.get('/dishes/french', async (req, res) => {
    const dishs = await Dish.find({});
    res.render('dish/french', { dishs });
})
app.get('/dishes/new', isLoggedIn, (req, res) => {
    res.render('dish/new')
})
app.post('/dishes', isLoggedIn, catchAsync(async (req, res, next) => {
    const dish = new Dish(req.body.dish);
    dish.author = req.user._id;
    await dish.save();
    res.redirect('/dishes')
}))
app.get('/dishes/:id', catchAsync(async (req, res) => {
    const dish = await Dish.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    console.log(dish)
    res.render('dish/show', { dish })
}))
app.get('/dishes/:id/edit', isLoggedIn, catchAsync(async (req, res) => {
    const dish = await Dish.findById(req.params.id);
    res.render('dish/edit', { dish });
}))
app.put('/dishes/:id', isAuthor, catchAsync(async (req, res) => {
    const { id } = req.params;
    const dis = await Dish.findByIdAndUpdate(id, { ...req.body.dish });
    res.redirect('/dishes/' + dis._id);
}))
app.delete('/dishes/:id', isLoggedIn, catchAsync(async (req, res) => {
    const { id } = req.params;
    const dish = await Dish.findById(id);
    if (!dish.author.equals(req.user._id)) {
        return res.redirect('/dishes/' + dish._id)
    }
    await Dish.findByIdAndDelete(id);
    res.redirect('/dishes');
}))
app.delete('/dishes/:id/reviews/:reviewId', catchAsync(async (req, res) => {
    const { id, reviewId } = req.params;
    await Dish.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    await Review.findByIdAndDelete(reviewId);
    res.redirect('/dishes/' + id)
}))
app.post('/dishes/:id/reviews', isLoggedIn, catchAsync(async (req, res) => {
    const dish = await Dish.findById(req.params.id);
    const review = new Review(req.body.review);
    review.author = req.user._id;
    await review.save();
    dish.reviews.push(review);
    await dish.save();
    res.redirect('/dishes/' + dish._id);
}))
// =============================================================================
app.all('*', (req, res, next) => {
    next(new ExpressError('Page not found', 404))
})
app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Woah!! Something went wrong';
    res.status(statusCode).render('error', { err });
})
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
}
app.listen(3000, () => {
    console.log('Serving on 3000')
})
