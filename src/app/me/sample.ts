// Sample rows for the My ideas page, until the student's queries (#97) land.
// Invented ideas and a made-up student's activity; no real data.
import type { MyRow } from "./groups";

export function sampleMyRows(): MyRow[] {
  return [
    {
      number: 201,
      title: "Longer hours at the Marino dining hall on Sundays",
      board: "DAB",
      status: null,
      review: "pending",
      posted: true,
      supported: false,
      participated: false,
      submittedAt: 5,
    },
    {
      number: 202,
      title: "Bike repair stand by the garage",
      board: "GIB",
      status: null,
      review: "declined",
      posted: true,
      supported: false,
      participated: false,
      submittedAt: 4,
      declineReason: "This is already in progress with Campus Services. Support the existing idea instead.",
    },
    {
      number: 203,
      title: "Reusable to-go containers at every dining hall",
      board: "GIB",
      status: "collecting_support",
      review: "approved",
      posted: true,
      supported: true,
      participated: false,
      submittedAt: 3,
    },
    {
      number: 204,
      title: "A late shuttle on Friday nights",
      board: "CSC",
      status: "in_progress",
      review: "approved",
      posted: false,
      supported: true,
      participated: true,
      submittedAt: 2,
    },
    {
      number: 205,
      title: "Compost bins outside residence halls",
      board: "SC",
      status: "under_review",
      review: "approved",
      posted: false,
      supported: false,
      participated: true,
      submittedAt: 1,
    },
  ];
}
