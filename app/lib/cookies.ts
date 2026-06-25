import { createCookie } from "react-router";

const { AUTH_SECRET } = process.env;

if (typeof AUTH_SECRET !== "string") {
  throw new Error("Missing env: AUTH_SECRET")
}

export const sessionCookie = createCookie("fitizen_crm__session", {
  secrets: [AUTH_SECRET],
  httpOnly: true,
  secure: true,
});