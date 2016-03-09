import express from 'express';
const router = express.Router();
import passport from 'passport';
import GithubStrategy from 'passport-github';
import {SuggestionsController} from '../controllers/suggestionsController';
const Strategy = GithubStrategy.Strategy;
import {TestsService} from '../services/testsService';

import config from '../ludwig-conf.js';
const testsService = new TestsService(config.mongo);

passport.serializeUser((user, done) => {
	done(null, user);
});

passport.deserializeUser((obj, done) => {
	done(null, obj);
});

passport.use('github', new Strategy({
	clientID: process.env.npm_config_ludwig_clientID,
	clientSecret: process.env.npm_config_ludwig_clientSecret,
	callbackURL: config.github.authentication_callback
}, (accessToken, refreshToken, profile, done) => {
	profile.accessToken = accessToken;
	profile.refreshToken = refreshToken;
	return done(null, profile);
}));

// /test route not even declared if not explicitly enabled in configuration
if (process.env.npm_config_ludwig_testFeatures) {
	router.get('/test', (req, res) => {
		res.render('test');
	});
}

router.get('/createSuggestion',
	(req, res, next) => {
		req.session.title = req.query.title;
		req.session.description = req.query.description;
		req.session.state = req.query.state;
		next();
	},
	passport.authenticate('github', {scope: [ 'repo' ]}));

router.get('/github_callback', passport.authenticate('github', {failureRedirect: '/authKO'}), (req, res) => {
	const suggestionsController = new SuggestionsController();
	suggestionsController.createPullRequest(req.session.passport.user.accessToken, req.session.title, req.session.description, req.session.state, res);
});


router.get('/listTests', (req, res) => {
	testsService.getMostRecentTestSuite((err, mostRecentTestSuite) => {
		if(!err) {
			res.render('listTests', {testSuite:mostRecentTestSuite});
		} else {
			res.render('ko');
		}
	});
});

module.exports = router;
