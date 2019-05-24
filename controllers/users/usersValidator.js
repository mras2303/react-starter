const { check } = require("express-validator/check");
const { REGISTER_USER, LOGIN_USER } = require("./methods");

exports.validate = method => {
  switch (method) {
    case REGISTER_USER: {
      return [
        check("firstName", "First name field is required")
          .not()
          .isEmpty(),
        check(
          "firstName",
          "Please enter a first name between 2 and 30 characters"
        ).isLength({
          min: 2,
          max: 30
        }),
        check("lastName", "Last name field is required")
          .not()
          .isEmpty(),
        check(
          "lastName",
          "Please enter a last name between 2 and 30 characters"
        ).isLength({
          min: 2,
          max: 30
        }),
        check("email", "Email field is required")
          .not()
          .isEmpty(),
        check("email", "Please enter a valid email").isEmail(),
        check("password", "Password field is required")
          .not()
          .isEmpty(),
        check(
          "password",
          "Please enter a password with 6 or more characters"
        ).isLength({ min: 6 })
      ];
    }
    case LOGIN_USER: {
      return [
        check("email", "Email field is required")
          .not()
          .isEmpty(),
        check("email", "Please enter a valid email").isEmail(),
        check("password", "Password field is required")
          .not()
          .isEmpty()
      ];
    }
  }
};