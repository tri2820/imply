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

export async function GET(event: APIEvent) {
  const profile_jwt = getCookie("profile_jwt");
  const db = createAdminDb();

  if (profile_jwt) {
    try {
      const payload = await verifyJWT(profile_jwt);

      const resp = await db.query({
        profiles: {
          $: {
            where: {
              id: payload.profile_id as string,
            },
          },
        },
      });

      const profile = resp.profiles.at(0);
      if (profile) {
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
      } else {
        console.warn("Profile not found", payload.profile_id);
        // Proceed to create a new profile
      }
    } catch (e) {
      console.log("JWT is invalid", e);
      setCookie("profile_jwt", "", { sameSite: "strict" });
      // Move forward to generate a new JWT
    }
  }

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
