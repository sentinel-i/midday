import { updateSession } from "@midday/supabase/middleware";
import { createClient } from "@midday/supabase/server";
import { createI18nMiddleware } from "next-international/middleware";
import { type NextRequest, NextResponse } from "next/server";

const I18nMiddleware = createI18nMiddleware({
  locales: ["en"],
  defaultLocale: "en",
  urlMappingStrategy: "rewrite",
});

export async function middleware(request: NextRequest) {
  try {
    const response = await updateSession(request, I18nMiddleware(request));
    const supabase = await createClient();
    const url = new URL("/", request.url);
    const nextUrl = request.nextUrl;

    const pathnameLocale = nextUrl.pathname.split("/", 2)?.[1];
    const pathnameWithoutLocale = pathnameLocale
      ? nextUrl.pathname.slice(pathnameLocale.length + 1)
      : nextUrl.pathname;
    const newUrl = new URL(pathnameWithoutLocale || "/", request.url);
    const encodedSearchParams = `${newUrl?.pathname?.substring(1)}${newUrl.search}`;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (
      !session &&
      newUrl.pathname !== "/login" &&
      !newUrl.pathname.includes("/i/") &&
      !newUrl.pathname.includes("/verify") &&
      !newUrl.pathname.includes("/all-done") &&
      !newUrl.pathname.includes("/desktop/search")
    ) {
      const loginUrl = new URL("/login", request.url);
      if (encodedSearchParams) {
        loginUrl.searchParams.append("return_to", encodedSearchParams);
      }
      return NextResponse.redirect(loginUrl);
    }

    if (session) {
      if (newUrl.pathname !== "/teams/create" && newUrl.pathname !== "/teams") {
        const inviteCodeMatch = newUrl.pathname.startsWith("/teams/invite/");
        if (inviteCodeMatch) {
          return NextResponse.redirect(`${url.origin}${request.nextUrl.pathname}`);
        }
      }

      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (
        mfaData &&
        mfaData.nextLevel === "aal2" &&
        mfaData.nextLevel !== mfaData.currentLevel &&
        newUrl.pathname !== "/mfa/verify"
      ) {
        const mfaUrl = new URL("/mfa/verify", request.url);
        if (encodedSearchParams) {
          mfaUrl.searchParams.append("return_to", encodedSearchParams);
        }
        return NextResponse.redirect(mfaUrl);
      }
    }

    return response;
  } catch (err) {
    console.error("Middleware error:", err);
    return NextResponse.next(); // fallback : on continue la requête même si erreur
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
