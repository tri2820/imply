import { id } from "@instantdb/admin";
import type { APIEvent } from "@solidjs/start/server";
import { SignJWT } from "jose";

import {
  createAdminDb,
  getCookie,
  setCookie,
  sign,
  verifyJWT,
} from "~/server/utils";

import { JWTResult } from "~/utils";

export async function GET(event: APIEvent) {
  console.log('here')
  const profile_jwt = getCookie("profile_jwt");

  if (profile_jwt) {
    try {
      const payload = await verifyJWT(profile_jwt);
      return new Response(
        JSON.stringify({
          type: "existing",
          profile_id: payload.profile_id,
        } as JWTResult),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        }
      );
    } catch (e) {
      console.log("JWT is invalid", e);
      setCookie("profile_jwt", "", { sameSite: "strict" });
      // Move forward to generate a new JWT
    }
  }

  const db = createAdminDb();

  const profile_id = id();
  const balance_id = id();
  console.log("creating profile...", profile_id, balance_id);
  try {
    await db.transact([
      db.tx.profiles[profile_id].update({
        avatar_src: "",
        name: "Guest",
        usd: 1000,
      }),
    ]);
  } catch (e) {
    console.error(JSON.stringify(e));
    return new Response(null, { status: 500 });
  }

  // I hereby allow whoever has this key to access holdings on this profile
  console.log("generating jwt...");
  const jwt = await sign(
    new SignJWT({
      sub: `guest-${profile_id}`,
      profile_id,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
  );

  console.log("set cookie...");
  // console.log("set JWT:", jwt);
  // Set a new cookie (e.g., set a new profile key)
  setCookie("profile_jwt", jwt, {
    // maxAge: 60 * 60 * 24 * 7, // Expires in 7 days
    secure: true,
    httpOnly: true,
    sameSite: "strict",
  });

  console.log("DONE!");
  return new Response(
    JSON.stringify({
      type: "new",
      profile_id,
    } as JWTResult),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
}
