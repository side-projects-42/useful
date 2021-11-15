# JSON Parser 2

A streaming JSON parser written in pure JavaScript for the browser, Deno, Cloudflare Workers, etc.

This is a modernized version of https://github.com/creationix/jsonparse that replaces `Buffer` with `Uint8Array`/`TextEncoder`/`TextDecoder`, so that it can be used in the browser, Deno, Cloudflare Workers and other ECMAScript 6+ environments without polyfills.