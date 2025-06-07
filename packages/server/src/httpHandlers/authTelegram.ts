import { createPostHandler, response } from "../httpRouteHandlers";
import { withSchemaValidation } from "../middlewares";
import { Router } from "express";
import { UsersService } from "../services/user";

type AuthTelegramPath = { token: string };

export type AuthTelegramResponse = { success: true } | { error: string };

export function registerAuthTelegramRoute(router: Router, usersService: UsersService) {
  createPostHandler(router, "/auth/telegram/:token")
    .use(withSchemaValidation<AuthTelegramPath, {}>())
    .handle(async ({ token }, _data, { res }) => {
      const user = await usersService.consumeTelegramAuthToken(token);
      if (!user) {
        return response(400, { error: "Invalid or expired token" });
      }
      const sessionId = await usersService.createSession(user.id);
      res.cookie("session", sessionId, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
      });
      return response(200, { success: true });
    });
}
