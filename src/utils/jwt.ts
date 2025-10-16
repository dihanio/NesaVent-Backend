import jwt, { SignOptions } from 'jsonwebtoken';
import config from '../config';
import { IUser } from '../models/User';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export const generateAccessToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
    issuer: 'nesavent-api',
    audience: 'nesavent-client',
  } as any);
};

export const generateRefreshToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'nesavent-api',
    audience: 'nesavent-client',
  } as any);
};

export const generateTokenPair = (user: IUser): TokenPair => {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwt.accessSecret, {
      issuer: 'nesavent-api',
      audience: 'nesavent-client',
    }) as TokenPayload;
  } catch (error) {
    throw new Error('Token akses tidak valid atau sudah kedaluwarsa');
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.jwt.refreshSecret, {
      issuer: 'nesavent-api',
      audience: 'nesavent-client',
    }) as TokenPayload;
  } catch (error) {
    throw new Error('Token refresh tidak valid atau sudah kedaluwarsa');
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    return null;
  }
};
