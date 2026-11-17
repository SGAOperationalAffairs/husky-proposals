import { describe, expect, it } from "vitest";
import { peopleSelect } from "./peopleStore";

// Privacy (#129): the People query reads names and emails, so its select must stay an explicit
// list. A new field has to be added here on purpose, where a reviewer sees it.
describe("peopleSelect", () => {
  it("reads only the fields the People list shows", () => {
    expect(Object.keys(peopleSelect).sort()).toEqual(
      ["contactStatus", "contactedAt", "createdAt", "idea", "ideaId", "user", "userId"].sort(),
    );
    expect(Object.keys(peopleSelect.user.select).sort()).toEqual(["displayName", "email"]);
    expect(Object.keys(peopleSelect.idea.select).sort()).toEqual(["boardId", "number", "title"]);
  });
});
