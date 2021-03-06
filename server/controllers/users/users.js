const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const User = require('../../models/User');
const messages = require('../messages');
const nodemailer = require('nodemailer');

exports.activateUser = async (req, res) => {
	const { activationKey } = req.params;
	const user = await User.findOne({ activationKey });
	if (user) {
		if (user.emailVerified) {
			return res.status(400).json({ msg: messages.KEY_HAS_BEEN_ACTIVATED });
		}
		user.emailVerified = true;
		await user.save();
		return res.status(200).json({ msg: messages.USER_ACTIVATED });
	}
	return res.status(400).json({ msg: messages.ACTIVATION_KEY_IS_INCORRECT });
};

exports.getUser = async (req, res) => {
	try {
		const user = await User.findById(req.user.id)
			.select('-_id')
			.select('-password')
			.select('-activationKey')
			.select('-updatedAt')
			.select('-__v');
		res.json({ user });
	} catch (err) {
		res.status(500).send(messages.SERVER_ERROR);
	}
};

exports.registerUser = (req, res) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res
			.status(400)
			.json({ errors: errors.array({ onlyFirstError: true }) });
	}

	const {
		firstName,
		lastName,
		email = email.toLowerCase(),
		password
	} = req.body;

	User.findOne({ email }).then(user => {
		if (user) {
			return res
				.status(400)
				.json({ errors: [{ msg: messages.EMAIL_ALREADY_EXISTS }] });
		} else {
			const newUser = new User({
				firstName,
				lastName,
				email,
				password: bcrypt.hashSync(password),
				activationKey: bcrypt.hashSync(email).replace(/\//g, '')
			});

			newUser
				.save()
				.then(user => {
					const payload = {
						user: {
							id: user.id
						}
					};
					jwt.sign(
						payload,
						config.get('jwtSecret'),
						{ expiresIn: 3600 },
						(err, token) => {
							if (err) throw err;
							sendVerificationEmail(newUser);
							res.json({
								msg: messages.USER_REGISTERED,
								token: 'Bearer ' + token,
								expTime: 3600
							});
						}
					);
				})
				.catch(err => res.status(500).send(messages.SERVER_ERROR, err));
		}
	});
};

exports.loginUser = (req, res) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res
			.status(400)
			.json({ errors: errors.array({ onlyFirstError: true }) });
	}
	const { password, email = email.toLowerCase(), remember } = req.body;

	User.findOne({ email }).then(user => {
		if (!user) {
			return res
				.status(400)
				.json({ errors: [{ msg: messages.INVALID_CREDENTIALS }] });
		} else {
			bcrypt.compare(password, user.password).then(isMatch => {
				if (isMatch) {
					const payload = {
						user: {
							id: user.id
						}
					};
					const expiresIn = remember ? 43200 : 3600;
					jwt.sign(
						payload,
						config.get('jwtSecret'),
						{ expiresIn },
						(err, token) => {
							if (err) throw err;
							res.json({
								msg: messages.USER_LOGGEDIN,
								token: 'Bearer ' + token,
								expTime: expiresIn
							});
						}
					);
				} else {
					return res
						.status(400)
						.json({ errors: [{ msg: messages.INVALID_CREDENTIALS }] });
				}
			});
		}
	});
};

exports.deleteUser = (req, res) => {
	User.findOneAndRemove({ _id: req.user.id })
		.then(() => res.json({ msg: messages.USER_DELETED }))
		.catch(() => res.status(500).send(messages.SERVER_ERROR));
};

exports.updateUserData = async (req, res) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		return res.status(400).json({ errors: errors.array({ onlyFirstError: true }) });
	}

	const user = await User.findById(req.user.id);
	if (user) {
		const { firstName, lastName, password } = req.body;
		let { email } = req.body;

		if (firstName) user.firstName = firstName;
		if (lastName) user.lastName = lastName;

		if (email) {
			email = email.toLowerCase();
			if (email !== user.email) {
				const emailExist = await User.findOne({ email });
				if (emailExist) {
					return res.status(400).json({ errors: [{ msg: messages.EMAIL_ALREADY_EXISTS }] });
				}
				user.email = email;
				user.activationKey = bcrypt.hashSync(email).replace(/\//g, '');
				user.emailVerified = false;
				sendVerificationEmail(user);
			}
		}
		if (password) {
			user.password = bcrypt.hashSync(password);
		}
		await user.save();
		return res.json({ msg: messages.USER_UPDATED });
	} else {
		return res.status(500).send(messages.SERVER_ERROR);
	}
};

const sendVerificationEmail = user => {
	const mailSettings = config.get('mail.settings');
	const mailCredentials = config.get('mail.credentials');
	const transporter = nodemailer.createTransport({
		...mailSettings,
		auth: mailCredentials
	});

	const mailOptions = {
		from: 'support <natripareact@gmail.com>',
		to: user.email,
		subject: 'Account Activation',
		html: `
      To activate your account, click this link
      <a href="http://localhost:5000/api/users/activate/${
	user.activationKey
}">Activate Account</a>
    `
	};

	transporter.sendMail(mailOptions, (err, data) => {
		if (err) throw err;
	});
};
