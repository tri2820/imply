import { jwtVerify as jose_jwtVerify, SignJWT } from "jose";
import { getRequestEvent } from "solid-js/web";


import { init } from "@instantdb/admin";
import {
  getCookie as vinxi_getCookie,
  setCookie as vinxi_setCookie,
} from "vinxi/http";
import schema from "~/../instant.schema";

export function getEnv(key: string) {
  const event = getRequestEvent();
  return event?.nativeEvent.context.cloudflare?.env[key] ?? process.env[key];
}

export function createAdminDb() {
  const INSTANT_APP_ADMIN_TOKEN = getEnv("INSTANT_APP_ADMIN_TOKEN");
  const db = init({
    appId: import.meta.env.VITE_INSTANTDB_APP_ID,
    adminToken: INSTANT_APP_ADMIN_TOKEN,
    schema,
  });
  return db;
}
export function getCookie(key: string) {
  const event = getRequestEvent();
  if (!event) throw new Error("No event!");
  const value = vinxi_getCookie(event.nativeEvent, key);
  return value;
}

export function setCookie(key: string, value: string, options?: any) {
  const event = getRequestEvent();
  if (!event) throw new Error("No event!");
  vinxi_setCookie(event.nativeEvent, key, value, {
    secure: true,
    httpOnly: true,
    sameSite: "strict",
    ...options,
  });
}

export async function verifyJWT(profile_jwt: string) {
  const JWT_SECRET_KEY = getEnv("JWT_SECRET_KEY");
  const secret = new TextEncoder().encode(JWT_SECRET_KEY);

  const { payload } = await jose_jwtVerify(profile_jwt, secret);
  return payload;
}

export async function sign(jwtObject: SignJWT) {
  const JWT_SECRET_KEY = getEnv("JWT_SECRET_KEY");
  const secret = new TextEncoder().encode(JWT_SECRET_KEY);
  return jwtObject.sign(secret);
}

