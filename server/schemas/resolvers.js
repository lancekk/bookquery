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
      const tk = signToken(user);
      return {tk, user};
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

      const tk = signToken(user);
      return {tk, user};
    },
    saveBook: async (parent, { book }, context) => {
      console.log(context?.user);
      if (context.user) {
        const updatedUser = await User.findOneAndUpdate(
          {_id: context.user._id},
          {$addToSet: {savedBooks: book}},
          {new: true, runValidators: true}
        );
        return updatedUser;
      }
      else {
        throw new AuthenticationError("Save book requires login");
      }
    },
    deleteBook: async (parent, {bookId}, context) => {
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

