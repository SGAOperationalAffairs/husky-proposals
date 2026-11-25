import type { EditPostData } from "./present";

// One invented declined post for the edit page when there is no database (#128), so a
// local run can open it from My ideas. It matches My ideas row 202 (bike repair stand).
// Invented: no real student or data.
export const SAMPLE_OWN_POST: EditPostData = {
  ideaId: "6f9c0f5e-2b1d-4a63-9a53-0d3f9b2f1c10",
  board: "GIB",
  number: null,
  reviewStatus: "declined",
  reason: "This is already in progress with Campus Services. Support the existing idea instead.",
  sentBack: false,
  edit: null,
  values: {
    title: "Bike repair stand by the garage",
    summary: "A stand with a pump and basic tools, so a flat tire does not end the ride.",
    details:
      "Flat tires end rides, and the nearest bike shop is a long walk from the garage. A repair stand with a pump and a few basic tools would let students fix a flat in a few minutes.",
    category: "green_initiatives",
    location: "Near the parking garage",
    scale: "small",
    costBand: "under_1k",
    timeHorizon: "",
    anonymous: false,
  },
};
