import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

export class JwtTokenService {
  generateToken(
    payload: any,
    jwtSecret: string,
    options?: SignOptions
  ): string {
    return jwt.sign(payload, jwtSecret, options ?? { expiresIn: "12h" });
  }

  verifyToken(
    token: string,
    jwtSecret: string,
    options?: jwt.VerifyOptions
  ): string | JwtPayload | null {
    try {
      return jwt.verify(token, jwtSecret, options);
    } catch (error) {
      return null;
    }
  }

  decodeToken(token: string): string | JwtPayload | null {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }
}
