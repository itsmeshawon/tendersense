import { describe, expect, it } from "vitest";
import { config, middleware } from "./middleware";

describe("middleware module", () => {
  it("exports an async middleware function", () => {
    expect(typeof middleware).toBe("function");
    expect(middleware.constructor.name).toBe("AsyncFunction");
  });

  it("has a matcher that skips static assets", () => {
    expect(config.matcher).toBeDefined();
    const matcher = Array.isArray(config.matcher)
      ? config.matcher[0]
      : config.matcher;
    expect(matcher).toContain("_next/static");
  });
});
