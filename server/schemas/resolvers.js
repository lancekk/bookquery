const {AuthenticationError} = require('apollo-server-express');
const { saveBook } = require('../controllers/user-controller');
const {User, Book} = require('../models');
const {signToken} = require('../utils/auth');

const USER_SELECT_STRING = "-__v -password";
const LOGIN_FAIL_STRING = "Invalid email or password";

const resolvers = {
  Query: {
    me: async (parent, args, context) => {
      if (context.user) {
        const userData = await User.findOne({ _id: context.user._id })
          .select(USER_SELECT_STRING)
          .populate('savedBooks');

        console.log(`userData: ${userData}`);
        return userData;
      }
      throw new AuthenticationError('Not logged in');
    },
    user: async (parent, {username}) => {
      return User.findOne({username})
      .select(USER_SELECT_STRING)
      .populate('savedBooks')
    }
  },
  Mutation: {
    addUser: async (parent, args) => {
      const user = await User.create(args);
      const token = signToken(user);
      return {token, user};
    },
    login: async (parent, {email, password}) => {
      const user = await User.findOne({email});

      if (!user) {
        throw new AuthenticationError(LOGIN_FAIL_STRING);
      }

      const correctPw = await user.isCorrectPassword(password);

      if (!correctPw) {
        throw new AuthenticationError(LOGIN_FAIL_STRING);
      }

      const token = signToken(user);
      return {token, user};
    },
    saveBook: async (parent, { book }, context) => {
      // console.log(`context.user: ${context?.user}`);
      // console.log('context.user');
      // console.log(context.user);
      if (context.user) {
        const updatedUser = await User.findOneAndUpdate(
          {
            _id: context.user._id,
          },
          {$addToSet: {savedBooks: book}},
          {new: true, runValidators: true}
        );
        return updatedUser;
      }
      else {
        throw new AuthenticationError("Save book requires login");
      }
    },
    removeBook: async (parent, {bookId}, context) => {
      if (!context.user) {
        throw new AuthenticationError("Delete book requires login");
      }
      else {
        const updatedUser = await User.findOneAndUpdate(
          {_id: context?.user?._id},
          {$pull: {savedBooks: {bookId}}},
          {new: true}
        );
        return updatedUser;
      }
    }
  },
};

module.exports = resolvers;

