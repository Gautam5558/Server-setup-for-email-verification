import jwt from "jsonwebtoken";

export const createActivatinToken = (user) => {
  const activationCode = Math.floor(Math.random() * 9000) + 1000;
  const token = jwt.sign(
    { user, activationCode },
    process.env.JWT_ACTIVATION_KEY,
    { expiresIn: "5m" }
  );
  return { activationCode: activationCode.toString(), token };
};
