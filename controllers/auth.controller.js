import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import ejs from "ejs";
import path from "path";
import { createActivatinToken } from "../utils/createActivationToken.js";
import { sendMail } from "../utils/sendMail.js";
import getDirname from "../utils/dirname.js";
import jwt from "jsonwebtoken";
import { createError } from "../utils/createError.js";
import { client } from "../utils/redis.js";

export const register = async (req, res, next) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return next(createError(400, "A user with this email already exists"));
    }

    const saltRounds = 10;
    const salt = bcrypt.genSaltSync(saltRounds);
    const hash = bcrypt.hashSync(req.body.password, salt);

    const newUser = new User({
      name: req.body.name,
      email: req.body.email,
      password: hash,
      avatar: req.body.avatar || "",
    });

    const activationToken = createActivatinToken(newUser);

    const activationCode = activationToken.activationCode;
    const data = { user: { name: newUser.name }, activationCode };

    let __dirname = getDirname(import.meta.url);

    __dirname = __dirname
      .replace(/\\/g, "/")
      .replace(/\/controllers$/, "/controllers/");

    const html = await ejs.renderFile(
      path.join(__dirname + "../mails/activation-mail.ejs"),
      data
    );

    try {
      await sendMail({
        email: newUser.email,
        subject: "Activate your account",
        template: "activation-mail.ejs",
        data,
      });

      res.status(200).json({
        success: true,
        message:
          "Please check your email: " +
          newUser.email +
          " to activate your account",
        activationToken: activationToken.token,
      });
    } catch (err) {
      return next(err);
    }
  } catch (err) {
    next(err);
  }
};

export const activateUser = async (req, res, next) => {
  try {
    const { activationToken, activationCode } = req.body;

    const tokenContent = jwt.verify(
      activationToken,
      process.env.JWT_ACTIVATION_KEY
    );

    if (tokenContent.activationCode !== activationCode) {
      return next(createError(400, "Invalid activation code"));
    }

    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return next(createError(400, "A user with this email already exists"));
    }

    const newUser = new User({
      name: tokenContent.user.name,
      email: tokenContent.user.email,
      password: tokenContent.user.password,
      avatar: tokenContent.user.avatar || "",
    });

    await newUser.save();

    res.status(200).json(newUser);
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return next(createError(400, "Email not registered"));
    }

    const passwordMatches = bcrypt.compareSync(password, user.password);

    if (!passwordMatches) {
      return next(createError(400, "Password doesn't match"));
    }

    const accessToken = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.ACCESS_TOKEN_JWT_SECRET_KEY,
      { expiresIn: "5m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.REFRESH_TOKEN_JWT_SECRET_KEY,
      { expiresIn: "3d" }
    );

    // update redis by adding session

    await client.set(user._id, JSON.stringify(user));

    res
      .cookie("access_token", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        expires: new Date(Date.now() + 5 * 60 * 60 * 1000),
        maxAge: 5 * 60 * 60 * 1000,
      })
      .cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "lax",
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        maxAge: 3 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        sucess: true,
        accessToken,
      });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    // clear redis session that you set during login

    res
      .clearCookie("access_token")
      .clearCookie("refresh_token")
      .status(200)
      .json({
        success: true,
      });
  } catch (err) {
    next(err);
  }
};

export const updateToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return next(createError(400, "refresh token doesnt esist"));
    }
    let refreshTokenDecoded;
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_JWT_SECRET_KEY,
      (err, user) => {
        if (err) {
          return next(err);
        }
        refreshTokenDecoded = user;
      }
    );

    const redisUserData = await client.get(refreshTokenDecoded.id);

    if (!redisUserData) {
      return next(
        createError(
          400,
          "There must be some error as redis should have user data as we hit this endpoint only when we are already logged in, we already have a refresh token"
        )
      );
    }

    const user = JSON.parse(redisUserData);

    // now we will create new access and refresh token and send it back to the client

    const newAccessToken = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.ACCESS_TOKEN_JWT_SECRET_KEY,
      { expiresIn: "5m" }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      process.env.REFRESH_TOKEN_JWT_SECRET_KEY,
      { expiresIn: "3d" }
    );

    // we will get the user data from redis to create access and refresh token

    res
      .cookie("access_token", newAccessToken, {
        httpOnly: true,
        sameSite: "lax",
        expires: new Date(Date.now() + 5 * 60 * 60 * 1000),
        maxAge: 5 * 60 * 60 * 1000,
      })
      .cookie("refresh_token", newRefreshToken, {
        httpOnly: true,
        sameSite: "lax",
        expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        maxAge: 3 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        sucess: true,
        accessToken: newAccessToken,
      });
  } catch (err) {
    next(err);
  }
};
